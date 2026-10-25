"""
Automated Backend Workflow Test Suite for ABHEDYA
Tests Photo Comparison, Comment Safety, and Casting Shield endpoints against required conditions.
"""

import io
import urllib.request
import json
import numpy as np
import cv2
from PIL import Image, ImageDraw

def create_test_image(text="TEST", color=(100, 150, 200), width=300, height=300):
    img = Image.new('RGB', (width, height), color=color)
    draw = ImageDraw.Draw(img)
    draw.text((30, 140), text, fill=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

def multipart_post(url, fields, files):
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = bytearray()

    for k, v in fields.items():
        body.extend(f'--{boundary}\r\n'.encode('utf-8'))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode('utf-8'))
        body.extend(f'{v}\r\n'.encode('utf-8'))

    for k, (filename, content, content_type) in files.items():
        body.extend(f'--{boundary}\r\n'.encode('utf-8'))
        body.extend(f'Content-Disposition: form-data; name="{k}"; filename="{filename}"\r\n'.encode('utf-8'))
        body.extend(f'Content-Type: {content_type}\r\n\r\n'.encode('utf-8'))
        body.extend(content)
        body.extend(b'\r\n')

    body.extend(f'--{boundary}--\r\n'.encode('utf-8'))

    req = urllib.request.Request(url, data=bytes(body), headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}'
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def json_post(url, data):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def test_all():
    print("==================================================")
    print("STARTING ABHEDYA BACKEND AUTOMATED TESTS")
    print("==================================================")

    # 1. Health check
    print("\n--- 1. Testing Health Endpoint ---")
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as r:
        health = json.loads(r.read().decode())
        assert health["status"] == "healthy"
        print("✓ Health check PASSED:", health)

    # 2. Photo Comparison: Exact Same File
    print("\n--- 2. Photo Comparison: Exact Same File ---")
    img_a = create_test_image("REFERENCE", (50, 100, 150))
    res_ident = multipart_post("http://127.0.0.1:8000/api/comparison/analyze", {}, {
        "original": ("ref.png", img_a, "image/png"),
        "suspected": ("ref_copy.png", img_a, "image/png"),
    })
    print("Identical test result:", {
        "is_identical": res_ident["is_identical"],
        "diff_percent": res_ident["pixel_diff_percent"],
        "ssim": res_ident["ssim_score"]
    })
    assert res_ident["is_identical"] is True
    assert res_ident["pixel_diff_percent"] == 0.0
    assert res_ident["ssim_score"] == 1.0
    print("✓ Exact same file test PASSED.")

    # 3. Photo Comparison: Known Region Change
    print("\n--- 3. Photo Comparison: Known Region Change ---")
    # Base image
    img_b_base = Image.new('RGB', (300, 300), color=(100, 120, 140))
    # Altered copy with red patch
    img_b_altered = img_b_base.copy()
    draw = ImageDraw.Draw(img_b_altered)
    draw.rectangle([100, 100, 180, 180], fill=(255, 0, 0))

    buf_base = io.BytesIO(); img_b_base.save(buf_base, 'PNG')
    buf_alt = io.BytesIO(); img_b_altered.save(buf_alt, 'PNG')

    res_tamper = multipart_post("http://127.0.0.1:8000/api/comparison/analyze", {}, {
        "original": ("base.png", buf_base.getvalue(), "image/png"),
        "suspected": ("altered.png", buf_alt.getvalue(), "image/png"),
    })
    print("Tamper test result:", {
        "is_identical": res_tamper["is_identical"],
        "diff_percent": res_tamper["pixel_diff_percent"],
        "ssim": res_tamper["ssim_score"],
        "regions": res_tamper["detected_regions_count"]
    })
    assert res_tamper["is_identical"] is False
    assert res_tamper["pixel_diff_percent"] > 0.0
    assert res_tamper["ssim_score"] < 1.0
    assert res_tamper["detected_regions_count"] >= 1
    assert "Pixel differences alone do not prove malicious" in res_tamper["regions_detail"]
    print("✓ Known region change test PASSED with honest disclaimer verification.")

    # 4. Photo Comparison: Substantially Different Images
    print("\n--- 4. Photo Comparison: Substantially Different Images ---")
    img_c1 = create_test_image("BLACK", (0, 0, 0))
    img_c2 = create_test_image("WHITE", (255, 255, 255))
    res_diff = multipart_post("http://127.0.0.1:8000/api/comparison/analyze", {}, {
        "original": ("black.png", img_c1, "image/png"),
        "suspected": ("white.png", img_c2, "image/png"),
    })
    print("Different images result:", {
        "diff_percent": res_diff["pixel_diff_percent"],
        "ssim": res_diff["ssim_score"]
    })
    assert res_diff["pixel_diff_percent"] > 70.0
    assert res_diff["ssim_score"] < 0.2
    print("✓ Substantially different images test PASSED.")

    # 5. Comment Safety: Normal comment
    print("\n--- 5. Comment Safety: Normal comment ---")
    comm_safe = json_post("http://127.0.0.1:8000/api/comments/analyze", {
        "text": "Great work on the latest acting scene, really enjoyed your expressions!"
    })
    print("Safe comment result:", comm_safe)
    assert comm_safe["category"] == "safe"
    assert comm_safe["risk_level"] == "low"
    print("✓ Safe comment test PASSED.")

    # 6. Comment Safety: Threat comment
    print("\n--- 6. Comment Safety: Threat comment ---")
    comm_threat = json_post("http://127.0.0.1:8000/api/comments/analyze", {
        "text": "I will hunt down and kill you if you ever post here again."
    })
    print("Threat comment result:", comm_threat)
    assert comm_threat["category"] == "threat"
    assert comm_threat["risk_level"] == "critical"
    print("✓ Threat comment test PASSED.")

    # 7. Comment Safety: PII exposure comment
    print("\n--- 7. Comment Safety: PII exposure comment ---")
    comm_pii = json_post("http://127.0.0.1:8000/api/comments/analyze", {
        "text": "Here is her personal WhatsApp number and flat address: 9820123456 call her now!"
    })
    print("PII comment result:", comm_pii)
    assert comm_pii["category"] == "pii"
    assert comm_pii["risk_level"] in ["high", "critical"]
    print("✓ PII comment test PASSED.")

    # 8. Casting Shield: Professional message
    print("\n--- 8. Casting Shield: Professional message ---")
    cast_prof = json_post("http://127.0.0.1:8000/api/casting/analyze", {
        "message": "Audition for character Priya: Please prepare a 2-minute monologue from the attached script. Venue: Studio 4, Versova, Mumbai at 11 AM."
    })
    print("Professional audition result:", cast_prof)
    assert cast_prof["risk_level"] == "low"
    print("✓ Professional audition test PASSED.")

    # 9. Casting Shield: Red flags (Coercion + Secrecy + Fees)
    print("\n--- 9. Casting Shield: Red flag message ---")
    cast_red = json_post("http://127.0.0.1:8000/api/casting/analyze", {
        "message": "Keep this secret, don't tell anyone. Send 5 photos in lingerie and transfer 10,000 INR registration fee right now to guarantee your lead role."
    })
    print("Red flag casting result:", cast_red)
    assert cast_red["risk_level"] in ["high", "critical"]
    assert len(cast_red["matched_phrases"]) >= 2
    print("✓ Red flag casting test PASSED.")

    # 10. Casting Shield: Ambiguous short text
    print("\n--- 10. Casting Shield: Ambiguous short text ---")
    cast_short = json_post("http://127.0.0.1:8000/api/casting/analyze", {
        "message": "Hey there"
    })
    print("Short ambiguous result:", cast_short)
    assert cast_short["risk_level"] == "unclear"
    print("✓ Ambiguous short text test PASSED.")

    print("\n==================================================")
    print("ALL 10 AUTOMATED BACKEND TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_all()
