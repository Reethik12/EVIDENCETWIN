import math
from typing import Tuple

def calculate_ciede2000(
    lab1: Tuple[float, float, float],
    lab2: Tuple[float, float, float],
    kL: float = 1.0,
    kC: float = 1.0,
    kH: float = 1.0
) -> float:
    """
    Computes exact CIEDE2000 (ΔE00) perceptual color difference between two CIE L*a*b* coordinates.
    Standardized according to CIE technical report 142-2001 and ISO/CIE 11664-6:2014.
    """
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2

    avg_L = (L1 + L2) / 2.0
    C1 = math.sqrt(a1 * a1 + b1 * b1)
    C2 = math.sqrt(a2 * a2 + b2 * b2)
    avg_C = (C1 + C2) / 2.0

    avg_C7 = avg_C ** 7
    G = 0.5 * (1.0 - math.sqrt(avg_C7 / (avg_C7 + 25.0 ** 7 + 1e-12)))

    a1_prime = (1.0 + G) * a1
    a2_prime = (1.0 + G) * a2

    C1_prime = math.sqrt(a1_prime * a1_prime + b1 * b1)
    C2_prime = math.sqrt(a2_prime * a2_prime + b2 * b2)
    avg_C_prime = (C1_prime + C2_prime) / 2.0

    h1_prime = math.degrees(math.atan2(b1, a1_prime)) % 360.0
    h2_prime = math.degrees(math.atan2(b2, a2_prime)) % 360.0

    if C1_prime * C2_prime == 0:
        dh_prime = 0.0
    elif abs(h1_prime - h2_prime) <= 180.0:
        dh_prime = h2_prime - h1_prime
    elif h2_prime <= h1_prime:
        dh_prime = h2_prime - h1_prime + 360.0
    else:
        dh_prime = h2_prime - h1_prime - 360.0

    delta_H_prime = 2.0 * math.sqrt(C1_prime * C2_prime) * math.sin(math.radians(dh_prime / 2.0))

    if C1_prime * C2_prime == 0:
        avg_h_prime = h1_prime + h2_prime
    elif abs(h1_prime - h2_prime) <= 180.0:
        avg_h_prime = (h1_prime + h2_prime) / 2.0
    elif (h1_prime + h2_prime) < 360.0:
        avg_h_prime = (h1_prime + h2_prime + 360.0) / 2.0
    else:
        avg_h_prime = (h1_prime + h2_prime - 360.0) / 2.0

    T = (
        1.0
        - 0.17 * math.cos(math.radians(avg_h_prime - 30.0))
        + 0.24 * math.cos(math.radians(2.0 * avg_h_prime))
        + 0.32 * math.cos(math.radians(3.0 * avg_h_prime + 6.0))
        - 0.20 * math.cos(math.radians(4.0 * avg_h_prime - 63.0))
    )

    delta_L_prime = L2 - L1
    delta_C_prime = C2_prime - C1_prime

    L_minus_50_sq = (avg_L - 50.0) ** 2
    S_L = 1.0 + (0.015 * L_minus_50_sq) / math.sqrt(20.0 + L_minus_50_sq)
    S_C = 1.0 + 0.045 * avg_C_prime
    S_H = 1.0 + 0.015 * avg_C_prime * T

    avg_C_prime7 = avg_C_prime ** 7
    delta_theta = 30.0 * math.exp(-(((avg_h_prime - 275.0) / 25.0) ** 2))
    R_C = 2.0 * math.sqrt(avg_C_prime7 / (avg_C_prime7 + 25.0 ** 7 + 1e-12))
    R_T = -math.sin(math.radians(2.0 * delta_theta)) * R_C

    vL = delta_L_prime / (kL * S_L)
    vC = delta_C_prime / (kC * S_C)
    vH = delta_H_prime / (kH * S_H)

    dE2 = vL * vL + vC * vC + vH * vH + R_T * vC * vH
    return round(float(math.sqrt(max(0.0, dE2))), 2)
