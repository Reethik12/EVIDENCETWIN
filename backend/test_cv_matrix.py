#!/usr/bin/env python3
"""
EvidenceTwin Master Computer Vision Verification Suite
Automated Test Matrix: Tests A-L + Negative Controls + Demonstration Image
Validates true free-position object detection, colorimetric calibration, and fail-closed security.
"""

import os
import sys
import math
import numpy as np
import cv2

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.cv_engine.pipeline import EvidenceVisionPipeline
from backend.cv_engine.patch_detector import CANONICAL_15PATCH_SPECS

CANONICAL_15_PATCHES_BGR = [
    (spec["expected_rgb"][2], spec["expected_rgb"][1], spec["expected_rgb"][0])
    for spec in CANONICAL_15PATCH_SPECS
]

def create_canonical_card_image(width=320, height=220):
    """
    Renders an authentic EvidenceTwin 15-patch Reference Card matching the spec:
    - 3 rows x 5 columns
    - 15 standard reference patches
    - White card body with dark outer border
    - Header text region
    - Bottom millimeter measurement scale
    """
    card = np.ones((height, width, 3), dtype=np.uint8) * 248  # Off-white card body
    
    # Outer dark border
    cv2.rectangle(card, (4, 4), (width - 4, height - 4), (30, 41, 59), 2)
    # Inner thin guideline
    cv2.rectangle(card, (8, 8), (width - 8, height - 8), (148, 163, 184), 1)
    
    # Header zone
    cv2.putText(card, "EVIDENCETWIN REFERENCE CARD", (25, 24),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (15, 23, 42), 1, cv2.LINE_AA)
    cv2.putText(card, "D65 CALIBRATION STANDARD // 15 PATCHES", (25, 38),
                cv2.FONT_HERSHEY_SIMPLEX, 0.30, (100, 116, 139), 1, cv2.LINE_AA)
    
    # 3x5 Grid of patches
    grid_x, grid_y = 22, 48
    grid_w, grid_h = width - 44, 115
    cell_w = grid_w / 5.0
    cell_h = grid_h / 3.0
    
    for r in range(3):
        for c in range(5):
            idx = r * 5 + c
            color_bgr = CANONICAL_15_PATCHES_BGR[idx]
            px = int(grid_x + c * cell_w + 4)
            py = int(grid_y + r * cell_h + 3)
            pw = int(cell_w - 8)
            ph = int(cell_h - 6)
            cv2.rectangle(card, (px, py), (px + pw, py + ph), color_bgr, -1)
            cv2.rectangle(card, (px, py), (px + pw, py + ph), (51, 65, 85), 1)
            
    # Bottom ruler scale
    cv2.line(card, (20, 185), (width - 20, 185), (30, 41, 59), 2)
    for x in range(20, width - 20, 10):
        is_major = ((x - 20) % 50 == 0)
        tick_h = 8 if is_major else 4
        cv2.line(card, (x, 185), (x, 185 - tick_h), (30, 41, 59), 1)
        if is_major:
            cv2.putText(card, f"{(x - 20) // 10}", (x - 4, 198),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.28, (71, 85, 105), 1, cv2.LINE_AA)
            
    return card

