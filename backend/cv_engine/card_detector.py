import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from .perspective import order_quadrilateral_points, compute_perspective_warp
from .schemas import BoundingBox

class CardCandidate:
    def __init__(self, corners: np.ndarray, area: float, score: float, source_method: str = "contour"):
        self.corners = order_quadrilateral_points(corners)  # shape (4, 2)
        self.area = area
        self.score = score
        self.source_method = source_method
        self.aspect_ratio: float = 1.0
        self.rectified_card: Optional[np.ndarray] = None
        self.transform_M: Optional[np.ndarray] = None
        self.inv_M: Optional[np.ndarray] = None
        self.patch_score: float = 0.0
        self.structural_score: float = 0.0
        self.final_confidence: float = 0.0
        self.patch_results: List[Any] = []
        self.status_reason: str = ""
        self.is_reagent_package: bool = False

def calculate_angle_degrees(p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> float:
    """Calculates internal angle at vertex p2 formed by (p1, p2, p3)."""
    v1 = p1 - p2
    v2 = p3 - p2
    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-7)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_angle)))

def evaluate_quadrilateral_geometry(quad: np.ndarray, img_w: int, img_h: int) -> Tuple[bool, float, float]:
    """
    Evaluates whether a 4-point polygon has plausible card quadrilateral geometry.
    Can be placed anywhere, rotated, tilted, or perspective distorted.
    Returns: (is_valid, geometry_score, aspect_ratio)
    """
    pts = order_quadrilateral_points(quad)
    tl, tr, br, bl = pts

    # 1. Check internal angles (should be approximately rectangular: 90° +/- 40°)
    angles = [
        calculate_angle_degrees(bl, tl, tr),
        calculate_angle_degrees(tl, tr, br),
        calculate_angle_degrees(tr, br, bl),
        calculate_angle_degrees(br, bl, tl),
    ]

    max_angle_dev = max(abs(a - 90.0) for a in angles)
    if max_angle_dev > 42.0:
        return False, 0.0, 1.0
    angle_score = max(0.0, 1.0 - (max_angle_dev / 40.0))

    # 2. Lengths of opposite edges
    w1 = np.linalg.norm(tr - tl)
    w2 = np.linalg.norm(br - bl)
    h1 = np.linalg.norm(bl - tl)
    h2 = np.linalg.norm(br - tr)

    avg_w = (w1 + w2) / 2.0
    avg_h = (h1 + h2) / 2.0

    if avg_w < 35 or avg_h < 30:
        return False, 0.0, 1.0

    # 3. Parallelism of opposite edges
    edge_ratio_w = min(w1, w2) / (max(w1, w2) + 1e-5)
    edge_ratio_h = min(h1, h2) / (max(h1, h2) + 1e-5)
    if edge_ratio_w < 0.52 or edge_ratio_h < 0.52:
        return False, 0.0, 1.0

    parallel_score = (edge_ratio_w + edge_ratio_h) / 2.0

    # 4. Aspect ratio: EvidenceTwin reference card is ~1.00 (square format) or ~1.46 (landscape format)
    aspect = max(avg_w, avg_h) / (min(avg_w, avg_h) + 1e-5)
    if aspect < 0.88 or aspect > 2.45:
        # Strictly reject non-card aspect ratios (e.g. narrow banners, elongated strips)
        return False, 0.0, aspect

    aspect_diff = min(abs(aspect - 1.00), abs(aspect - 1.46))
    aspect_score = max(0.35, 1.0 - aspect_diff * 0.8)

    geom_score = 0.40 * angle_score + 0.35 * parallel_score + 0.25 * aspect_score
    return True, geom_score, aspect

