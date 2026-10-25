import io
import base64
import hashlib
import numpy as np
import cv2
from PIL import Image
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from skimage.metrics import structural_similarity as ssim

router = APIRouter(prefix="/api/comparison", tags=["Photo Comparison"])

MAX_FILE_SIZE = 10 * 1024 * 1024 # 10 MB
ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

def calculate_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def array_to_base64_png(img_bgr: np.ndarray) -> str:
    success, encoded_img = cv2.imencode('.png', img_bgr)
    if not success:
        raise ValueError("Failed to encode image to PNG")
    b64_str = base64.b64encode(encoded_img.tobytes()).decode('utf-8')
    return f"data:image/png;base64,{b64_str}"

@router.post("/analyze")
async def analyze_comparison(
    original: UploadFile = File(...),
    suspected: UploadFile = File(...)
) -> Dict[str, Any]:
    # 1. Read files into memory
    orig_bytes = await original.read()
    susp_bytes = await suspected.read()

    # Size validations
    if len(orig_bytes) > MAX_FILE_SIZE or len(susp_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="One or both files exceed the 10 MB size limit.")

    # Calculate SHA-256 digests
    orig_hash = calculate_hash(orig_bytes)
    susp_hash = calculate_hash(susp_bytes)

    # Decode images into OpenCV BGR arrays
    orig_np = np.frombuffer(orig_bytes, np.uint8)
    susp_np = np.frombuffer(susp_bytes, np.uint8)

    img_orig_raw = cv2.imdecode(orig_np, cv2.IMREAD_COLOR)
    img_susp_raw = cv2.imdecode(susp_np, cv2.IMREAD_COLOR)

    if img_orig_raw is None or img_susp_raw is None:
        raise HTTPException(status_code=400, detail="Invalid image data. Could not decode one or both files.")

    orig_h, orig_w = img_orig_raw.shape[:2]
    susp_h, susp_w = img_susp_raw.shape[:2]

    # Exact cryptographic file identity check
    if orig_hash == susp_hash:
        # Encode suspected image for preview
        preview_base64 = array_to_base64_png(img_susp_raw)
        return {
            "is_identical": True,
            "original_hash": orig_hash,
            "suspected_hash": susp_hash,
            "original_dimensions": {"width": orig_w, "height": orig_h},
            "suspected_dimensions": {"width": susp_w, "height": susp_h},
            "pixel_diff_percent": 0.0,
            "ssim_score": 1.0,
            "detected_regions_count": 0,
            "heatmap_base64": preview_base64,
            "overlay_base64": preview_base64,
            "mask_base64": preview_base64,
            "interpretation": "Exact Cryptographic Match: The two files share identical SHA-256 fingerprints and 0% pixel difference.",
            "regions_detail": "No deviations found between the two files."
        }

    # Normalize dimensions for fair pixel-wise comparison
    # Match the suspected image dimensions or use max dimension normalized up to 1024
    target_w = max(min(susp_w, 1200), 256)
    target_h = max(min(susp_h, 1200), 256)

    img_orig_norm = cv2.resize(img_orig_raw, (target_w, target_h), interpolation=cv2.INTER_AREA)
    img_susp_norm = cv2.resize(img_susp_raw, (target_w, target_h), interpolation=cv2.INTER_AREA)

    # Convert to grayscale for SSIM and difference masking
    gray_orig = cv2.cvtColor(img_orig_norm, cv2.COLOR_BGR2GRAY)
    gray_susp = cv2.cvtColor(img_susp_norm, cv2.COLOR_BGR2GRAY)

    # 1. Structural Similarity Index (SSIM)
    score, diff_ssim = ssim(gray_orig, gray_susp, full=True)
    ssim_metric = round(float(score), 4)

    # 2. Pixel-wise absolute difference
    abs_diff = cv2.absdiff(img_orig_norm, img_susp_norm)
    diff_gray = cv2.cvtColor(abs_diff, cv2.COLOR_BGR2GRAY)

    # Calculate percentage of pixels that changed significantly (threshold > 25)
    total_pixels = target_w * target_h
    changed_pixels = np.count_nonzero(diff_gray > 25)
    pixel_diff_percent = round((changed_pixels / total_pixels) * 100.0, 2)

    # 3. Difference Heatmap
    # Normalize grayscale difference to 0-255
    norm_diff = cv2.normalize(diff_gray, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)
    heatmap = cv2.applyColorMap(norm_diff, cv2.COLORMAP_JET)

    # 4. Threshold mask & Contours with Bounding Boxes
    _, thresh_mask = cv2.threshold(diff_gray, 30, 255, cv2.THRESH_BINARY)
    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    thresh_clean = cv2.morphologyEx(thresh_mask, cv2.MORPH_CLOSE, kernel)

    # Contours of changed regions
    contours, _ = cv2.findContours(thresh_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    significant_contours = [c for c in contours if cv2.contourArea(c) > 120]
    regions_count = len(significant_contours)

    # 5. Red Overlay on Suspected Image
    overlay_img = img_susp_norm.copy()
    red_color = (0, 0, 255) # BGR Red

    # Apply red tint where threshold > 0
    mask_indices = thresh_clean > 0
    overlay_img[mask_indices] = (
        overlay_img[mask_indices].astype(float) * 0.4 + np.array([0, 0, 255], dtype=float) * 0.6
    ).astype(np.uint8)

    # Draw bounding boxes around significant difference clusters
    for cnt in significant_contours:
        x, y, w, h = cv2.boundingRect(cnt)
        cv2.rectangle(overlay_img, (x, y), (x + w, y + h), (0, 0, 255), 2)

    # Generate Base64 outputs for visualization
    heatmap_b64 = array_to_base64_png(heatmap)
    overlay_b64 = array_to_base64_png(overlay_img)
    mask_b64 = array_to_base64_png(cv2.cvtColor(thresh_clean, cv2.COLOR_GRAY2BGR))

    interpretation = (
        f"Measured {pixel_diff_percent}% pixel deviation across normalized comparison grids. "
        f"Structural Similarity Index is {ssim_metric} (1.0 = identical). "
        f"{regions_count} distinct differing region cluster(s) localized."
    )

    return {
        "is_identical": False,
        "original_hash": orig_hash,
        "suspected_hash": susp_hash,
        "original_dimensions": {"width": orig_w, "height": orig_h},
        "suspected_dimensions": {"width": susp_w, "height": susp_h},
        "pixel_diff_percent": pixel_diff_percent,
        "ssim_score": ssim_metric,
        "detected_regions_count": regions_count,
        "heatmap_base64": heatmap_b64,
        "overlay_base64": overlay_b64,
        "mask_base64": mask_b64,
        "interpretation": interpretation,
        "regions_detail": f"Highlighted red regions indicate coordinates where pixel values differ from the supplied reference. Pixel differences alone do not prove malicious tampering, morphing, or AI generation."
    }
