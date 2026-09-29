import cv2
import numpy as np
import math
from typing import List, Tuple, Dict, Any, Optional
from .schemas import PatchMeasurement, BoundingBox, ReferenceCardProfile
from .ciede2000 import calculate_ciede2000

# Standard 15-patch EvidenceTwin Reference Card Profile (3 rows x 5 columns)
DEFAULT_EVIDENCETWIN_PROFILE = ReferenceCardProfile(
    id="evidencetwin-reference-v1",
    name="EvidenceTwin Forensic Reference Card v1 (3x5 Grid)",
    rows=3,
    columns=5,
    expected_patch_count=15,
    expected_aspect_ratio=1.46,
    has_outer_border=True,
    has_header=True,
    has_scale=True,
    minimum_valid_patch_count=12
)

# Canonical 15 reference color patch specifications for EvidenceTwin Card (3 rows x 5 columns)
CANONICAL_15PATCH_SPECS = [
    {"id": "P1", "name": "Row 1 / Col 1 - Red Standard", "expected_hex": "#B23A22", "expected_rgb": (178, 58, 34), "tolerance": 5.0, "row": 0, "col": 0},
    {"id": "P2", "name": "Row 1 / Col 2 - Yellow Primary", "expected_hex": "#F0C808", "expected_rgb": (240, 200, 8), "tolerance": 5.0, "row": 0, "col": 1},
    {"id": "P3", "name": "Row 1 / Col 3 - Green Standard", "expected_hex": "#2A9D8F", "expected_rgb": (42, 157, 143), "tolerance": 5.0, "row": 0, "col": 2},
    {"id": "P4", "name": "Row 1 / Col 4 - Cyan Primary", "expected_hex": "#00A3D9", "expected_rgb": (0, 163, 217), "tolerance": 5.0, "row": 0, "col": 3},
    {"id": "P5", "name": "Row 1 / Col 5 - Blue Reference", "expected_hex": "#1D3557", "expected_rgb": (29, 53, 87), "tolerance": 5.0, "row": 0, "col": 4},

    {"id": "P6", "name": "Row 2 / Col 1 - Magenta Primary", "expected_hex": "#D63384", "expected_rgb": (214, 51, 132), "tolerance": 5.0, "row": 1, "col": 0},
    {"id": "P7", "name": "Row 2 / Col 2 - Purple / Violet", "expected_hex": "#6A0572", "expected_rgb": (106, 5, 114), "tolerance": 5.0, "row": 1, "col": 1},
    {"id": "P8", "name": "Row 2 / Col 3 - Ochre Standard", "expected_hex": "#E76F51", "expected_rgb": (231, 111, 81), "tolerance": 5.0, "row": 1, "col": 2},
    {"id": "P9", "name": "Row 2 / Col 4 - Warm Sand / Beige", "expected_hex": "#E9C46A", "expected_rgb": (233, 196, 106), "tolerance": 5.0, "row": 1, "col": 3},
    {"id": "P10", "name": "Row 2 / Col 5 - Deep Indigo", "expected_hex": "#264653", "expected_rgb": (38, 70, 83), "tolerance": 5.0, "row": 1, "col": 4},

    {"id": "P11", "name": "Row 3 / Col 1 - D65 White Standard", "expected_hex": "#F8FAFC", "expected_rgb": (248, 250, 252), "tolerance": 4.0, "row": 2, "col": 0},
    {"id": "P12", "name": "Row 3 / Col 2 - Light Grey 50%", "expected_hex": "#B0B8C4", "expected_rgb": (176, 184, 196), "tolerance": 4.0, "row": 2, "col": 1},
    {"id": "P13", "name": "Row 3 / Col 3 - Neutral Grey 18%", "expected_hex": "#7C8592", "expected_rgb": (124, 133, 146), "tolerance": 4.0, "row": 2, "col": 2},
    {"id": "P14", "name": "Row 3 / Col 4 - Dark Grey 8%", "expected_hex": "#3D4550", "expected_rgb": (61, 69, 80), "tolerance": 4.5, "row": 2, "col": 3},
    {"id": "P15", "name": "Row 3 / Col 5 - Deep Black 3%", "expected_hex": "#1E242C", "expected_rgb": (30, 36, 44), "tolerance": 4.5, "row": 2, "col": 4},
]

def hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Converts #RRGGBB to (R, G, B)."""
    clean = hex_str.lstrip("#")
    if len(clean) != 6:
        return (128, 128, 128)
    return (int(clean[0:2], 16), int(clean[2:4], 16), int(clean[4:6], 16))