def generate_card_candidates(
    gray: np.ndarray,
    clahe_gray: np.ndarray,
    manual_box: Optional[BoundingBox] = None
) -> List[CardCandidate]:
    """
    True Free-Position Computer Vision:
    Searches the ENTIRE IMAGE without any fixed left/right or coordinate assumptions.
    Discovers card candidates anywhere in the camera frame or uploaded photograph.
    """
    h, w = gray.shape[:2]
    total_area = w * h
    min_area = total_area * 0.015   # Reference card is at least 1.5% of frame (reject individual patches)
    max_area = total_area * 0.92    # At most 92% of frame

    candidates: List[CardCandidate] = []
    seen_candidates: List[Tuple[float, float, float]] = []  # (cx, cy, area)

    # Priority 0: Manual card selection (if explicitly supplied by operator)
    if manual_box is not None:
        is_norm = manual_box.width <= 100.0 and manual_box.height <= 100.0
        bx = (manual_box.x / 100.0 * w) if is_norm else manual_box.x
        by = (manual_box.y / 100.0 * h) if is_norm else manual_box.y
        bw = (manual_box.width / 100.0 * w) if is_norm else manual_box.width
        bh = (manual_box.height / 100.0 * h) if is_norm else manual_box.height

        manual_quad = np.array([
            [bx, by],
            [bx + bw, by],
            [bx + bw, by + bh],
            [bx, by + bh]
        ], dtype=np.float32)
        c = CardCandidate(manual_quad, bw * bh, score=2.5, source_method="manual_selection")
        candidates.append(c)

    # Multi-pipeline binary maps for full-frame contour discovery
    thresh_adapt = cv2.adaptiveThreshold(
        clahe_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 4
    )
    kernel_close5 = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed_adapt = cv2.morphologyEx(thresh_adapt, cv2.MORPH_CLOSE, kernel_close5)

    canny1 = cv2.Canny(clahe_gray, 30, 130)
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated_edges = cv2.dilate(canny1, kernel_dilate, iterations=1)
    kernel_close9 = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    closed_canny9 = cv2.morphologyEx(dilated_edges, cv2.MORPH_CLOSE, kernel_close9)
    kernel_close15 = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    closed_canny15 = cv2.morphologyEx(dilated_edges, cv2.MORPH_CLOSE, kernel_close15)

    _, thresh_otsu = cv2.threshold(clahe_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    _, thresh_dark_border = cv2.threshold(clahe_gray, 85, 255, cv2.THRESH_BINARY_INV)
    kernel_border = cv2.getStructuringElement(cv2.MORPH_RECT, (4, 4))
    dilated_border = cv2.dilate(thresh_dark_border, kernel_border, iterations=1)

    binary_maps = [
        ("dark_border", dilated_border),
        ("adaptive_close", closed_adapt),
        ("canny_close9", closed_canny9),
        ("canny_close15", closed_canny15),
        ("otsu", thresh_otsu),
    ]

    for name, bmap in binary_maps:
        contours, _ = cv2.findContours(bmap, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area or area > max_area:
                continue

            peri = cv2.arcLength(cnt, True)
            for eps_factor in [0.012, 0.020, 0.030, 0.045]:
                approx = cv2.approxPolyDP(cnt, eps_factor * peri, True)
                if len(approx) == 4 and cv2.isContourConvex(approx):
                    is_valid, geom_score, aspect = evaluate_quadrilateral_geometry(approx, w, h)
                    if is_valid and geom_score > 0.30:
                        pts = approx.reshape(4, 2)
                        cx, cy = float(np.mean(pts[:, 0])), float(np.mean(pts[:, 1]))

                        # Check duplicate candidate (only duplicate if BOTH centroid AND area match closely)
                        is_dup = any(
                            abs(cx - scx) < 25 and abs(cy - scy) < 25 and abs(area - sarea) / max(area, sarea) < 0.35
                            for scx, scy, sarea in seen_candidates
                        )
                        if is_dup:
                            continue
                        seen_candidates.append((cx, cy, area))

                        # Evaluate card interior body brightness (EvidenceTwin card body is white/light)
                        mask = np.zeros((h, w), dtype=np.uint8)
                        cv2.drawContours(mask, [approx], -1, 255, -1)
                        mean_luma = cv2.mean(gray, mask=mask)[0]
                        luma_bonus = 0.35 if mean_luma > 135 else (0.15 if mean_luma > 110 else -0.15)
                        area_bonus = min(0.40, (area / total_area) * 2.0)

                        cand = CardCandidate(approx, area, score=geom_score + luma_bonus + area_bonus + 0.50, source_method=name)
                        cand.aspect_ratio = aspect
                        candidates.append(cand)
                        break

            # Also check MinAreaRect for curved / perspective card corners (relaxed solidity for card interior)
            rect = cv2.minAreaRect(cnt)
            box = cv2.boxPoints(rect)
            box = np.intp(box)
            box_area = cv2.contourArea(box)
            if min_area < box_area < max_area:
                solidity = area / (box_area + 1e-5)
                if solidity > 0.28:
                    is_valid, geom_score, aspect = evaluate_quadrilateral_geometry(box, w, h)
                    if is_valid and geom_score > 0.32:
                        cx, cy = float(rect[0][0]), float(rect[0][1])
                        is_dup = any(
                            abs(cx - scx) < 25 and abs(cy - scy) < 25 and abs(box_area - sarea) / max(box_area, sarea) < 0.35
                            for scx, scy, sarea in seen_candidates
                        )
                        if not is_dup:
                            seen_candidates.append((cx, cy, box_area))
                            area_bonus = min(0.40, (box_area / total_area) * 2.0)
                            cand = CardCandidate(box, box_area, score=geom_score * 0.95 + area_bonus + 0.40, source_method=f"{name}_minAreaRect")
                            cand.aspect_ratio = aspect
                            candidates.append(cand)

    # Method 7: Connected-Component Patch Grid Cluster Discovery
    # Finds small rectangular patches clustering in a 3x5 arrangement
    patch_cnts = []
    patch_min_area = total_area * 0.0004
    patch_max_area = total_area * 0.040

    canny_raw = cv2.Canny(clahe_gray, 35, 120)
    cnts_all, _ = cv2.findContours(canny_raw, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    for c in cnts_all:
        ca = cv2.contourArea(c)
        if patch_min_area < ca < patch_max_area:
            cr = cv2.minAreaRect(c)
            cw, ch_box = cr[1]
            if min(cw, ch_box) > 10:
                casp = max(cw, ch_box) / (min(cw, ch_box) + 1e-5)
                if casp < 1.70:
                    patch_cnts.append(cr[0])

    if len(patch_cnts) >= 5:
        pts_arr = np.array(patch_cnts, dtype=np.float32)
        # Cluster bounding rect
        p_min_x, p_max_x = float(np.min(pts_arr[:, 0])), float(np.max(pts_arr[:, 0]))
        p_min_y, p_max_y = float(np.min(pts_arr[:, 1])), float(np.max(pts_arr[:, 1]))
        p_w = p_max_x - p_min_x
        p_h = p_max_y - p_min_y

        if p_w > 50 and p_h > 40:
            # Expand to full card bounds (patches occupy ~75% width and ~60% height)
            exp_w = p_w * 1.25
            exp_h = p_h * 1.55
            exp_cx = (p_min_x + p_max_x) / 2.0
            exp_cy = (p_min_y + p_max_y) / 2.0

            c_x1 = max(0.0, exp_cx - exp_w / 2.0)
            c_x2 = min(float(w), exp_cx + exp_w / 2.0)
            c_y1 = max(0.0, exp_cy - exp_h / 2.0)
            c_y2 = min(float(h), exp_cy + exp_h / 2.0)

            c_area = (c_x2 - c_x1) * (c_y2 - c_y1)
            if min_area < c_area < max_area:
                c_quad = np.array([
                    [c_x1, c_y1],
                    [c_x2, c_y1],
                    [c_x2, c_y2],
                    [c_x1, c_y2]
                ], dtype=np.float32)
                is_val, geom_sc, asp = evaluate_quadrilateral_geometry(c_quad, w, h)
                if is_val and geom_sc > 0.35:
                    is_dup = any(
                        abs(exp_cx - scx) < 30 and abs(exp_cy - scy) < 30
                        for scx, scy, _ in seen_candidates
                    )
                    if not is_dup:
                        seen_candidates.append((exp_cx, exp_cy, c_area))
                        cand = CardCandidate(c_quad, c_area, score=geom_sc + 0.60, source_method="patch_cluster")
                        cand.aspect_ratio = asp
                        candidates.append(cand)

    # Sort candidates by descending geometric score across the entire image
    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates[:48]
