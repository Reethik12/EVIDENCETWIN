import cv2
import numpy as np
import math
from typing import Tuple, List, Dict, Any, Optional
from .schemas import ReactionROIResult, BoundingBox
from .calibration import apply_calibration_to_rgb
from .patch_detector import rgb_to_hex, rgb_to_lab
from .ciede2000 import calculate_ciede2000

def classify_observed_color_name(lab: Tuple[float, float, float], rgb: Tuple[int, int, int]) -> str:
    """
    Derives an explainable observed colour name from the calibrated CIE L*a*b* coordinates.
    Never relies on drug classification models or static strings.
    """
    L, a, b_val = lab
    r, g, b = rgb

    # Chroma C* = sqrt(a*^2 + b*^2)
    chroma = math.sqrt(a * a + b_val * b_val)
    # Hue angle in degrees [0, 360)
    hue = math.degrees(math.atan2(b_val, a)) % 360.0

    if chroma < 7.0:
        if L > 85:
            return "Neutral White"
        elif L < 20:
            return "Deep Black"
        elif L > 55:
            return "Light Grey"
        else:
            return "Medium Grey"

    # Chromatic classification based on hue and lightness
    if 310 <= hue or hue < 25:
        # Magenta to Red-Pink corridor
        if a > 15 and b_val < 15:
            if L > 45:
                return "Pink-Magenta"
            else:
                return "Deep Magenta / Violet-Red"
        elif b_val > 15:
            return "Orange-Red"
        else:
            return "Crimson Red"
    elif 25 <= hue < 75:
        if L > 65:
            return "Pale Amber / Straw Yellow"
        else:
            return "Amber-Orange"
    elif 75 <= hue < 160:
        if L > 60:
            return "Yellow-Green"
        else:
            return "Forest Green"
    elif 160 <= hue < 250:
        if L > 60:
            return "Cyan / Aqua"
        else:
            return "Deep Blue"
    elif 250 <= hue < 310:
        if L > 55:
            return "Lavender / Light Violet"
        else:
            return "Deep Violet / Purple"

    return "Ambiguous Reaction Hue"

