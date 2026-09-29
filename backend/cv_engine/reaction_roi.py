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

    # CASE 2: Multi-stage Reaction Fluid Localization
    # Stage 1: Perspective-Normalized Reaction Chamber Search (if test kit corners available)
    if test_kit_corners is not None and len(test_kit_corners) >= 4:
        from .perspective import order_quadrilateral_points, compute_perspective_warp
        from .schemas import SUPPORTED_TEST_KIT_PROFILES

        kit_quad = order_quadrilateral_points(np.array(test_kit_corners, dtype=np.float32))
        profile = SUPPORTED_TEST_KIT_PROFILES.get(kit_id or "kit-fentanyl-strip", SUPPORTED_TEST_KIT_PROFILES["kit-fentanyl-strip"])

        can_w = 300
        can_h = int(round(can_w * profile.expected_aspect_ratio))
        warped_kit, M_kit, inv_M_kit = compute_perspective_warp(img_bgr, kit_quad, target_width=can_w, target_height=can_h)

        rx_zone = profile.expected_reaction_region
        zx1 = int(round(rx_zone.get("x_min", 0.08) * can_w))
        zx2 = int(round(rx_zone.get("x_max", 0.92) * can_w))
        zy1 = int(round(rx_zone.get("y_min", 0.45) * can_h))
        zy2 = int(round(rx_zone.get("y_max", 0.98) * can_h))

        zx1 = max(0, min(can_w - 10, zx1))
        zx2 = max(zx1 + 10, min(can_w, zx2))
        zy1 = max(0, min(can_h - 10, zy1))
        zy2 = max(zy1 + 10, min(can_h, zy2))

        zone_bgr = warped_kit[zy1:zy2, zx1:zx2]
        if zone_bgr.size > 0:
            zone_hsv = cv2.cvtColor(zone_bgr, cv2.COLOR_BGR2HSV)
            zone_rgb = cv2.cvtColor(zone_bgr, cv2.COLOR_BGR2RGB)
            zone_gray = cv2.cvtColor(zone_bgr, cv2.COLOR_BGR2GRAY)

            hue_z = zone_hsv[:, :, 0]
            sat_z = zone_hsv[:, :, 1]
            val_z = zone_hsv[:, :, 2]
            chroma_z = np.max(zone_rgb, axis=2) - np.min(zone_rgb, axis=2)

            # Exclude blue nitrile glove & extreme specular glare
            blue_glove_z = (hue_z >= 85) & (hue_z <= 130) & (sat_z > 55) & (val_z > 45)
            glare_z = (val_z >= 242) & (sat_z < 25)
            shadow_z = val_z <= 10
            invalid_z = blue_glove_z | glare_z | shadow_z

            # Highly sensitive multi-chromophore reaction detection:
            # 1. Violet / Purple / Magenta (Marquis MDMA/meth, Fentanyl): H in [125, 180] or [0, 22]
            # 2. Amber / Orange / Red-Brown (Marquis amphetamine, etc.): H in [20, 55]
            # 3. Cyan / Blue / Green (Scott, Mecke, Froehde): H in [50, 125]
            # 4. Dense reacting fluid pool: chroma > 15, V in [12, 180]
            pink_magenta_z = ((hue_z >= 125) | (hue_z <= 25)) & (sat_z > 20) & (val_z >= 14) & (val_z <= 210)
            amber_orange_z = (hue_z > 25) & (hue_z <= 55) & (sat_z > 25) & (val_z >= 16) & (val_z <= 210)
            green_z = (hue_z > 55) & (hue_z < 85) & (sat_z > 25) & (val_z >= 16) & (val_z <= 210)
            general_chromophore_z = (chroma_z > 15) & (val_z >= 14) & (val_z <= 220)

            chromophore_z = (pink_magenta_z | amber_orange_z | green_z | general_chromophore_z) & (~invalid_z)
            clean_z = cv2.morphologyEx(chromophore_z.astype(np.uint8) * 255, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
            clean_z = cv2.morphologyEx(clean_z, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

            cnts, _ = cv2.findContours(clean_z, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            best_cnt = None
            best_score = -1.0
            zone_area = (zx2 - zx1) * (zy2 - zy1)

            for c in cnts:
                c_area = cv2.contourArea(c)
                if c_area < 25 or c_area > zone_area * 0.95:
                    continue
                cbx, cby, cbw, cbh = cv2.boundingRect(c)
                casp = max(cbw, cbh) / (min(cbw, cbh) + 1e-5)
                if casp > 6.0:
                    continue
                c_edges = cv2.Canny(zone_gray[cby:cby+cbh, cbx:cbx+cbw], 40, 130)
                c_edge_dens = float(np.count_nonzero(c_edges)) / float(cbw * cbh + 1e-5)
                is_swatch = (c_area < 450 and 0.80 <= casp <= 1.25 and c_edge_dens > 0.05)
                swatch_penalty = 0.05 if is_swatch else 1.0

                score = c_area * (1.0 - c_edge_dens * 0.5) * swatch_penalty
                if score > best_score:
                    best_score = score
                    best_cnt = c

            if best_cnt is not None:
                cbx, cby, cbw, cbh = cv2.boundingRect(best_cnt)
                k_pts = np.array([
                    [zx1 + cbx, zy1 + cby],
                    [zx1 + cbx + cbw, zy1 + cby],
                    [zx1 + cbx + cbw, zy1 + cby + cbh],
                    [zx1 + cbx, zy1 + cby + cbh]
                ], dtype=np.float32).reshape(-1, 1, 2)

                mapped_orig = cv2.perspectiveTransform(k_pts, inv_M_kit).reshape(-1, 2)
                xs = mapped_orig[:, 0]
                ys = mapped_orig[:, 1]
                orig_min_x = max(0, int(round(np.min(xs))))
                orig_max_x = min(w, int(round(np.max(xs))))
                orig_min_y = max(0, int(round(np.min(ys))))
                orig_max_y = min(h, int(round(np.max(ys))))
                orig_w_box = max(10, orig_max_x - orig_min_x)
                orig_h_box = max(10, orig_max_y - orig_min_y)

                poly_norm = []
                for pt in mapped_orig:
                    poly_norm.append((round(pt[0] / w * 100.0, 1), round(pt[1] / h * 100.0, 1)))

                roi_res = extract_reaction_metrics(
                    img_rgb, gray, orig_min_x, orig_min_y, orig_w_box, orig_h_box, w, h,
                    calibration_matrix, method="AUTO",
                    notes="Reaction fluid segmented inside perspective-normalized test kit reaction chamber."
                )
                if roi_res.detected:
                    roi_res.polygon = poly_norm
                    return roi_res

    # Stage 2: Direct Search in Test Kit Bounding Box (Original Image Space)
    if test_kit_corners is not None and len(test_kit_corners) >= 4:
        tk_pts = np.array(test_kit_corners, dtype=np.float32)
        k_min_x = max(0, int(round(np.min(tk_pts[:, 0]))))
        k_max_x = min(w, int(round(np.max(tk_pts[:, 0]))))
        k_min_y = max(0, int(round(np.min(tk_pts[:, 1]))))
        k_max_y = min(h, int(round(np.max(tk_pts[:, 1]))))

        # Focus on lower 60% of the kit where reaction fluids gather
        s_y1 = k_min_y + int((k_max_y - k_min_y) * 0.40)
        s_y2 = k_max_y
        s_x1 = k_min_x + int((k_max_x - k_min_x) * 0.05)
        s_x2 = k_max_x - int((k_max_x - k_min_x) * 0.05)

        if s_x2 > s_x1 + 20 and s_y2 > s_y1 + 20:
            sub_bgr = img_bgr[s_y1:s_y2, s_x1:s_x2]
            sub_hsv = cv2.cvtColor(sub_bgr, cv2.COLOR_BGR2HSV)
            sub_rgb = cv2.cvtColor(sub_bgr, cv2.COLOR_BGR2RGB)
            sub_gray = cv2.cvtColor(sub_bgr, cv2.COLOR_BGR2GRAY)

            h_s = sub_hsv[:, :, 0]
            s_s = sub_hsv[:, :, 1]
            v_s = sub_hsv[:, :, 2]
            c_s = np.max(sub_rgb, axis=2) - np.min(sub_rgb, axis=2)

            bg_s = (h_s >= 85) & (h_s <= 130) & (s_s > 55) & (v_s > 45)
            gl_s = (v_s >= 242) & (s_s < 25)
            sh_s = v_s <= 10

            fluid_s = (
                (((h_s >= 125) | (h_s <= 25)) & (s_s > 20) & (v_s >= 14) & (v_s <= 210)) |
                ((h_s > 25) & (h_s <= 55) & (s_s > 25) & (v_s >= 16) & (v_s <= 210)) |
                ((h_s > 55) & (h_s < 85) & (s_s > 25) & (v_s >= 16) & (v_s <= 210)) |
                ((c_s > 15) & (v_s >= 14) & (v_s <= 220))
            ) & (~bg_s) & (~gl_s) & (~sh_s)

            clean_s = cv2.morphologyEx(fluid_s.astype(np.uint8)*255, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
            clean_s = cv2.morphologyEx(clean_s, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

            cnts_s, _ = cv2.findContours(clean_s, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            best_s_cnt = None
            best_s_score = -1.0

            for c in cnts_s:
                ca = cv2.contourArea(c)
                if ca < 80:
                    continue
                bx, by, bw_b, bh_b = cv2.boundingRect(c)
                edges_s = cv2.Canny(sub_gray[by:by+bh_b, bx:bx+bw_b], 40, 130)
                ed_s = float(np.count_nonzero(edges_s)) / float(bw_b * bh_b + 1e-5)
                score_s = ca / (ed_s + 0.1)
                if score_s > best_s_score:
                    best_s_score = score_s
                    best_s_cnt = c

            if best_s_cnt is not None:
                bx, by, bw_b, bh_b = cv2.boundingRect(best_s_cnt)
                orig_x = s_x1 + bx
                orig_y = s_y1 + by
                orig_w_box = max(10, bw_b)
                orig_h_box = max(10, bh_b)

                roi_res = extract_reaction_metrics(
                    img_rgb, gray, orig_x, orig_y, orig_w_box, orig_h_box, w, h,
                    calibration_matrix, method="AUTO",
                    notes="Reaction fluid segmented in test kit reaction chamber (image space)."
                )
                if roi_res.detected:
                    return roi_res

    # Stage 3: Full-Frame Contour-Scored Reaction Fluid Detection
    # Key insight: Reaction fluid is SMOOTH (low edge density) and UNIFORMLY COLORED (high homogeneity).
    # Packaging text/labels are HIGH edge density and mixed colors.
    # Score individual contours by how "fluid-like" they are.
    search_mask = np.ones((h, w), dtype=np.uint8) * 255
    card_poly_int = None
    if card_corners is not None and len(card_corners) >= 4:
        card_poly_int = np.int32(card_corners)
        card_poly_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(card_poly_mask, [card_poly_int], 255)
        card_dilated_mask = cv2.dilate(card_poly_mask, cv2.getStructuringElement(cv2.MORPH_RECT, (21, 21)))
        search_mask[card_dilated_mask > 0] = 0

    hue_full = img_hsv[:, :, 0]
    sat_full = img_hsv[:, :, 1]
    val_full = img_hsv[:, :, 2]
    img_rgb_full = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    chroma_full = np.max(img_rgb_full, axis=2).astype(np.int16) - np.min(img_rgb_full, axis=2).astype(np.int16)

    blue_glove_full = (hue_full >= 85) & (hue_full <= 130) & (sat_full > 50) & (val_full > 40)
    glare_full = (val_full >= 235) & (sat_full < 30)
    shadow_full = val_full <= 14
    neutral_full = (sat_full < 22) | ((val_full > 175) & (chroma_full < 28))
    invalid_full = blue_glove_full | glare_full | shadow_full | neutral_full | (search_mask == 0)

    violet_purple = ((hue_full >= 125) | (hue_full <= 18)) & (sat_full > 28) & (val_full >= 16) & (val_full <= 200)
    pink_magenta = ((hue_full >= 130) | (hue_full <= 10)) & (sat_full > 35) & (val_full >= 25) & (val_full <= 215)
    amber_orange = (hue_full > 10) & (hue_full <= 28) & (sat_full > 40) & (val_full >= 25) & (val_full <= 215)
    green_reaction = (hue_full > 55) & (hue_full < 82) & (sat_full > 35) & (val_full >= 25) & (val_full <= 215)
    dark_concentrate = (val_full < 65) & (chroma_full > 14) & (val_full > 12)

    fluid_full = (violet_purple | pink_magenta | amber_orange | green_reaction | dark_concentrate) & (~invalid_full)

    fluid_clean = cv2.morphologyEx(fluid_full.astype(np.uint8) * 255, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    fluid_clean = cv2.morphologyEx(fluid_clean, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

    cnts_full, _ = cv2.findContours(fluid_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    total_area = w * h
    best_fluid_cnt = None
    best_fluid_score = -1.0

    for c in cnts_full:
        area = cv2.contourArea(c)
        if area < 60 or area > total_area * 0.25:
            continue

        bx_c, by_c, bw_c, bh_c = cv2.boundingRect(c)
        if bw_c < 8 or bh_c < 8:
            continue

        if card_poly_int is not None:
            cx_c = float(bx_c + bw_c / 2)
            cy_c = float(by_c + bh_c / 2)
            if cv2.pointPolygonTest(card_poly_int, (cx_c, cy_c), False) >= 0:
                continue

        aspect_c = max(bw_c, bh_c) / (min(bw_c, bh_c) + 1e-5)
        if aspect_c > 5.0:
            continue

        # Edge Density: fluid = LOW edges (smooth wet surface), text = HIGH edges
        roi_gray_c = gray[by_c:by_c+bh_c, bx_c:bx_c+bw_c]
        edges_c = cv2.Canny(roi_gray_c, 40, 120)
        edge_density = float(np.count_nonzero(edges_c)) / float(bw_c * bh_c + 1e-5)

        # Color Homogeneity: fluid = uniform color, packaging = mixed colors
        roi_rgb_c = img_rgb_full[by_c:by_c+bh_c, bx_c:bx_c+bw_c]
        color_std = float(np.mean(np.std(roi_rgb_c.reshape(-1, 3).astype(np.float32), axis=0)))

        # Solidity: fluid pools are convex/blob-like
        hull = cv2.convexHull(c)
        hull_area = cv2.contourArea(hull)
        solidity = area / (hull_area + 1e-5)

        fill_ratio = area / (bw_c * bh_c + 1e-5)

        # Scoring: higher = more fluid-like
        edge_penalty = max(0.0, edge_density - 0.025) * 200.0
        homogeneity_bonus = max(0.0, 45.0 - color_std) * 0.6
        solidity_bonus = solidity * 15.0
        area_bonus = min(12.0, math.sqrt(area) / 15.0)
        fill_bonus = fill_ratio * 8.0

        score = area_bonus + solidity_bonus + homogeneity_bonus + fill_bonus - edge_penalty

        if score > best_fluid_score:
            best_fluid_score = score
            best_fluid_cnt = c

    if best_fluid_cnt is not None and best_fluid_score > 0:
        bx_f, by_f, bw_f, bh_f = cv2.boundingRect(best_fluid_cnt)
        margin = int(max(bw_f, bh_f) * 0.12)
        roi_x = max(0, bx_f - margin)
        roi_y = max(0, by_f - margin)
        roi_w = min(w - roi_x, bw_f + 2 * margin)
        roi_h = min(h - roi_y, bh_f + 2 * margin)

        roi_res = extract_reaction_metrics(
            img_rgb_full, gray, roi_x, roi_y, roi_w, roi_h, w, h,
            calibration_matrix, method="AUTO",
            notes="Reaction fluid detected via contour-scored chromophore analysis (smooth fluid surface vs textured packaging)."
        )
        if roi_res.detected:
            return roi_res

    # Absolute fail-closed
    return ReactionROIResult(
        detected=False,
        confidence=None,
        bbox=None,
        polygon=None,
        method="AUTO",
        selection_notes="REACTION_ROI_NOT_FOUND: No chemical reaction fluid pool resolved in image."
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