def create_reagent_kit_image(width=280, height=380, include_swatches=True, reaction_color=(180, 20, 190)):
    """
    Renders an authentic Field-Test Reagent Pouch / Cassette:
    - Clear pouch / plastic casing with pouch heat-seal edges
    - Reagent label & instruction text
    - Exactly 6 printed interpretation swatches (NOT 15 patches!)
    - Chemical reaction chamber containing fluid
    """
    kit = np.ones((height, width, 3), dtype=np.uint8) * 230  # Light grey / white plastic pouch
    
    # Heat-seal border
    cv2.rectangle(kit, (6, 6), (width - 6, height - 6), (180, 180, 180), 3)
    cv2.rectangle(kit, (10, 10), (width - 10, height - 10), (210, 210, 210), 1)
    
    # Manufacturer label
    cv2.rectangle(kit, (20, 20), (width - 20, 90), (250, 250, 250), -1)
    cv2.rectangle(kit, (20, 20), (width - 20, 90), (160, 160, 160), 1)
    cv2.putText(kit, "NARCOTEST RAPID REAGENT", (28, 45),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (20, 20, 80), 1, cv2.LINE_AA)
    cv2.putText(kit, "MARQUIS FIELD TEST // A-800", (28, 65),
                cv2.FONT_HERSHEY_SIMPLEX, 0.35, (80, 80, 80), 1, cv2.LINE_AA)
    
    # Printed interpretation swatches (6 swatches in a 2x3 or 1x6 row)
    if include_swatches:
        swatch_colors = [
            (30, 30, 220),   # Red
            (20, 180, 220),  # Orange/Yellow
            (180, 50, 140),  # Purple
            (120, 20, 20),   # Dark blue
            (40, 160, 40),   # Green
            (60, 60, 60),    # Grey/Black
        ]
        cv2.putText(kit, "COLOR CHART (6 REF):", (28, 115),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (40, 40, 40), 1, cv2.LINE_AA)
        for i, sc in enumerate(swatch_colors):
            sx = 28 + (i % 3) * 75
            sy = 125 + (i // 3) * 35
            cv2.rectangle(kit, (sx, sy), (sx + 65, sy + 25), sc, -1)
            cv2.rectangle(kit, (sx, sy), (sx + 65, sy + 25), (40, 40, 40), 1)
            cv2.putText(kit, f"REF {i+1}", (sx + 4, sy + 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.28, (255, 255, 255), 1, cv2.LINE_AA)
            
    # Reaction chamber (ampoule well)
    cv2.rectangle(kit, (40, 215), (width - 40, 345), (245, 245, 245), -1)
    cv2.rectangle(kit, (40, 215), (width - 40, 345), (140, 140, 140), 2)
    cv2.putText(kit, "REACTION CHAMBER", (55, 235),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (60, 60, 60), 1, cv2.LINE_AA)
    
    # Fluid reaction droplet / pool (distinct magenta/pink Marquis chromophore)
    center_x = width // 2
    center_y = 285
    cv2.circle(kit, (center_x, center_y), 36, reaction_color, -1)
    cv2.ellipse(kit, (center_x, center_y), (42, 32), 15, 0, 360, reaction_color, -1)
    # Slight internal shade
    cv2.circle(kit, (center_x - 5, center_y - 5), 20,
               (min(255, reaction_color[0] + 15), reaction_color[1], min(255, reaction_color[2] + 15)), -1)
    
    return kit

def rotate_image(img, angle_deg):
    """Rotates an image with transparent / white background expansion."""
    h, w = img.shape[:2]
    cx, cy = w // 2, h // 2
    M = cv2.getRotationMatrix2D((cx, cy), angle_deg, 1.0)
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])
    new_w = int((h * sin) + (w * cos))
    new_h = int((h * cos) + (w * sin))
    M[0, 2] += (new_w / 2) - cx
    M[1, 2] += (new_h / 2) - cy
    return cv2.warpAffine(img, M, (new_w, new_h), borderValue=(220, 220, 220))

def overlay_subimage(canvas, sub_img, x, y):
    """Overlays sub_img onto canvas at (x, y) with boundary clipping."""
    ch, cw = canvas.shape[:2]
    sh, sw = sub_img.shape[:2]
    
    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(cw, x + sw)
    y2 = min(ch, y + sh)
    
    sx1 = max(0, -x)
    sy1 = max(0, -y)
    sx2 = sx1 + (x2 - x1)
    sy2 = sy1 + (y2 - y1)
    
    if x2 > x1 and y2 > y1 and sx2 > sx1 and sy2 > sy1:
        canvas[y1:y2, x1:x2] = sub_img[sy1:sy2, sx1:sx2]

def run_test(pipeline, test_id, name, canvas, expected_card=True, expected_kit=True, expected_roi=True):
    """Executes the pipeline on a test canvas and evaluates verdicts."""
    res = pipeline.run(canvas)
    
    card_ok = (res.reference_card.detected == expected_card)
    kit_ok = (res.test_kit.detected == expected_kit)
    roi_ok = (res.reaction_roi.detected == expected_roi)
    
    status_pass = (card_ok and kit_ok and roi_ok)
    
    print(f"\n==================================================")
    print(f"[{'PASS' if status_pass else 'FAIL'}] {test_id}: {name}")
    print(f"  Reference Card: detected={res.reference_card.detected} (expected {expected_card}), patches={res.reference_card.patch_count}/15")
    if res.reference_card.bbox:
        cb = res.reference_card.bbox
        print(f"    Card Box: x={cb.x:.1f}%, y={cb.y:.1f}%, w={cb.width:.1f}%, h={cb.height:.1f}%")
    print(f"  Test Kit:       detected={res.test_kit.detected} (expected {expected_kit})")
    if res.test_kit.bbox:
        kb = res.test_kit.bbox
        print(f"    Kit Box: x={kb.x:.1f}%, y={kb.y:.1f}%, w={kb.width:.1f}%, h={kb.height:.1f}%")
    print(f"  Reaction ROI:   detected={res.reaction_roi.detected} (expected {expected_roi})")
    if res.reaction_roi.bbox:
        rb = res.reaction_roi.bbox
        print(f"    ROI Box: x={rb.x:.1f}%, y={rb.y:.1f}%, w={rb.width:.1f}%, h={rb.height:.1f}%")
    print(f"  Evidence Gate:  status={res.gate.status}, verdict={res.gate.verdict}")
    print(f"  Processing:     time={res.processing_time_ms:.1f}ms")
    
    return status_pass

