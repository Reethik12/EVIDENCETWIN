import time
import base64
import cv2
import numpy as np
from typing import Optional, List, Dict, Any, Tuple

from .schemas import (
    BoundingBox,
    PatchMeasurement,
    ReferenceCardResult,
    ReferenceCardProfile,
    TestKitResult,
    ReactionROIResult,
    QualityAssessment,
    CalibrationResult,
    EvidenceGateResult,
    VisionPipelineResponse,
    ManualInspectionRequest,
)
from .preprocessing import load_image_from_input, PreprocessedEvidence, encode_image_to_base64
from .card_detector import generate_card_candidates, CardCandidate
from .test_kit_detector import detect_field_test_kit, TestKitCandidate
from .perspective import compute_perspective_warp, order_quadrilateral_points
from .patch_detector import detect_and_measure_patches, DEFAULT_EVIDENCETWIN_PROFILE
from .validation import validate_card_structure
from .quality import assess_image_quality
from .calibration import compute_color_calibration
from .reaction_roi import detect_or_validate_reaction_roi

class EvidenceVisionPipeline:
    """
    Central OpenCV Computer Vision Pipeline for EvidenceTwin.
    True Free-Position Computer Vision:
    Discovers Reference Card, Field-Test Reagent Package, and Reaction Region
    ANYWHERE in the frame without fixed-box assumptions.
    """

    def __init__(self, debug_render: bool = True):
        self.debug_render = debug_render

    def run(
        self,
        image_input: str,
        manual_roi_bbox: Optional[BoundingBox] = None,
        manual_card_bbox: Optional[BoundingBox] = None,
        kit_id: Optional[str] = "kit-fentanyl-strip",
        profile: Optional[ReferenceCardProfile] = None
    ) -> VisionPipelineResponse:
        start_time = time.time()
        prof = profile or DEFAULT_EVIDENCETWIN_PROFILE
        required_count = prof.expected_patch_count

        # Step 1: Decode image input
        try:
            raw_bgr = load_image_from_input(image_input)
        except Exception as e:
            return VisionPipelineResponse(
                status="IMAGE_INVALID",
                reference_card=ReferenceCardResult(detected=False, confidence=None, required_patch_count=required_count, status_message=f"Decode error: {str(e)}"),
                test_kit=TestKitResult(detected=False, status_message="Image could not be decoded"),
                calibration=CalibrationResult(status="CALIBRATION_FAILED", patches_detected=0, confidence=None),
                reaction_roi=ReactionROIResult(detected=False, confidence=None, selection_notes="Image could not be decoded"),
                quality=QualityAssessment(status="UNSUITABLE"),
                gate=EvidenceGateResult(
                    passed=False,
                    verdict="BLOCKED",
                    status="IMAGE_INVALID",
                    reasons=[f"Image decode failure: {str(e)}"],
                    required_actions=["Upload a valid JPEG, PNG, or WebP evidence photograph."]
                ),
                processing_time_ms=round((time.time() - start_time) * 1000, 1),
            )

        orig_h, orig_w = raw_bgr.shape[:2]

        # Step 2: Image Preprocessing
        prep = PreprocessedEvidence(raw_bgr, max_dim=1200)
        proc_bgr = prep.processed_bgr
        proc_h, proc_w = prep.proc_h, prep.proc_w

        # Step 3: Candidate Card Detection across entire image
        candidates = generate_card_candidates(
            gray=prep.gray,
            clahe_gray=prep.clahe_gray,
            manual_box=manual_card_bbox
        )

        best_candidate: Optional[CardCandidate] = None
        best_patches: List[PatchMeasurement] = []
        best_rectified: Optional[np.ndarray] = None
        best_matched_count = 0
        best_confidence: Optional[float] = None
        best_status_msg = "EVIDENCETWIN REFERENCE CARD NOT DETECTED"
        best_visible_fraction = 0.0
        best_corners_orig: Optional[List[Tuple[float, float]]] = None
        best_polygon_norm: Optional[List[Tuple[float, float]]] = None
        best_bbox_norm: Optional[BoundingBox] = None
        stage_results: Dict[str, str] = {
            "card_candidate": "FAIL",
            "perspective_rectification": "FAIL",
            "patch_grid": f"0/{required_count}",
            "structure_validation": "FAIL",
            "calibration": "BLOCKED"
        }

        # Step 4: Evaluate card candidates anywhere in the image
        for cand in candidates:
            # Warp candidate according to aspect ratio (square: 320x320, landscape: 320x220)
            asp = getattr(cand, "aspect_ratio", 1.46)
            is_square = 0.82 <= asp <= 1.22
            target_h = 320 if is_square else 220
            warped, M, M_inv = compute_perspective_warp(proc_bgr, cand.corners, target_width=320, target_height=target_h)

            # Test 4 cardinal orientations: 0°, 90°, 180°, 270° in canonical space
            orientations = [
                (0, warped),
                (90, cv2.resize(cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE), (320, target_h))),
                (180, cv2.rotate(warped, cv2.ROTATE_180)),
                (270, cv2.resize(cv2.rotate(warped, cv2.ROTATE_90_COUNTERCLOCKWISE), (320, target_h)))
            ]

            best_rot_matched = -1
            warped_chosen = warped
            patches_chosen = []
            matched_chosen = 0
            score_chosen = 0.0
            winning_rot = 0

            for rot_deg, w_img in orientations:
                p_list, m_cnt, sc, vld = detect_and_measure_patches(w_img, profile=prof)
                if m_cnt > best_rot_matched:
                    best_rot_matched = m_cnt
                    warped_chosen = w_img
                    patches_chosen = p_list
                    matched_chosen = m_cnt
                    score_chosen = sc
                    winning_rot = rot_deg

            # Scale corners back to original image space
            corners_orig_raw = []
            for pt in cand.corners:
                ox = float(pt[0] * prep.inv_scale)
                oy = float(pt[1] * prep.inv_scale)
                corners_orig_raw.append((round(ox, 1), round(oy, 1)))

            # Adjust corner sequence according to winning rotation
            if winning_rot == 90:
                corners_orig = [corners_orig_raw[1], corners_orig_raw[2], corners_orig_raw[3], corners_orig_raw[0]]
            elif winning_rot == 180:
                corners_orig = [corners_orig_raw[2], corners_orig_raw[3], corners_orig_raw[0], corners_orig_raw[1]]
            elif winning_rot == 270:
                corners_orig = [corners_orig_raw[3], corners_orig_raw[0], corners_orig_raw[1], corners_orig_raw[2]]
            else:
                corners_orig = corners_orig_raw

            # Validate card structure (multi-signal: grid, count, spacing, aspect, border)
            is_confirmed, conf, status_msg, vis_frac = validate_card_structure(
                rectified_bgr=warped_chosen,
                patches=patches_chosen,
                matched_count=matched_chosen,
                required_count=required_count,
                geom_score=cand.score,
                orig_w=orig_w,
                orig_h=orig_h,
                card_corners=np.array(corners_orig, dtype=np.float32)
            )

            is_better_match = (
                (matched_chosen > best_matched_count) or
                (matched_chosen == best_matched_count and is_confirmed and not best_candidate)
            )

            if is_better_match:
                best_matched_count = matched_chosen
                best_candidate = cand
                best_patches = patches_chosen
                best_rectified = warped_chosen
                best_confidence = conf
                best_status_msg = status_msg
                best_visible_fraction = vis_frac
                best_corners_orig = corners_orig

                # Compute normalized polygon in [0, 100] coordinates
                poly_norm = []
                for ox, oy in corners_orig:
                    poly_norm.append((round(ox / orig_w * 100.0, 1), round(oy / orig_h * 100.0, 1)))
                best_polygon_norm = poly_norm

                xs = [p[0] for p in corners_orig]
                ys = [p[1] for p in corners_orig]
                min_x = max(0.0, min(xs))
                max_x = min(float(orig_w), max(xs))
                min_y = max(0.0, min(ys))
                max_y = min(float(orig_h), max(ys))

                best_bbox_norm = BoundingBox(
                    x=round((min_x / orig_w) * 100.0, 1),
                    y=round((min_y / orig_h) * 100.0, 1),
                    width=round(((max_x - min_x) / orig_w) * 100.0, 1),
                    height=round(((max_y - min_y) / orig_h) * 100.0, 1)
                )

                if is_confirmed and matched_chosen >= prof.minimum_valid_patch_count:
                    break

        card_is_detected = (best_matched_count >= prof.minimum_valid_patch_count and best_candidate is not None)

        stage_results["card_candidate"] = "PASS" if best_candidate is not None else "FAIL"
        stage_results["perspective_rectification"] = "PASS" if best_rectified is not None else "FAIL"
        stage_results["patch_grid"] = f"{best_matched_count}/{required_count}"
        stage_results["structure_validation"] = "PASS" if card_is_detected else "FAIL"
        stage_results["calibration"] = "READY" if card_is_detected else "BLOCKED"

        card_result = ReferenceCardResult(
            detected=card_is_detected,
            confidence=best_confidence if card_is_detected else None,
            bbox=best_bbox_norm if card_is_detected else None,
            corners=best_corners_orig if card_is_detected else None,
            polygon=best_polygon_norm if card_is_detected else None,
            visible_fraction=round(best_visible_fraction, 2),
            patch_count=best_matched_count,
            required_patch_count=required_count,
            patches=best_patches if card_is_detected else [],
            validated=card_is_detected,
            status_message=best_status_msg if card_is_detected else (
                f"Reference card incomplete: {best_matched_count}/{required_count} patches verified" if best_matched_count > 0 else "EvidenceTwin reference card not validated"
            ),
            perspective_rectified=card_is_detected,
            profile_id=prof.id,
            rows=prof.rows,
            columns=prof.columns,
            stages=stage_results,
            package_swatches_rejected=True
        )

        # Step 5: Color Calibration
        calibration_result = compute_color_calibration(
            patches=best_patches,
            card_validated=card_is_detected
        )

        # Step 6: Test Reagent / Kit Detection anywhere in frame
        card_corners_proc = np.array(best_candidate.corners, dtype=np.float32) if (best_candidate is not None and card_is_detected) else None
        kit_cand = detect_field_test_kit(
            proc_bgr=proc_bgr,
            gray=prep.gray,
            clahe_gray=prep.clahe_gray,
            card_corners=card_corners_proc,
            kit_id=kit_id
        )

        kit_result = TestKitResult(
            detected=False,
            confidence=None,
            bbox=None,
            corners=None,
            polygon=None,
            status_message="TEST KIT NOT DETECTED",
            profile_id=kit_id
        )

        kit_corners_orig: Optional[List[Tuple[float, float]]] = None
        if kit_cand is not None:
            kit_corners_orig = []
            for pt in kit_cand.corners:
                ox = float(pt[0] * prep.inv_scale)
                oy = float(pt[1] * prep.inv_scale)
                kit_corners_orig.append((round(ox, 1), round(oy, 1)))

            kxs = [p[0] for p in kit_corners_orig]
            kys = [p[1] for p in kit_corners_orig]
            k_min_x = max(0.0, min(kxs))
            k_max_x = min(float(orig_w), max(kxs))
            k_min_y = max(0.0, min(kys))
            k_max_y = min(float(orig_h), max(kys))

            kit_bbox_norm = BoundingBox(
                x=round((k_min_x / orig_w) * 100.0, 1),
                y=round((k_min_y / orig_h) * 100.0, 1),
                width=round(((k_max_x - k_min_x) / orig_w) * 100.0, 1),
                height=round(((k_max_y - k_min_y) / orig_h) * 100.0, 1)
            )

            kit_poly_norm = []
            for ox, oy in kit_corners_orig:
                kit_poly_norm.append((round(ox / orig_w * 100.0, 1), round(oy / orig_h * 100.0, 1)))

            kit_result = TestKitResult(
                detected=True,
                confidence=kit_cand.confidence,
                bbox=kit_bbox_norm,
                corners=kit_corners_orig,
                polygon=kit_poly_norm,
                status_message=f"FIELD TEST KIT DETECTED ({kit_cand.confidence}%)",
                profile_id=kit_id,
                swatches_detected=kit_cand.swatch_count,
                perspective_rectified=True
            )

        # Step 7: Reaction Region of Interest (ROI) Detection
        card_corners_for_roi = np.array(best_corners_orig, dtype=np.float32) if (card_is_detected and best_corners_orig) else None
        kit_corners_for_roi = np.array(kit_corners_orig, dtype=np.float32) if (kit_result.detected and kit_corners_orig) else None

        reaction_result = detect_or_validate_reaction_roi(
            img_bgr=raw_bgr,
            card_corners=card_corners_for_roi,
            manual_box=manual_roi_bbox,
            calibration_matrix=calibration_result.correction_matrix,
            test_kit_corners=kit_corners_for_roi,
            kit_id=kit_id
        )

        # Step 8: Image Quality Assessment
        quality_result = assess_image_quality(
            processed_bgr=proc_bgr,
            card_detected=card_is_detected,
            card_patches=best_patches
        )

        if calibration_result.white_balance_k is not None:
            quality_result.color_temperature_k = calibration_result.white_balance_k

        # Step 9: Strict Evidence Gate Evaluation (Fail-Closed)
        gate_reasons: List[str] = []
        gate_actions: List[str] = []

        if not card_is_detected and not kit_result.detected:
            pipeline_status = "NO_FIELD_TEST_OBJECTS_DETECTED"
            gate_reasons.append("No field-test objects detected. Neither EvidenceTwin Reference Card nor Test Kit found in image.")
            gate_actions.append("Ensure both the EvidenceTwin 15-patch reference card and field test kit are placed clearly in view.")
        elif not card_is_detected and kit_result.detected:
            pipeline_status = "TEST_KIT_DETECTED_REFERENCE_CARD_NOT_DETECTED"
            gate_reasons.append("Field test kit detected, but 15-patch EvidenceTwin reference card not detected. Spatial color calibration cannot be mathematically performed.")
            gate_actions.append("Place the 15-patch EvidenceTwin reference card anywhere in the photograph alongside the test kit.")
        elif not card_is_detected:
            pipeline_status = "REFERENCE_CARD_NOT_FOUND"
            gate_reasons.append("EvidenceTwin Reference Card not detected. Colorimetric calibration impossible.")
            gate_actions.append("Place the 15-patch EvidenceTwin reference card in view.")
        else:
            # Card IS detected — check ROI and quality
            if not reaction_result.detected:
                pipeline_status = "REACTION_ROI_NOT_FOUND"
                gate_reasons.append("Reaction well / sample fluid zone not detected in evidence image.")
                gate_actions.append("Position reaction fluid clearly in view or adjust manual reaction ROI crosshairs.")
            elif quality_result.status == "UNSUITABLE":
                pipeline_status = "IMAGE_QUALITY_FAILED"
                gate_reasons.append("Image optical quality is unsuitable for forensic analysis (extreme blur, glare, or clipping).")
                gate_actions.append("Hold camera steady, reduce direct glare reflections, and maintain balanced illumination.")
            else:
                pipeline_status = "READY_FOR_ANALYSIS"

        gate_passed = (len(gate_reasons) == 0 and card_is_detected and reaction_result.detected and quality_result.status != "UNSUITABLE")

        gate_result = EvidenceGateResult(
            passed=gate_passed,
            verdict="PASS" if gate_passed else "BLOCKED",
            status=pipeline_status,
            reasons=gate_reasons,
            required_actions=gate_actions if not gate_passed else ["Proceed with spectrophotometric and presumptive analysis."]
        )

        # Step 10: Multi-Object Debug Visualization
        debug_b64 = None
        rectified_b64 = None

        if self.debug_render:
            if best_rectified is not None:
                rectified_debug = best_rectified.copy()
                for p in best_patches:
                    bx = int(round(p.bbox.x))
                    by = int(round(p.bbox.y))
                    bw = int(round(p.bbox.width))
                    bh = int(round(p.bbox.height))
                    box_color = (0, 220, 80) if p.matched else (0, 0, 220)
                    cv2.rectangle(rectified_debug, (bx, by), (bx + bw, by + bh), box_color, 2)
                    cv2.putText(rectified_debug, p.patch_id, (bx + 2, by + bh - 4),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1, cv2.LINE_AA)

                rectified_b64 = encode_image_to_base64(rectified_debug, format_ext=".png")

            preview = proc_bgr.copy()
            pw, ph = prep.proc_w, prep.proc_h

            # Draw RED: All card candidates evaluated across the frame
            for idx, cand in enumerate(candidates[:15]):
                cand_pts = np.int32(cand.corners)
                is_selected = (best_candidate is not None and np.array_equal(cand.corners, best_candidate.corners))
                if not is_selected:
                    cv2.polylines(preview, [cand_pts], isClosed=True, color=(0, 0, 220), thickness=1)
                    cx = int(np.mean(cand_pts[:, 0]))
                    cy = int(np.mean(cand_pts[:, 1]))
                    cv2.putText(preview, f"C#{idx} ({cand.score:.1f})", (max(5, cx - 25), max(15, cy)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 240), 1, cv2.LINE_AA)

            # Draw BLUE: Field-Test Reagent Package polygon (BGR: (230, 110, 0) / (255, 120, 0))
            if kit_result.detected and kit_corners_orig:
                kpts_proc = []
                for ox, oy in kit_corners_orig:
                    kpts_proc.append([int(ox * prep.scale), int(oy * prep.scale)])
                kpts_proc = np.array(kpts_proc, dtype=np.int32)
                cv2.polylines(preview, [kpts_proc], isClosed=True, color=(235, 115, 20), thickness=2)
                cv2.putText(preview, f"TEST KIT ({kit_result.confidence}%)",
                            (kpts_proc[0][0], max(25, kpts_proc[0][1] - 8)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.50, (235, 115, 20), 2, cv2.LINE_AA)

            # Draw GREEN: Selected EvidenceTwin Reference Card polygon
            if card_is_detected and best_corners_orig:
                pts_proc = []
                for ox, oy in best_corners_orig:
                    pts_proc.append([int(ox * prep.scale), int(oy * prep.scale)])
                pts_proc = np.array(pts_proc, dtype=np.int32)
                cv2.polylines(preview, [pts_proc], isClosed=True, color=(0, 220, 80), thickness=3)
                cv2.putText(preview, f"EVIDENCETWIN CARD: LOCKED ({best_matched_count}/{required_count})",
                            (pts_proc[0][0], max(25, pts_proc[0][1] - 10)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 230, 90), 2, cv2.LINE_AA)

            # Draw CYAN: Reaction ROI (BGR: (255, 255, 0))
            if reaction_result.detected and reaction_result.bbox:
                rx = int(round(reaction_result.bbox.x / 100.0 * pw))
                ry = int(round(reaction_result.bbox.y / 100.0 * ph))
                rw = int(round(reaction_result.bbox.width / 100.0 * pw))
                rh = int(round(reaction_result.bbox.height / 100.0 * ph))
                cv2.rectangle(preview, (rx, ry), (rx + rw, ry + rh), (255, 255, 0), 2)
                cv2.putText(preview, f"REACTION ROI ({reaction_result.color_description})", (rx, max(20, ry - 8)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 0), 2, cv2.LINE_AA)

            debug_b64 = encode_image_to_base64(preview, format_ext=".jpg", quality=85)

        total_elapsed = round((time.time() - start_time) * 1000, 1)

        return VisionPipelineResponse(
            status=pipeline_status,
            reference_card=card_result,
            test_kit=kit_result,
            calibration=calibration_result,
            reaction_roi=reaction_result,
            quality=quality_result,
            gate=gate_result,
            debug_image_base64=debug_b64,
            rectified_card_base64=rectified_b64,
            processing_time_ms=total_elapsed,
            app_mode="DEMONSTRATION / RESEARCH ONLY"
        )

# Module entry point for CLI / child-process invocation
if __name__ == "__main__":
    import sys
    import json

    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"status": "PROCESSING_ERROR", "error": "No input JSON received"}))
            sys.exit(0)

        req_json = json.loads(input_data)
        img_b64 = req_json.get("image_base64") or req_json.get("image_source") or ""
        manual_roi = req_json.get("manual_roi_bbox")
        manual_card = req_json.get("manual_card_bbox")
        kit_id = req_json.get("kit_id", "kit-fentanyl-strip")

        roi_obj = BoundingBox(**manual_roi) if manual_roi else None
        card_obj = BoundingBox(**manual_card) if manual_card else None

        pipeline = EvidenceVisionPipeline(debug_render=True)
        response = pipeline.run(
            image_input=img_b64,
            manual_roi_bbox=roi_obj,
            manual_card_bbox=card_obj,
            kit_id=kit_id
        )

        if hasattr(response, 'model_dump_json'):
            print(response.model_dump_json())
        else:
            print(response.json())
    except Exception as e:
        err_msg = str(e)
        print(json.dumps({
            "status": "PROCESSING_ERROR",
            "error": err_msg,
            "gate": {
                "passed": False,
                "verdict": "BLOCKED",
                "status": "PROCESSING_ERROR",
                "reasons": [f"Pipeline execution error: {err_msg}"],
                "required_actions": ["Check image format and retry."]
            }
        }))
