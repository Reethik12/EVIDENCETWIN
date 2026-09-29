import cv2
import numpy as np
from typing import Tuple, List, Optional

def order_quadrilateral_points(pts: np.ndarray) -> np.ndarray:
    """
    Orders 4 quadrilateral coordinates canonically:
    [top-left, top-right, bottom-right, bottom-left]
    """
    pts = pts.reshape(4, 2).astype(np.float32)
    ordered = np.zeros((4, 2), dtype=np.float32)

    # Sum of coordinates: Top-Left has smallest sum, Bottom-Right has largest sum
    s = pts.sum(axis=1)
    ordered[0] = pts[np.argmin(s)]
    ordered[2] = pts[np.argmax(s)]

    # Difference of coordinates: Top-Right has smallest diff (x > y), Bottom-Left has largest diff (y > x)
    diff = np.diff(pts, axis=1)
    ordered[1] = pts[np.argmin(diff)]
    ordered[3] = pts[np.argmax(diff)]

    return ordered

def compute_perspective_warp(
    image: np.ndarray,
    quad_corners: np.ndarray,
    target_width: Optional[int] = None,
    target_height: Optional[int] = None,
    enforce_horizontal: bool = True
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Applies cv2.getPerspectiveTransform and cv2.warpPerspective
    to rectify a tilted/trapezoidal/rotated quadrilateral into canonical rectangular view.
    Returns: (warped_image, transform_matrix, inverse_transform_matrix)
    """
    rect = order_quadrilateral_points(quad_corners)
    tl, tr, br, bl = rect

    # Calculate actual Euclidean widths and heights
    width_top = np.linalg.norm(tr - tl)
    width_bottom = np.linalg.norm(br - bl)
    max_w = int(max(width_top, width_bottom))

    height_left = np.linalg.norm(bl - tl)
    height_right = np.linalg.norm(br - tr)
    max_h = int(max(height_left, height_right))

    # Standard EvidenceTwin card is landscape (aspect ratio ~1.46: 190x130mm)
    # If the detected quad is portrait (card rotated 90 deg), normalize or orient horizontally
    if enforce_horizontal and max_h > max_w * 1.05:
        # Rotate points so longer dimension is horizontal
        rect = np.array([tr, br, bl, tl], dtype=np.float32)
        max_w, max_h = max_h, max_w

    out_w = target_width if target_width is not None else max(100, max_w)
    out_h = target_height if target_height is not None else max(70, max_h)

    dst = np.array([
        [0, 0],
        [out_w - 1, 0],
        [out_w - 1, out_h - 1],
        [0, out_h - 1]
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(rect, dst)
    M_inv = cv2.getPerspectiveTransform(dst, rect)

    warped = cv2.warpPerspective(image, M, (out_w, out_h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return warped, M, M_inv

def transform_point_to_original(pt_warped: Tuple[float, float], M_inv: np.ndarray) -> Tuple[float, float]:
    """Projects a point from canonical warped card space back into original image coordinates."""
    vec = np.array([pt_warped[0], pt_warped[1], 1.0], dtype=np.float32)
    mapped = M_inv.dot(vec)
    if mapped[2] != 0:
        return float(mapped[0] / mapped[2]), float(mapped[1] / mapped[2])
    return float(mapped[0]), float(mapped[1])