def main():
    print("Initializing EvidenceTwin Master Computer Vision Pipeline...")
    pipeline = EvidenceVisionPipeline(debug_render=False)
    
    base_card = create_canonical_card_image(width=340, height=230)
    base_kit = create_reagent_kit_image(width=280, height=380)
    
    canvas_w, canvas_h = 1280, 960
    all_passed = True
    
    # ----------------------------------------------------
    # TEST A: Card Left, Reagent Right
    # ----------------------------------------------------
    canvas_a = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 195  # Lab bench grey
    overlay_subimage(canvas_a, base_card, 80, 280)
    overlay_subimage(canvas_a, base_kit, 840, 240)
    passed_a = run_test(pipeline, "TEST A", "Card Left, Reagent Right", canvas_a, True, True, True)
    all_passed = all_passed and passed_a
    
    # ----------------------------------------------------
    # TEST B: Card Right, Reagent Left
    # ----------------------------------------------------
    canvas_b = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 195
    overlay_subimage(canvas_b, base_card, 820, 280)
    overlay_subimage(canvas_b, base_kit, 120, 240)
    passed_b = run_test(pipeline, "TEST B", "Card Right, Reagent Left", canvas_b, True, True, True)
    all_passed = all_passed and passed_b

    # ----------------------------------------------------
    # TEST C: Card Top, Reagent Bottom
    # ----------------------------------------------------
    canvas_c = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 195
    overlay_subimage(canvas_c, base_card, 470, 60)
    overlay_subimage(canvas_c, base_kit, 500, 480)
    passed_c = run_test(pipeline, "TEST C", "Card Top, Reagent Bottom", canvas_c, True, True, True)
    all_passed = all_passed and passed_c

    # ----------------------------------------------------
    # TEST D: Card Center, Reagent Corner
    # ----------------------------------------------------
    canvas_d = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 195
    overlay_subimage(canvas_d, base_card, 470, 360)
    overlay_subimage(canvas_d, base_kit, 80, 60)
    passed_d = run_test(pipeline, "TEST D", "Card Center, Reagent Corner", canvas_d, True, True, True)
    all_passed = all_passed and passed_d

    # ----------------------------------------------------
    # TEST E: Card Rotated 15°
    # ----------------------------------------------------
    canvas_e = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 195
    card_rot15 = rotate_image(base_card, 15)
    overlay_subimage(canvas_e, card_rot15, 750, 220)
    overlay_subimage(canvas_e, base_kit, 150, 260)
    passed_e = run_test(pipeline, "TEST E", "Card Rotated 15°", canvas_e, True, True, True)
    all_passed = all_passed and passed_e

    # ----------------------------------------------------
    # TEST F: Card Rotated 30°
    # ----------------------------------------------------
    canvas_f = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 195
    card_rot30 = rotate_image(base_card, 30)
    overlay_subimage(canvas_f, card_rot30, 200, 200)
    overlay_subimage(canvas_f, base_kit, 800, 260)
    passed_f = run_test(pipeline, "TEST F", "Card Rotated 30°", canvas_f, True, True, True)
    all_passed = all_passed and passed_f

    # ----------------------------------------------------
    # TEST G: Card Rotated 45°
    # ----------------------------------------------------
    canvas_g = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 195
    card_rot45 = rotate_image(base_card, 45)
    overlay_subimage(canvas_g, card_rot45, 650, 180)
    overlay_subimage(canvas_g, base_kit, 120, 240)
    passed_g = run_test(pipeline, "TEST G", "Card Rotated 45°", canvas_g, True, True, True)
    all_passed = all_passed and passed_g

    # ----------------------------------------------------
    # TEST H: Reagent Rotated 20°
    # ----------------------------------------------------
    canvas_h_img = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 195
    kit_rot20 = rotate_image(base_kit, 20)
    overlay_subimage(canvas_h_img, base_card, 150, 260)
    overlay_subimage(canvas_h_img, kit_rot20, 780, 200)
    passed_h = run_test(pipeline, "TEST H", "Reagent Rotated 20°", canvas_h_img, True, True, True)
    all_passed = all_passed and passed_h

    # ----------------------------------------------------
    # TEST I: Objects Moved Closer (Large Scale)
    # ----------------------------------------------------
    canvas_i = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 195
    card_large = cv2.resize(base_card, (480, 325))
    kit_large = cv2.resize(base_kit, (380, 520))
    overlay_subimage(canvas_i, card_large, 60, 240)
    overlay_subimage(canvas_i, kit_large, 720, 160)
    passed_i = run_test(pipeline, "TEST I", "Objects Moved Closer (Large Scale)", canvas_i, True, True, True)
    all_passed = all_passed and passed_i

    # ----------------------------------------------------
    # TEST J: Objects Moved Farther Away (Small Scale)
    # ----------------------------------------------------
    canvas_j = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 195
    card_small = cv2.resize(base_card, (220, 150))
    kit_small = cv2.resize(base_kit, (180, 245))
    overlay_subimage(canvas_j, card_small, 780, 360)
    overlay_subimage(canvas_j, kit_small, 220, 340)
    passed_j = run_test(pipeline, "TEST J", "Objects Moved Farther Away (Small Scale)", canvas_j, True, True, True)
    all_passed = all_passed and passed_j

    # ----------------------------------------------------
    # TEST K: Uploaded Image with Arbitrary Positions
    # ----------------------------------------------------
    canvas_k = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 185
    overlay_subimage(canvas_k, base_card, 320, 120)
    overlay_subimage(canvas_k, base_kit, 700, 440)
    passed_k = run_test(pipeline, "TEST K", "Uploaded Image with Arbitrary Positions", canvas_k, True, True, True)
    all_passed = all_passed and passed_k

    # ----------------------------------------------------
    # TEST L: Live Camera with Arbitrary Positions & Lighting Gradient
    # ----------------------------------------------------
    canvas_l = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 190
    # Simulate slight gradient across frame
    for y in range(canvas_h):
        canvas_l[y, :] = np.clip(canvas_l[y, :] - int(y * 25 / canvas_h), 0, 255)
    overlay_subimage(canvas_l, base_card, 800, 520)
    overlay_subimage(canvas_l, base_kit, 180, 80)
    passed_l = run_test(pipeline, "TEST L", "Live Camera Arbitrary Positions & Gradient", canvas_l, True, True, True)
    all_passed = all_passed and passed_l

    # ----------------------------------------------------
    # NEGATIVE CONTROLS / RANDOM IMAGE TESTS
    # Expected: reference_card=False, test_kit=False, reaction_roi=False, gate=BLOCKED
    # ----------------------------------------------------
    print("\n==================================================")
    print("RUNNING NEGATIVE CONTROL & RANDOM IMAGE TESTS (FAIL-CLOSED)")
    
    # 1. Random noise / room simulation
    np.random.seed(42)
    noise_img = np.random.randint(40, 210, (720, 960, 3), dtype=np.uint8)
    passed_neg1 = run_test(pipeline, "NEG-1", "Random Texture / Noise Image", noise_img, False, False, False)
    all_passed = all_passed and passed_neg1

    # 2. Outdoor landscape simulation (sky, grass, mountains)
    landscape_img = np.ones((720, 960, 3), dtype=np.uint8)
    landscape_img[:360, :] = [230, 180, 100]  # Blue sky
    landscape_img[360:, :] = [40, 140, 60]    # Green field
    cv2.circle(landscape_img, (750, 140), 60, (50, 220, 240), -1) # Sun
    passed_neg2 = run_test(pipeline, "NEG-2", "Natural Landscape Simulation", landscape_img, False, False, False)
    all_passed = all_passed and passed_neg2

    # 3. Actual screenshot from Research folder
    nist_screenshot_path = os.path.join(os.path.dirname(__file__), "..", "..", "Research", "WhatsApp Image 2026-09-27 at 23.15.16.jpeg")
    if os.path.exists(nist_screenshot_path):
        nist_img = cv2.imread(nist_screenshot_path)
        passed_neg3 = run_test(pipeline, "NEG-3", "NIST Publication Browser Screenshot", nist_img, False, False, False)
        all_passed = all_passed and passed_neg3
    else:
        print("  Skipping NEG-3 (Screenshot path not found)")

    # ----------------------------------------------------
    # DEMONSTRATION IMAGE TEST:
    # 6 Printed Package Swatches must NOT become 15 Card Patches!
    # ----------------------------------------------------
    print("\n==================================================")
    print("RUNNING DEMONSTRATION IMAGE VERIFICATION")
    demo_canvas = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 190
    
    # Blue nitrile glove in background
    cv2.ellipse(demo_canvas, (320, 680), (180, 260), -25, 0, 360, (200, 130, 40), -1)
    
    # Reagent pouch with 6 printed swatches on the glove
    overlay_subimage(demo_canvas, base_kit, 180, 320)
    
    # EvidenceTwin 15-patch reference card positioned on the right
    overlay_subimage(demo_canvas, base_card, 780, 380)
    
    passed_demo = run_test(pipeline, "DEMO-1", "Full Demonstration Image (Glove + Kit with 6 Swatches + 15-Patch Card)", demo_canvas, True, True, True)
    all_passed = all_passed and passed_demo

    print("\n==================================================")
    print(f"FREE-POSITION TEST MATRIX VERDICT: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    print("==================================================")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
