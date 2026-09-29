import cv2
import numpy as np
from typing import Tuple, List, Dict, Any, Optional
from .schemas import QualityAssessment, PatchMeasurement

def assess_image_quality(
    processed_bgr: np.ndarray,
    card_detected: bool,
    card_patches: List[PatchMeasurement]
) -> QualityAssessment:
    """
    Computes real optical image quality metrics using actual OpenCV operations:
    - Sharpness via Laplacian variance
    - Dynamic range and exposure balance
    - Lighting uniformity
    - Glare / specular regions
    - SNR from detected neutral patch
    """
    h, w = processed_bgr.shape[:2]
    gray = cv2.cvtColor(processed_bgr, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(processed_bgr, cv2.COLOR_BGR2HSV)

    # 1. Spatial Sharpness using discrete 2D Laplacian operator variance
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    lap_var = float(lap.var())
    # Normalizing Laplacian variance to 0-100 optical scale
    sharpness_score = float(np.clip(round(math_sqrt(lap_var) * 2.8, 1), 10.0, 100.0))
    blur_score = round(100.0 - sharpness_score, 1)

    # 2. Dynamic range & Clipping
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
    total_pixels = float(w * h)
    dark_clipped_pct = float(round((np.sum(hist[:12]) / total_pixels) * 100.0, 2))
    bright_clipped_pct = float(round((np.sum(hist[244:]) / total_pixels) * 100.0, 2))

    min_val, max_val, _, _ = cv2.minMaxLoc(gray)
    dyn_range = float(round((max_val - min_val) / 25.5, 2))

    # Mean luminance and exposure score
    mean_luma = float(np.mean(gray))
    clip_penalty = (dark_clipped_pct + bright_clipped_pct) * 1.5
    luma_deviation = abs(mean_luma - 128.0) * 0.35
    exposure_score = float(np.clip(round(100.0 - clip_penalty - luma_deviation, 1), 10.0, 100.0))

    # 3. Illumination Uniformity (4 quadrants)
    hw, hh = w // 2, h // 2
    quad_means = [
        float(np.mean(gray[:hh, :hw])),
        float(np.mean(gray[:hh, hw:])),
        float(np.mean(gray[hh:, :hw])),
        float(np.mean(gray[hh:, hw:])),
    ]
    spread = max(quad_means) - min(quad_means)
    uniformity_score = float(np.clip(round(100.0 - spread * 0.9, 1), 15.0, 100.0))

    # 4. Glare / Specular highlight detection
    # Pixels with very high value (> 248) and low saturation (< 25)
    val = hsv[:, :, 2]
    sat = hsv[:, :, 1]
    glare_mask = cv2.bitwise_and((val > 248).astype(np.uint8) * 255, (sat < 25).astype(np.uint8) * 255)
    glare_pixels = int(cv2.countNonZero(glare_mask))
    glare_pct = float(round((glare_pixels / total_pixels) * 100.0, 2))
    glare_detected = glare_pct > 0.85

    # 5. Signal-to-Noise Ratio (SNR) in dB
    # Calculated strictly from detected neutral grey/white card patch
    snr_db = None
    if card_detected and card_patches:
        neutral_patch = next((p for p in card_patches if p.matched and ("grey" in p.name.lower() or "white" in p.name.lower())), None)
        if neutral_patch is not None and neutral_patch.bbox is not None:
            bx = int(neutral_patch.bbox.x)
            by = int(neutral_patch.bbox.y)
            bw = int(neutral_patch.bbox.width)
            bh = int(neutral_patch.bbox.height)
            if bw > 4 and bh > 4 and bx >= 0 and by >= 0 and bx + bw <= w and by + bh <= h:
                patch_gray = gray[by : by + bh, bx : bx + bw]
                p_mean = float(np.mean(patch_gray))
                p_std = float(np.std(patch_gray))
                if p_std > 0.3:
                    snr_val = 20.0 * np.log10(p_mean / p_std)
                    snr_db = float(round(snr_val, 1))

    # Overall optical quality grading
    composite = 0.35 * sharpness_score + 0.35 * uniformity_score + 0.30 * exposure_score
    if not card_detected or composite < 40.0:
        status = "UNSUITABLE"
    elif composite < 60.0:
        status = "DEGRADED"
    elif composite >= 80.0 and card_detected:
        status = "OPTIMAL"
    else:
        status = "ACCEPTABLE"

    return QualityAssessment(
        status=status,
        sharpness=sharpness_score,
        blur_score=blur_score,
        exposure_balance=exposure_score,
        dynamic_range=dyn_range,
        lighting_uniformity=uniformity_score,
        glare_fraction=glare_pct,
        glare_detected=glare_detected,
        dark_clipping=dark_clipped_pct,
        bright_clipping=bright_clipped_pct,
        snr_db=snr_db,
    )

def math_sqrt(val: float) -> float:
    return float(np.sqrt(max(0.0, val)))
