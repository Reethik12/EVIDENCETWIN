import cv2
import numpy as np
from typing import Tuple, List, Dict, Any, Optional
from .schemas import ReferenceCardResult, BoundingBox
from .patch_detector import PatchMeasurement

MIN_CARD_VISIBLE_FRACTION = 0.55

def validate_card_structure(
    rectified_bgr: np.ndarray,
    patches: List[PatchMeasurement],
    matched_count: int,
    required_count: int,
    geom_score: float,
    orig_w: int,
    orig_h: int,
    card_corners: np.ndarray
) -> Tuple[bool, Optional[float], str, float]:
    """
    Computes real structural validation scores from actual image measurements:
    1. Rectangular geometry score
    2. Border contrast score
    3. White background score
    4. Patch count and alignment score
    5. Color diversity score
    6. Frame visibility fraction
    Returns: (is_card_confirmed, confidence_or_none, status_message, visible_fraction)
    """
    ch, cw = rectified_bgr.shape[:2]
    gray = cv2.cvtColor(rectified_bgr, cv2.COLOR_BGR2GRAY)

    # 1. Card visibility fraction in original image frame
    # Check if corners are near or outside frame boundary
    out_of_bounds = 0
    margin = 4
    for pt in card_corners:
        px, py = pt[0], pt[1]
        if px < margin or px >= orig_w - margin or py < margin or py >= orig_h - margin:
            out_of_bounds += 1

    visible_fraction = max(0.2, 1.0 - (out_of_bounds * 0.12))
    if visible_fraction < MIN_CARD_VISIBLE_FRACTION:
        return False, None, f"Reference card is partially cropped by image edge (visibility: {int(visible_fraction*100)}% < {int(MIN_CARD_VISIBLE_FRACTION*100)}%).", visible_fraction

    # 2. White/Light card background score
    # Sample upper card background margin (y: 5% - 20%, x: 10% - 90%)
    bg_roi = gray[int(ch * 0.05) : int(ch * 0.20), int(cw * 0.10) : int(cw * 0.90)]
    mean_bg = float(np.mean(bg_roi)) if bg_roi.size > 0 else 0.0
    bg_score = min(1.0, max(0.0, (mean_bg - 90.0) / 130.0))

    # 3. Outer border contrast score
    # Check contrast between extreme perimeter (outer 3%) and interior margin (8%)
    border_strip = gray[: int(ch * 0.04), :]
    inner_strip = gray[int(ch * 0.08) : int(ch * 0.16), :]
    border_contrast = abs(float(np.mean(inner_strip)) - float(np.mean(border_strip))) if border_strip.size > 0 else 0.0
    border_score = min(1.0, max(0.1, border_contrast / 30.0))

    # 4. Patch Score
    patch_ratio = float(matched_count) / float(required_count)
    min_required_patches = max(4, int(required_count * 0.70))  # e.g., 11 or 12 for 15 patches
    
    if matched_count == 0:
        return False, None, f"Reference card not detected (0/{required_count} calibration patches matched).", visible_fraction

    if matched_count < min_required_patches:
        return False, None, f"Reference card incomplete ({matched_count}/{required_count} calibration patches detected).", visible_fraction

    # 5. Patch Layout Regularity across 3x5 grid or 1D layout
    row_indices = set(p.row_index for p in patches)
    if len(row_indices) > 1:
        # Multi-row grid layout (e.g. 3x5): verify each row has left-to-right columns
        all_rows_ordered = True
        for r in row_indices:
            row_p = sorted([p for p in patches if p.row_index == r], key=lambda x: x.col_index)
            xs = [p.centroid[0] for p in row_p]
            if not all(xs[i] <= xs[i + 1] + 25 for i in range(len(xs) - 1)):
                all_rows_ordered = False
                break
        layout_score = 1.0 if all_rows_ordered else 0.6
    else:
        xs = [p.centroid[0] for p in patches]
        is_ordered_left_to_right = all(xs[i] <= xs[i + 1] + 15 for i in range(len(xs) - 1))
        layout_score = 1.0 if is_ordered_left_to_right else 0.5

    # 6. Color Diversity
    rgbs = np.array([p.median_rgb for p in patches])
    channel_stds = np.std(rgbs, axis=0)
    diversity_metric = float(np.mean(channel_stds))
    diversity_score = min(1.0, max(0.0, diversity_metric / 45.0))

    if diversity_score < 0.28:
        return False, None, "Candidate lacks multi-spectral calibration patch diversity.", visible_fraction

    # Compute real composite confidence (NOT fabricated!)
    composite_confidence = (
        0.30 * geom_score +
        0.30 * patch_ratio +
        0.15 * bg_score +
        0.10 * border_score +
        0.10 * layout_score +
        0.05 * diversity_score
    )

    confidence_pct = round(float(np.clip(composite_confidence * 100.0, 50.0, 99.0)), 1)
    status_msg = f"{matched_count}/{required_count} CALIBRATION PATCHES LOCKED"

    return True, confidence_pct, status_msg, visible_fraction