def detect_or_validate_reaction_roi(
    img_bgr: np.ndarray,
    card_corners: Optional[np.ndarray],
    manual_box: Optional[BoundingBox],
    calibration_matrix: List[List[float]],
    test_kit_corners: Optional[np.ndarray] = None,
    kit_id: Optional[str] = "kit-fentanyl-strip"
) -> ReactionROIResult:
    """
    True Free-Position Reaction ROI Detection:
    Discovers the reaction fluid region dynamically anywhere in the image.
    When a Test Kit is detected, searches within / relative to the detected test-kit object.
    Never relies on hardcoded left/right or fixed global screen coordinates.
    """
    h, w = img_bgr.shape[:2]
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # CASE 1: Operator provided manual ROI
    if manual_box is not None:
        is_norm = manual_box.width <= 100.0 and manual_box.height <= 100.0
        bx = int(round(manual_box.x / 100.0 * w if is_norm else manual_box.x))
        by = int(round(manual_box.y / 100.0 * h if is_norm else manual_box.y))
        bw = int(round(manual_box.width / 100.0 * w if is_norm else manual_box.width))
        bh = int(round(manual_box.height / 100.0 * h if is_norm else manual_box.height))

        bx = max(0, min(w - 10, bx))
        by = max(0, min(h - 10, by))
        bw = max(10, min(w - bx, bw))
        bh = max(10, min(h - by, bh))

        return extract_reaction_metrics(
            img_rgb, gray, bx, by, bw, bh, w, h, calibration_matrix, method="MANUAL", notes="Manual reaction region verified by operator."
        )

    # CASE 2: Dynamic Package-Guided Reaction Search (Reaction ROI MUST follow the detected test kit)
    if test_kit_corners is None or len(test_kit_corners) < 4:
        return ReactionROIResult(
            detected=False,
            confidence=None,
            bbox=None,
            polygon=None,
            method="AUTO",
            selection_notes="TEST_KIT_NOT_DETECTED: Reaction ROI cannot be localized without a validated field-test kit container."
        )

    # 1. Build search mask constrained strictly within the detected test-kit container
    search_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(search_mask, [np.int32(test_kit_corners)], 255)

    # Exclude confirmed reference card if present so they never overlap
    if card_corners is not None and len(card_corners) >= 4:
        cv2.fillPoly(search_mask, [np.int32(card_corners)], 0)

    # 2. Liquid reaction chromophore segmentation INSIDE detected test kit
    sat = img_hsv[:, :, 1]
    val = img_hsv[:, :, 2]
    hue_ch = img_hsv[:, :, 0]

    # Chemical reaction fluid produces vivid chromophore:
    # Pink/Magenta/Violet: hue [130-180] or [0-22] in OpenCV (260°-360° or 0°-44°)
    pink_magenta_mask = ((hue_ch >= 130) | (hue_ch <= 22)) & (sat > 28) & (val > 35) & (val < 248)
    # General saturated fluid pool
    general_chromophore_mask = (sat > 36) & (val > 30) & (val < 248)

    combined_chromophore = (pink_magenta_mask | general_chromophore_mask).astype(np.uint8) * 255
    target_mask = cv2.bitwise_and(combined_chromophore, search_mask)

    # Morphological cleaning
    kernel_m = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    clean_mask = cv2.morphologyEx(target_mask, cv2.MORPH_OPEN, kernel_m)
    clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_CLOSE, kernel_m)

    contours, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best_cnt = None
    best_score = -1.0
    min_roi_area = (w * h) * 0.001
    max_roi_area = (w * h) * 0.25

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if min_roi_area < area < max_roi_area:
            bx, by, bw, bh = cv2.boundingRect(cnt)
            aspect = float(bw) / float(bh + 1e-5)

            if aspect < 0.25 or aspect > 4.0:
                continue

            # Check text edge density to exclude printed text swatches
            roi_gray = gray[by:by+bh, bx:bx+bw]
            roi_edges = cv2.Canny(roi_gray, 45, 130)
            edge_density = float(np.count_nonzero(roi_edges)) / float(bw * bh + 1e-5)
            if edge_density > 0.22:
                continue

            hull = cv2.convexHull(cnt)
            hull_area = cv2.contourArea(hull)
            solidity = area / (hull_area + 1e-5)

            # Central liquid reaction droplet score
            score = area * solidity * (1.0 - edge_density)
            if score > best_score:
                best_score = score
                best_cnt = cnt

    if best_cnt is not None:
        bx, by, bw, bh = cv2.boundingRect(best_cnt)
        return extract_reaction_metrics(
            img_rgb, gray, bx, by, bw, bh, w, h, calibration_matrix, method="AUTO", notes="Reaction fluid droplet segmented dynamically."
        )

    # Search for reaction chamber within detected test kit geometry
    if test_kit_corners is not None and len(test_kit_corners) >= 4:
        kbx, kby, kbw, kbh = cv2.boundingRect(np.int32(test_kit_corners))
        # Ensure within image bounds
        kbx = max(0, min(w - 1, kbx))
        kby = max(0, min(h - 1, kby))
        kbw = max(1, min(w - kbx, kbw))
        kbh = max(1, min(h - kby, kbh))

        kit_crop_hsv = img_hsv[kby : kby + kbh, kbx : kbx + kbw]
        kit_fluid_mask = (kit_crop_hsv[:, :, 1] > 22) & (kit_crop_hsv[:, :, 2] > 25) & (kit_crop_hsv[:, :, 2] < 248)

        if np.count_nonzero(kit_fluid_mask) >= 30:
            ys, xs = np.where(kit_fluid_mask)
            min_x, max_x = int(xs.min()), int(xs.max())
            min_y, max_y = int(ys.min()), int(ys.max())
            rx = kbx + min_x
            ry = kby + min_y
            rw = max(15, max_x - min_x)
            rh = max(15, max_y - min_y)
            return extract_reaction_metrics(
                img_rgb, gray, rx, ry, rw, rh, w, h, calibration_matrix, method="AUTO", notes="Reaction fluid located relative to detected test kit."
            )

    # True Fail-Closed: If neither reaction fluid nor reaction chamber was resolved, DO NOT FABRICATE!
    return ReactionROIResult(
        detected=False,
        confidence=None,
        bbox=None,
        polygon=None,
        method="AUTO",
        selection_notes="REACTION_ROI_UNCERTAIN: No valid reaction fluid or reaction chamber resolved from optical evidence. MANUAL_REVIEW_REQUIRED."
    )