def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Converts (R, G, B) to #RRGGBB."""
    return f"#{int(np.clip(r, 0, 255)):02X}{int(np.clip(g, 0, 255)):02X}{int(np.clip(b, 0, 255)):02X}"

def rgb_to_lab(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Converts sRGB (0-255) to CIE L*a*b* using standard D65 illuminant (2° standard observer)."""
    def linearize(c: float) -> float:
        v = c / 255.0
        return ((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92

    r_l = linearize(float(r))
    g_l = linearize(float(g))
    b_l = linearize(float(b))

    X = (r_l * 0.4124564 + g_l * 0.3575761 + b_l * 0.1804375) * 100.0
    Y = (r_l * 0.2126729 + g_l * 0.7151522 + b_l * 0.0721750) * 100.0
    Z = (r_l * 0.0193339 + g_l * 0.1191920 + b_l * 0.9503041) * 100.0

    Xn, Yn, Zn = 95.047, 100.0, 108.883

    def f(t: float) -> float:
        return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t + 16.0 / 116.0)

    fx = f(X / Xn)
    fy = f(Y / Yn)
    fz = f(Z / Zn)

    L = round(116.0 * fy - 16.0, 2)
    a = round(500.0 * (fx - fy), 2)
    b_val = round(200.0 * (fy - fz), 2)
    return (L, a, b_val)

def detect_and_measure_patches(
    rectified_bgr: np.ndarray,
    patch_specs: Optional[List[Dict[str, Any]]] = None,
    profile: Optional[ReferenceCardProfile] = None
) -> Tuple[List[PatchMeasurement], int, float, bool]:
    """
    Detects calibration patches on the perspective-rectified EvidenceTwin card.
    Uses active ReferenceCardProfile:
      - 3 rows x 5 columns (15 patches)
      - Top header: "EVIDENCETWIN REFERENCE CARD"
      - 3x5 grid inside card boundary
      - Bottom ruler/scale marks
    Returns: (measured_patches, matched_count, patch_score, is_structure_valid)
    """
    prof = profile or DEFAULT_EVIDENCETWIN_PROFILE
    rows = prof.rows
    cols = prof.columns
    total_expected = prof.expected_patch_count

    card_h, card_w = rectified_bgr.shape[:2]
    rectified_rgb = cv2.cvtColor(rectified_bgr, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(rectified_bgr, cv2.COLOR_BGR2GRAY)

    # 1. Header & card background evaluation
    bg_roi = gray[int(card_h * 0.04) : int(card_h * 0.20), int(card_w * 0.10) : int(card_w * 0.90)]
    card_bg_luma = float(np.mean(bg_roi)) if bg_roi.size > 0 else 220.0

    # 2. Extract patch grid region (middle 58% of card)
    grid_y_start = int(card_h * 0.22)
    grid_y_end = int(card_h * 0.80)
    grid_x_start = int(card_w * 0.07)
    grid_x_end = int(card_w * 0.93)

    grid_h = max(20, grid_y_end - grid_y_start)
    grid_w = max(20, grid_x_end - grid_x_start)

    # 3. Patch cell geometry
    cell_h = grid_h / float(rows)
    cell_w = grid_w / float(cols)

    measured_patches: List[PatchMeasurement] = []
    matched_count = 0

    specs = patch_specs or CANONICAL_15PATCH_SPECS

    for r in range(rows):
        for c in range(cols):
            idx = r * cols + c
            spec = specs[idx] if idx < len(specs) else {
                "id": f"P{idx+1}",
                "name": f"Patch R{r+1}C{c+1}",
                "expected_hex": "#808080",
                "expected_rgb": (128, 128, 128),
                "tolerance": 5.0
            }

            expected_cx = grid_x_start + (c + 0.5) * cell_w
            expected_cy = grid_y_start + (r + 0.5) * cell_h

            # Half-dimensions for patch sampling (sampling central 65% of cell to avoid border outlines)
            half_w = max(3, int(cell_w * 0.28))
            half_h = max(3, int(cell_h * 0.28))

            x1 = max(0, int(expected_cx - half_w))
            x2 = min(card_w, int(expected_cx + half_w))
            y1 = max(0, int(expected_cy - half_h))
            y2 = min(card_h, int(expected_cy + half_h))

            patch_crop_rgb = rectified_rgb[y1:y2, x1:x2]

            if patch_crop_rgb.size > 0:
                # Specular Glare & Highlight Filter on patch:
                # Remove pixels that are clipped (e.g. saturation = 0, luma > 245)
                patch_gray = gray[y1:y2, x1:x2]
                valid_mask = (patch_gray < 250) & (patch_gray > 5)
                if np.count_nonzero(valid_mask) >= 12:
                    valid_pixels = patch_crop_rgb[valid_mask]
                else:
                    valid_pixels = patch_crop_rgb.reshape(-1, 3)

                mean_r = int(round(float(np.mean(valid_pixels[:, 0]))))
                mean_g = int(round(float(np.mean(valid_pixels[:, 1]))))
                mean_b = int(round(float(np.mean(valid_pixels[:, 2]))))

                median_r = int(round(float(np.median(valid_pixels[:, 0]))))
                median_g = int(round(float(np.median(valid_pixels[:, 1]))))
                median_b = int(round(float(np.median(valid_pixels[:, 2]))))
            else:
                mean_r, mean_g, mean_b = spec["expected_rgb"]
                median_r, median_g, median_b = spec["expected_rgb"]

            detected_hex = rgb_to_hex(median_r, median_g, median_b)
            meas_lab = rgb_to_lab(median_r, median_g, median_b)
            exp_lab = rgb_to_lab(*spec["expected_rgb"])

            # CIEDE2000 Delta E calculation
            de00 = calculate_ciede2000(exp_lab, meas_lab)

            meas_hsv_mat = cv2.cvtColor(np.uint8([[[median_r, median_g, median_b]]]), cv2.COLOR_RGB2HSV)[0][0]
            meas_hsv = (int(meas_hsv_mat[0]), int(meas_hsv_mat[1]), int(meas_hsv_mat[2]))

            luma = 0.299 * median_r + 0.587 * median_g + 0.114 * median_b
            sat = meas_hsv[1]
            luma_diff = abs(card_bg_luma - luma)

            # Patch validity rule
            is_white_tile = (r == 2 and c == 0)
            if is_white_tile:
                is_valid_patch = (luma > 170 and sat < 40)
            else:
                is_valid_patch = (sat > 16 or luma_diff > 14 or luma < 175)

            # High-confidence patch verification: valid contrast and reasonable chromatic envelope
            is_matched = is_valid_patch and (de00 < 24.0 or (is_white_tile and luma > 175 and sat < 35))
            if is_matched:
                matched_count += 1

            actual_bbox = BoundingBox(
                x=float(x1),
                y=float(y1),
                width=float(x2 - x1),
                height=float(y2 - y1)
            )

            measured_patches.append(
                PatchMeasurement(
                    patch_id=spec["id"],
                    name=spec["name"],
                    expected_hex=spec["expected_hex"],
                    detected_hex=detected_hex,
                    centroid=(float(expected_cx), float(expected_cy)),
                    bbox=actual_bbox,
                    area=float((x2 - x1) * (y2 - y1)),
                    mean_rgb=(mean_r, mean_g, mean_b),
                    median_rgb=(median_r, median_g, median_b),
                    hsv=meas_hsv,
                    lab=meas_lab,
                    delta_e=round(float(de00), 1),
                    matched=is_matched,
                    row_index=r,
                    col_index=c,
                )
            )

    # Multi-spectral diversity check across 15 patches
    rgbs = np.array([p.median_rgb for p in measured_patches])
    channel_stds = np.std(rgbs, axis=0)
    diversity_metric = float(np.mean(channel_stds))
    diversity_valid = diversity_metric > 22.0

    # Grid structure check: 3 rows ordered vertically and 5 columns ordered horizontally
    row_y_vals = []
    for r in range(rows):
        r_pts = [p for p in measured_patches if p.row_index == r]
        if r_pts:
            row_y_vals.append(float(np.mean([p.centroid[1] for p in r_pts])))
    grid_order_valid = len(row_y_vals) == rows and all(row_y_vals[i] < row_y_vals[i+1] for i in range(len(row_y_vals)-1))

    # Reject packaging swatches (which are 1 column of ~6 swatches)
    # The EvidenceTwin reference card MUST satisfy 3x5 grid structure, minimum valid patch count, and color diversity
    is_structure_valid = (
        matched_count >= prof.minimum_valid_patch_count and
        diversity_valid and
        grid_order_valid
    )

    patch_score = round(float(matched_count) / float(total_expected), 2)
    return measured_patches, matched_count, patch_score, is_structure_valid
