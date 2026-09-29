import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from .perspective import order_quadrilateral_points, compute_perspective_warp
from .schemas import BoundingBox, TestKitResult, TestKitProfile, SUPPORTED_TEST_KIT_PROFILES

class TestKitCandidate:
    def __init__(self, corners: np.ndarray, area: float, confidence: float, kit_type: str = "reagent_pouch"):
        self.corners = order_quadrilateral_points(corners)  # shape (4, 2)
        self.area = area
        self.confidence = confidence
        self.kit_type = kit_type
        self.rectified_kit: Optional[np.ndarray] = None
        self.transform_M: Optional[np.ndarray] = None
        self.inv_M: Optional[np.ndarray] = None
        self.swatch_count: int = 0
        self.reaction_chamber_rect: Optional[Tuple[int, int, int, int]] = None
        self.profile: Optional[TestKitProfile] = None

def detect_field_test_kit(
    proc_bgr: np.ndarray,
    gray: np.ndarray,
    clahe_gray: np.ndarray,
    card_corners: Optional[np.ndarray] = None,
    kit_id: Optional[str] = "kit-fentanyl-strip"
) -> Optional[TestKitCandidate]:
    """
    True Free-Position Computer Vision:
    Detects the Field-Test Reagent / Test Kit package anywhere in the full frame.
    Supports reagent pouches, cassettes, strips, tubes, and vials.
    Independent of position (left, right, center, top, bottom), rotation, or scale.
    Strictly excludes the confirmed Reference Card so the two objects never collide.
    """
    h, w = gray.shape[:2]
    total_area = w * h
    active_profile = SUPPORTED_TEST_KIT_PROFILES.get(kit_id or "kit-fentanyl-strip", SUPPORTED_TEST_KIT_PROFILES["kit-fentanyl-strip"])

    # 1. Create search mask: zero-out ONLY the confirmed Reference Card, preserving full frame edges
    mask = np.ones((h, w), dtype=np.uint8) * 255
    card_poly = None
    if card_corners is not None and len(card_corners) >= 4:
        card_poly = np.int32(card_corners)
        card_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(card_mask, [card_poly], 255)
        # Dilate card exclusion zone slightly (10px) to prevent border contact
        card_dilated = cv2.dilate(card_mask, cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11)))
        mask[card_dilated > 0] = 0

    # 2. Multi-Pipeline Binary Maps for Test-Kit Container Extraction
    # Map A: Canny edges + morphological closing with 7x7 and 15x15 kernels (sealed seam boundaries)
    canny = cv2.Canny(clahe_gray, 28, 115)
    canny = cv2.bitwise_and(canny, mask)
    dilated_edges = cv2.dilate(canny, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))
    closed_seams7 = cv2.morphologyEx(dilated_edges, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7)))
    closed_seams15 = cv2.morphologyEx(dilated_edges, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15)))

    # Map B: Otsu thresholding of the package casing / plastic body
    _, thresh_otsu = cv2.threshold(clahe_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thresh_otsu = cv2.bitwise_and(thresh_otsu, mask)

    # Map C: Adaptive threshold closed with 9x9 (detects plastic pouch envelope and ampoule wells)
    thresh_adapt = cv2.adaptiveThreshold(clahe_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 29, 3)
    thresh_adapt = cv2.bitwise_and(thresh_adapt, mask)
    closed_adapt = cv2.morphologyEx(thresh_adapt, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9)))

    binary_maps = [
        ("seams15", closed_seams15),
        ("seams7", closed_seams7),
        ("otsu", thresh_otsu),
        ("adapt", closed_adapt),
    ]

    candidate_contours = []
    for name, bmap in binary_maps:
        cnts, _ = cv2.findContours(bmap, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts:
            candidate_contours.append((c, name))

    # Evaluate fluid chromophore presence to score candidate packages
    hsv = cv2.cvtColor(proc_bgr, cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]
    hue_ch = hsv[:, :, 0]
    # Blue glove detection
    blue_glove = ((hue_ch >= 78) & (hue_ch <= 135) & (sat > 35) & (val > 30))
    # Chemical reaction fluid chromophore (magenta/purple or amber/orange)
    fluid_pixels = (((hue_ch >= 135) | (hue_ch <= 25)) | ((hue_ch >= 28) & (hue_ch <= 55))) & (sat > 42) & (val > 35) & (~blue_glove)

    best_cand: Optional[TestKitCandidate] = None
    best_score = -1.0
    min_kit_area = total_area * 0.015   # 1.5% of frame (allows kits further from lens)
    max_kit_area = total_area * 0.88    # 88% of frame (allows close-up kits without truncation)

    seen_boxes: List[Tuple[float, float, float]] = []

    for cnt, source_name in candidate_contours:
        area = cv2.contourArea(cnt)
        if area < min_kit_area or area > max_kit_area:
            continue

        rect = cv2.minAreaRect(cnt)
        bw, bh = rect[1]
        if bw < 35 or bh < 35:
            continue

        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        solidity = area / (hull_area + 1e-5)

        # Relaxed solidity threshold: gloved fingers holding the pouch indent the border
        if solidity < 0.38:
            continue

        aspect = max(bw, bh) / (min(bw, bh) + 1e-5)
        # Plausible kit aspect ratios: 1.05 to 4.5
        if aspect > 4.5 or aspect < 1.05:
            continue

        cx, cy = float(rect[0][0]), float(rect[0][1])

        # Deduplication
        is_dup = any(
            abs(cx - scx) < 30 and abs(cy - scy) < 30 and abs(area - sarea) / max(area, sarea) < 0.35
            for scx, scy, sarea in seen_boxes
        )
        if is_dup:
            continue
        seen_boxes.append((cx, cy, area))

        # Check overlap with confirmed reference card
        if card_poly is not None:
            # Check if centroid is inside card
            if cv2.pointPolygonTest(card_poly, (cx, cy), False) >= 0:
                continue

        # Inspect internal package features: edge density (text, labeling, swatches, ampoules)
        bx, by, rw, rh = cv2.boundingRect(cnt)
        bx = max(0, min(w - 1, bx))
        by = max(0, min(h - 1, by))
        rw = min(w - bx, rw)
        rh = min(h - by, rh)
        if rw < 25 or rh < 25:
            continue

        roi_gray = gray[by:by+rh, bx:bx+rw]
        roi_canny = cv2.Canny(roi_gray, 35, 125)
        edge_density = float(np.count_nonzero(roi_canny)) / float(rw * rh + 1e-5)

        # Reagent packages typically contain labeling, instructions, and ampoules (edge density 0.02 to 0.38)
        if edge_density < 0.018 or edge_density > 0.42:
            continue

        # Check blue nitrile glove fraction inside the candidate: reject candidate if > 65% is pure blue glove
        roi_glove = blue_glove[by:by+rh, bx:bx+rw]
        glove_frac = float(np.count_nonzero(roi_glove)) / float(rw * rh + 1e-5)
        if glove_frac > 0.65:
            continue

        # Reject full-screen document pages or background canvas (e.g. NIST publication screenshot)
        if (bw > w * 0.88 and bh > h * 0.68) or (rw > w * 0.92 and rh > h * 0.72):
            continue

        # Check for reaction fluid chromophore presence inside candidate
        roi_fluid = fluid_pixels[by:by+rh, bx:bx+rw]
        fluid_pixel_count = np.count_nonzero(roi_fluid)

        # Large candidate validation: If candidate occupies > 50% of frame, it MUST have fluid chromophore evidence
        if area > total_area * 0.50 and fluid_pixel_count < 20:
            continue

        fluid_bonus = 0.45 if fluid_pixel_count > 60 else (0.20 if fluid_pixel_count > 15 else 0.0)

        # Multi-signal scoring
        area_score = min(0.35, (area / total_area) * 1.5)
        solidity_score = solidity * 0.25
        text_score = min(0.30, edge_density * 2.5)
        glove_penalty = glove_frac * 0.25

        score = area_score + solidity_score + text_score + fluid_bonus - glove_penalty

        if score > best_score:
            best_score = score
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.03 * peri, True)
            box = cv2.boxPoints(rect)
            box = np.intp(box)
            pts = approx.reshape(-1, 2) if (len(approx) == 4 and cv2.isContourConvex(approx)) else box

            conf = round(min(98.5, max(58.0, 68.0 + score * 30.0)), 1)
            best_cand = TestKitCandidate(pts, area, conf, kit_type=active_profile.geometry)
            best_cand.profile = active_profile

    # Perspective rectify the detected test kit into canonical space
    if best_cand is not None:
        target_w = 300
        target_h = int(round(target_w * active_profile.expected_aspect_ratio))
        warped_kit, M_kit, inv_M_kit = compute_perspective_warp(
            proc_bgr, best_cand.corners, target_width=target_w, target_height=target_h
        )
        best_cand.rectified_kit = warped_kit
        best_cand.transform_M = M_kit
        best_cand.inv_M = inv_M_kit

    return best_cand
