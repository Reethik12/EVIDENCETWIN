import base64
import io
import re
from typing import Tuple, Dict, Any, Optional
import numpy as np
import cv2
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

def load_image_from_input(image_input: Any) -> np.ndarray:
    """
    Decodes an image from a Data URI, base64 string, byte string, or numpy ndarray.
    Returns: BGR numpy ndarray
    """
    if isinstance(image_input, np.ndarray):
        return image_input.copy()

    if not image_input or not isinstance(image_input, str):
        raise ValueError("Empty or invalid image input")

    clean_str = image_input.strip()

    # Strip Data URI header if present
    if clean_str.startswith("data:"):
        match = re.search(r"base64,(.*)$", clean_str, re.DOTALL)
        if match:
            clean_str = match.group(1)
        else:
            raise ValueError("Malformed Data URI: base64 marker not found")

    try:
        raw_bytes = base64.b64decode(clean_str)
    except Exception as e:
        raise ValueError(f"Failed to base64 decode image payload: {e}")

    # Use cv2.imdecode
    np_arr = np.frombuffer(raw_bytes, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img_bgr is None:
        if HAS_PIL:
            try:
                pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
                img_rgb = np.array(pil_img)
                img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
            except Exception as e:
                raise ValueError(f"OpenCV and PIL failed to decode image buffer: {e}")
        else:
            raise ValueError("OpenCV failed to decode image buffer")

    return img_bgr

class PreprocessedEvidence:
    def __init__(self, original_bgr: np.ndarray, max_dim: int = 1200):
        self.original_bgr = original_bgr  # NEVER mutated
        self.orig_h, self.orig_w = original_bgr.shape[:2]

        # Resolution normalization
        scale = min(1.0, max_dim / max(self.orig_h, self.orig_w))
        self.scale = scale
        self.inv_scale = 1.0 / scale if scale > 0 else 1.0

        if scale < 1.0:
            target_w = int(round(self.orig_w * scale))
            target_h = int(round(self.orig_h * scale))
            self.processed_bgr = cv2.resize(original_bgr, (target_w, target_h), interpolation=cv2.INTER_AREA)
        else:
            self.processed_bgr = original_bgr.copy()

        self.proc_h, self.proc_w = self.processed_bgr.shape[:2]

        # Color Space Representations
        self.rgb = cv2.cvtColor(self.processed_bgr, cv2.COLOR_BGR2RGB)
        self.gray = cv2.cvtColor(self.processed_bgr, cv2.COLOR_BGR2GRAY)
        self.hsv = cv2.cvtColor(self.processed_bgr, cv2.COLOR_BGR2HSV)
        self.lab = cv2.cvtColor(self.processed_bgr, cv2.COLOR_BGR2LAB)

        # Mild denoising while preserving patch boundaries
        self.denoised_gray = cv2.bilateralFilter(self.gray, d=5, sigmaColor=35, sigmaSpace=35)

        # CLAHE (Contrast-Limited Adaptive Histogram Equalization) for edge/contour candidate detection
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        self.clahe_gray = clahe.apply(self.denoised_gray)

def encode_image_to_base64(img_bgr: np.ndarray, format_ext: str = ".jpg", quality: int = 90) -> str:
    """Encodes BGR numpy ndarray into a base64 Data URI."""
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality] if format_ext == ".jpg" else []
    success, buffer = cv2.imencode(format_ext, img_bgr, encode_params)
    if not success:
        return ""
    b64_str = base64.b64encode(buffer).decode("utf-8")
    mime = "image/jpeg" if format_ext in [".jpg", ".jpeg"] else "image/png"
    return f"data:{mime};base64,{b64_str}"
