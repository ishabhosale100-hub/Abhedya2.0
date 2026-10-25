/**
 * ABHEDYA Cryptographic & Steganographic Utilities
 * Browser-side Web Crypto SHA-256 and Spatial LSB Reversible Invisible Watermarking.
 */

// Calculate SHA-256 hex digest of a Blob or ArrayBuffer
export async function calculateSha256(data) {
  let arrayBuffer;
  if (data instanceof Blob || data instanceof File) {
    arrayBuffer = await data.arrayBuffer();
  } else if (data instanceof ArrayBuffer) {
    arrayBuffer = data;
  } else if (data instanceof Uint8Array) {
    arrayBuffer = data.buffer;
  } else {
    throw new Error('Unsupported data format for SHA-256 calculation');
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Spatial LSB Invisible Watermarking
 * Embeds magic marker "ABH:" + 2-byte length + payload string into LSB of blue channel.
 */
const MAGIC = 'ABH:';

export function embedInvisibleWatermark(imageData, payloadText) {
  if (!payloadText || typeof payloadText !== 'string') return imageData;

  const data = imageData.data; // RGBA array
  const fullText = MAGIC + payloadText;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(fullText);

  // Check capacity: each byte requires 8 pixels (1 bit per pixel in blue channel data[i+2])
  const requiredPixels = bytes.length * 8;
  const totalPixels = data.length / 4;

  if (requiredPixels > totalPixels) {
    throw new Error(`Payload too large for image capacity (${requiredPixels} pixels needed, ${totalPixels} available).`);
  }

  let bitIndex = 0;
  for (let b = 0; b < bytes.length; b++) {
    const byteVal = bytes[b];
    for (let bit = 7; bit >= 0; bit--) {
      const bitVal = (byteVal >> bit) & 1;
      const pixelOffset = bitIndex * 4;
      // Modify least significant bit of Blue channel (index + 2)
      data[pixelOffset + 2] = (data[pixelOffset + 2] & 0xFE) | bitVal;
      bitIndex++;
    }
  }

  return imageData;
}

export function extractInvisibleWatermark(imageData) {
  const data = imageData.data;
  const totalPixels = data.length / 4;
  const maxBytesToRead = Math.min(256, Math.floor(totalPixels / 8));

  const extractedBytes = new Uint8Array(maxBytesToRead);
  let bitIndex = 0;

  for (let b = 0; b < maxBytesToRead; b++) {
    let byteVal = 0;
    for (let bit = 7; bit >= 0; bit--) {
      const pixelOffset = bitIndex * 4;
      const bitVal = data[pixelOffset + 2] & 1;
      byteVal = (byteVal << 1) | bitVal;
      bitIndex++;
    }
    extractedBytes[b] = byteVal;
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawString = decoder.decode(extractedBytes);

  if (rawString.startsWith(MAGIC)) {
    // Strip magic and trailing null/garbage chars
    const payloadPart = rawString.substring(MAGIC.length);
    // Find first non-printable or null terminator
    let clean = '';
    for (let i = 0; i < payloadPart.length; i++) {
      const code = payloadPart.charCodeAt(i);
      if (code >= 32 && code <= 126) {
        clean += payloadPart[i];
      } else {
        break;
      }
    }
    return {
      found: true,
      payload: clean,
      verified: true,
    };
  }

  return {
    found: false,
    payload: null,
    verified: false,
  };
}
