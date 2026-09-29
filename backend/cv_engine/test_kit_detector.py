import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from .perspective import order_quadrilateral_points, compute_perspective_warp
from .schemas import BoundingBox, TestKitResult

class TestKitCandidate:
    def __init__(self, corners: np.ndarray, area: float, confidence: float, kit_type: str = "cassette_or_pouch"):
        self.corners = order_quadrilateral_points(corners)  # shape (4, 2)
        self.area = area
        self.confidence = confidence
        self.kit_type = kit_type
        self.rectified_kit: Optional[np.ndarray] = None
        self.transform_M: Optional[np.ndarray] = None
        self.inv_M: Optional[np.ndarray] = None
        self.swatch_count: int = 0
        self.reaction_chamber_rect: Optional[Tuple[int, int, int, int]] = None

def detect_field_test_kit(
    proc_bgr: np.ndarray,
    gray: np.ndarray,
    clahe_gray: np.ndarray,
    card_corners: Optional[np.ndarray] = None,
    kit_id: Optional[str] = "kit-fentanyl-strip"
) -> Optional[TestKitCandidate]:
    """
    True Free-Position Computer Vision:
    Detects the Field-Test Reagent / Test Kit package anywhere in the frame.
    Works whether the kit is on the left, right, center, top, bottom, rotated, or tilted.
    Excludes the EvidenceTwin reference card area so the two objects never collide.
    """
    h, w = gray.shape[:2]
    total_area = w * h

    # Create search mask excluding confirmed reference card if present
    mask = np.ones((h, w), dtype=np.uint8) * 255
    if card_corners is not None and len(card_corners) == 4:
        cv2.fillPoly(mask, [np.int32(card_corners)], 0)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        mask = cv2.erode(mask, kernel)

    # Edge detection & contour finding for package body
    canny = cv2.Canny(clahe_gray, 30, 120)
    canny = cv2.bitwise_and(canny, mask)
    kernel_dil = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(canny, kernel_dil, iterations=1)
    kernel_cls = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    closed = cv2.morphologyEx(dilated, cv2.MORPH_CLOSE, kernel_cls)

    # Also Otsu threshold for package casing / plastic body
    _, thresh_otsu = cv2.threshold(clahe_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thresh_otsu = cv2.bitwise_and(thresh_otsu, mask)

    candidate_contours = []
    for bmap in [closed, thresh_otsu]:
        cnts, _ = cv2.findContours(bmap, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        candidate_contours.extend(cnts)

    best_cand: Optional[TestKitCandidate] = None
    best_score = -1.0
    min_kit_area = total_area * 0.02   # At least 2% of frame
    max_kit_area = total_area * 0.65   # At most 65% of frame (reject full screen backgrounds)

    for cnt in candidate_contours:
        area = cv2.contourArea(cnt)
        if area < min_kit_area or area > max_kit_area:
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.03 * peri, True)
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        solidity = area / (hull_area + 1e-5)

        if solidity < 0.68:
            continue

        rect = cv2.minAreaRect(cnt)
        box = cv2.boxPoints(rect)
        box = np.intp(box)
        bw, bh = rect[1]
        if bw < 40 or bh < 40:
            continue

        aspect = max(bw, bh) / (min(bw, bh) + 1e-5)
        # Test kits, cassettes, pouches typically have aspect ratio between 1.15 and 4.2
        if aspect > 4.2 or aspect < 1.10:
            continue

        # Inspect internal package features: edge density (text/swatches) and contrast
        bx, by, rw, rh = cv2.boundingRect(cnt)
        bx = max(0, min(w - 1, bx))
        by = max(0, min(h - 1, by))
        rw = min(w - bx, rw)
        rh = min(h - by, rh)
        if rw < 30 or rh < 30:
            continue

        roi_gray = gray[by:by+rh, bx:bx+rw]
        roi_canny = cv2.Canny(roi_gray, 40, 130)
        edge_density = float(np.count_nonzero(roi_canny)) / float(rw * rh + 1e-5)

        # Detect package swatches or reaction chambers inside kit
        # Packages usually have printed labeling and well boundaries (density between 0.03 and 0.28)
        if edge_density < 0.025 or edge_density > 0.35:
            continue

        text_score = min(1.0, edge_density * 4.0)

        # Ensure it does not overlap heavily with card
        if card_corners is not None:
            card_cx = np.mean([pt[0] for pt in card_corners])
            card_cy = np.mean([pt[1] for pt in card_corners])
            kit_cx = float(rect[0][0])
            kit_cy = float(rect[0][1])
            dist = np.hypot(card_cx - kit_cx, card_cy - kit_cy)
            if dist < (min(bw, bh) * 0.4):
                continue

        score = (area / total_area) * 0.35 + solidity * 0.35 + text_score * 0.30

        if score > best_score:
            best_score = score
            pts = approx.reshape(-1, 2) if len(approx) == 4 and cv2.isContourConvex(approx) else box
            conf = round(min(98.0, max(55.0, 68.0 + score * 30.0)), 1)
            best_cand = TestKitCandidate(pts, area, conf, kit_type="reagent_package_or_cassette")

    return best_cand
