import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from .schemas import CalibrationResult, PatchMeasurement
from .patch_detector import rgb_to_lab, rgb_to_hex
from .ciede2000 import calculate_ciede2000

def compute_color_calibration(
    patches: List[PatchMeasurement],
    card_validated: bool
) -> CalibrationResult:
    """
    Computes real mathematical color calibration from detected reference patches.
    If the card is not validated, calibration FAILS CLOSED.
    """
    if not card_validated or not patches:
        return CalibrationResult(
            status="CALIBRATION_FAILED",
            patches_detected=0,
            correction_matrix=[[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
            average_delta_e=0.0,
            white_balance_k=None,
            patch_measurements=[],
            confidence=None,
        )

    matched_patches = [p for p in patches if p.matched]
    if len(matched_patches) < 4:
        return CalibrationResult(
            status="CALIBRATION_FAILED",
            patches_detected=len(matched_patches),
            correction_matrix=[[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
            average_delta_e=0.0,
            white_balance_k=None,
            patch_measurements=patches,
            confidence=None,
        )

    # Compute per-channel gains g_R, g_G, g_B
    gains_r, gains_g, gains_b = [], [], []

    for p in matched_patches:
        exp_r, exp_g, exp_b = [int(p.expected_hex[i:i+2], 16) for i in (1, 3, 5)]
        det_r, det_g, det_b = p.median_rgb

        if det_r > 5:
            gains_r.append(exp_r / float(det_r))
        if det_g > 5:
            gains_g.append(exp_g / float(det_g))
        if det_b > 5:
            gains_b.append(exp_b / float(det_b))

    gain_r = float(np.median(gains_r)) if gains_r else 1.0
    gain_g = float(np.median(gains_g)) if gains_g else 1.0
    gain_b = float(np.median(gains_b)) if gains_b else 1.0

    # Clamp gains to plausible physical illumination range [0.5, 2.0]
    gain_r = float(np.clip(gain_r, 0.5, 2.0))
    gain_g = float(np.clip(gain_g, 0.5, 2.0))
    gain_b = float(np.clip(gain_b, 0.5, 2.0))

    correction_matrix = [
        [round(gain_r, 3), 0.0, 0.0],
        [0.0, round(gain_g, 3), 0.0],
        [0.0, 0.0, round(gain_b, 3)],
    ]

    # Calculate calibrated residual Delta E across tiles
    residual_des = []
    for p in matched_patches:
        det_r, det_g, det_b = p.median_rgb
        cal_r = int(np.clip(round(det_r * gain_r), 0, 255))
        cal_g = int(np.clip(round(det_g * gain_g), 0, 255))
        cal_b = int(np.clip(round(det_b * gain_b), 0, 255))

        cal_lab = rgb_to_lab(cal_r, cal_g, cal_b)
        exp_lab = rgb_to_lab(*[int(p.expected_hex[i:i+2], 16) for i in (1, 3, 5)])
        residual_des.append(calculate_ciede2000(exp_lab, cal_lab))

    avg_residual_de = round(float(np.mean(residual_des)), 2) if residual_des else 0.0

    # Estimate Correlated Color Temperature from White/Grey patches
    white_patch = next((p for p in patches if "white" in p.name.lower()), None)
    cct_k = None
    if white_patch and white_patch.matched:
        rw, gw, bw = white_patch.median_rgb
        # McCamy's approximation
        X = rw * 0.4124 + gw * 0.3576 + bw * 0.1804
        Y = rw * 0.2126 + gw * 0.7152 + bw * 0.0722
        Z = rw * 0.0193 + gw * 0.1192 + bw * 0.9503
        sum_xyz = X + Y + Z
        if sum_xyz > 0.001:
            x_c = X / sum_xyz
            y_c = Y / sum_xyz
            n = (x_c - 0.3320) / (0.1858 - y_c + 1e-7)
            cct = 449.0 * (n ** 3) + 3525.0 * (n ** 2) + 6823.3 * n + 5520.33
            if 2000.0 <= cct <= 15000.0:
                cct_k = round(cct / 50.0) * 50.0

    status = "CALIBRATED" if avg_residual_de <= 4.5 else "CALIBRATION_MARGINAL"
    cal_conf = round(max(50.0, min(99.0, 100.0 - avg_residual_de * 4.0)), 1)

    return CalibrationResult(
        status=status,
        patches_detected=len(matched_patches),
        correction_matrix=correction_matrix,
        average_delta_e=avg_residual_de,
        white_balance_k=cct_k,
        patch_measurements=patches,
        confidence=cal_conf,
    )

def apply_calibration_to_rgb(raw_rgb: Tuple[int, int, int], matrix: List[List[float]]) -> Tuple[int, int, int]:
    """Applies the 3x3 affine color matrix to an RGB tuple."""
    r, g, b = raw_rgb
    cal_r = int(np.clip(round(r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2]), 0, 255))
    cal_g = int(np.clip(round(r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2]), 0, 255))
    cal_b = int(np.clip(round(r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2]), 0, 255))
    return (cal_r, cal_g, cal_b)