def extract_reaction_metrics(
    img_rgb: np.ndarray,
    gray: np.ndarray,
    bx: int,
    by: int,
    bw: int,
    bh: int,
    w: int,
    h: int,
    calibration_matrix: List[List[float]],
    method: str = "AUTO",
    notes: str = ""
) -> ReactionROIResult:
    """
    Performs multi-scale pixel sampling with specular glare rejection and CIEDE2000 calibration.
    """
    crop_rgb = img_rgb[by : by + bh, bx : bx + bw]
    crop_gray = gray[by : by + bh, bx : bx + bw]

    total_pixels = bw * bh
    if total_pixels < 20 or crop_rgb.size == 0:
        return ReactionROIResult(
            detected=False,
            confidence=None,
            bbox=None,
            method=method,
            selection_notes="Reaction region is empty or invalid."
        )

    # 1. Specular Glare & Highlight Detection Mask
    max_c = np.max(crop_rgb, axis=2)
    min_c = np.min(crop_rgb, axis=2)
    sat_metric = max_c - min_c

    glare_mask = (crop_gray >= 238) | ((max_c >= 228) & (sat_metric < 25))
    shadow_mask = crop_gray <= 12
    invalid_mask = glare_mask | shadow_mask

    valid_mask = ~invalid_mask
    valid_pixel_count = int(np.count_nonzero(valid_mask))
    usable_pixel_pct = round(float(valid_pixel_count) / float(total_pixels) * 100.0, 1)

    has_glare = bool(np.count_nonzero(glare_mask) > (total_pixels * 0.04))

    # Reject if insufficient usable pixels (glare or shadow saturation)
    if usable_pixel_pct < 30.0 or valid_pixel_count < 15:
        return ReactionROIResult(
            detected=False,
            confidence=None,
            bbox=None,
            polygon=None,
            method=method,
            glare_detected=has_glare,
            usable_pixel_percent=usable_pixel_pct,
            selection_notes="REACTION_ROI_UNRELIABLE: High glare or shadow contamination (usable pixels < 30%). Analysis blocked."
        )

    # Core sampling (inner 65% of ROI)
    inner_y1 = int(bh * 0.18)
    inner_y2 = max(inner_y1 + 4, int(bh * 0.82))
    inner_x1 = int(bw * 0.18)
    inner_x2 = max(inner_x1 + 4, int(bw * 0.82))

    inner_valid = valid_mask[inner_y1:inner_y2, inner_x1:inner_x2]
    inner_rgb = crop_rgb[inner_y1:inner_y2, inner_x1:inner_x2]

    # Convert crop to HSV to isolate the chromatic chemical reaction fluid
    crop_hsv = cv2.cvtColor(crop_rgb, cv2.COLOR_RGB2HSV)
    crop_sat = crop_hsv[:, :, 1]

    chromatic_valid_mask = valid_mask & (crop_sat >= 18)
    inner_chromatic_mask = inner_valid & (crop_sat[inner_y1:inner_y2, inner_x1:inner_x2] >= 18)

    if np.count_nonzero(inner_chromatic_mask) >= 12:
        sampled_pixels = inner_rgb[inner_chromatic_mask]
    elif np.count_nonzero(chromatic_valid_mask) >= 12:
        sampled_pixels = crop_rgb[chromatic_valid_mask]
    elif np.count_nonzero(inner_valid) >= 12:
        sampled_pixels = inner_rgb[inner_valid]
    elif valid_pixel_count >= 12:
        sampled_pixels = crop_rgb[valid_mask]
    else:
        sampled_pixels = crop_rgb.reshape(-1, 3)

    med_r = int(round(float(np.median(sampled_pixels[:, 0]))))
    med_g = int(round(float(np.median(sampled_pixels[:, 1]))))
    med_b = int(round(float(np.median(sampled_pixels[:, 2]))))
    raw_rgb = (med_r, med_g, med_b)
    raw_hex = rgb_to_hex(*raw_rgb)

    # Apply calibration matrix
    cal_rgb = apply_calibration_to_rgb(raw_rgb, calibration_matrix)
    cal_hex = rgb_to_hex(*cal_rgb)
    lab_val = rgb_to_lab(*cal_rgb)

    meas_hsv = cv2.cvtColor(np.uint8([[[cal_rgb[0], cal_rgb[1], cal_rgb[2]]]]), cv2.COLOR_RGB2HSV)[0][0]
    hsv_val = (int(meas_hsv[0]), int(meas_hsv[1]), int(meas_hsv[2]))

    # Homogeneity calculation
    pixel_stds = np.std(sampled_pixels, axis=0)
    avg_std = float(np.mean(pixel_stds))
    homogeneity = round(max(30.0, min(99.0, 100.0 - avg_std * 1.5)), 1)

    color_desc = classify_observed_color_name(lab_val, cal_rgb)

    norm_box = BoundingBox(
        x=round(float(bx) / w * 100.0, 1),
        y=round(float(by) / h * 100.0, 1),
        width=round(float(bw) / w * 100.0, 1),
        height=round(float(bh) / h * 100.0, 1),
    )

    polygon = [
        (round(float(bx) / w * 100.0, 1), round(float(by) / h * 100.0, 1)),
        (round(float(bx + bw) / w * 100.0, 1), round(float(by) / h * 100.0, 1)),
        (round(float(bx + bw) / w * 100.0, 1), round(float(by + bh) / h * 100.0, 1)),
        (round(float(bx) / w * 100.0, 1), round(float(by + bh) / h * 100.0, 1)),
    ]

    conf = round(min(97.0, max(50.0, 80.0 + (usable_pixel_pct / 5.0) - (15.0 if has_glare else 0.0))), 1)

    return ReactionROIResult(
        detected=True,
        confidence=conf,
        bbox=norm_box,
        polygon=polygon,
        method=method,
        raw_rgb=raw_rgb,
        raw_hex=raw_hex,
        calibrated_hex=cal_hex,
        lab=lab_val,
        hsv=hsv_val,
        glare_detected=has_glare,
        usable_pixel_percent=usable_pixel_pct,
        homogeneity_score=homogeneity,
        color_description=color_desc,
        selection_notes=notes or f"Observed: {color_desc} (Usable pixels: {usable_pixel_pct}%)"
    )
