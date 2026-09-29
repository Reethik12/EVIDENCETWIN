import json
from typing import List, Optional, Dict, Any, Tuple

try:
    from pydantic import BaseModel as _PydanticBaseModel, Field
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False
    def Field(default=None, default_factory=None, **kwargs):
        if default_factory is not None:
            return default_factory()
        return default

class BaseModel:
    def __init__(self, **kwargs):
        # Set class defaults
        for k, v in self.__class__.__dict__.items():
            if not k.startswith('_') and not callable(v):
                setattr(self, k, getattr(v, 'default', v))
        # Set provided kwargs
        for k, v in kwargs.items():
            setattr(self, k, v)

    def dict(self) -> Dict[str, Any]:
        result = {}
        for k, v in self.__dict__.items():
            if k.startswith('_'):
                continue
            if isinstance(v, BaseModel):
                result[k] = v.dict()
            elif isinstance(v, list):
                result[k] = [item.dict() if isinstance(item, BaseModel) else item for item in v]
            elif isinstance(v, dict):
                result[k] = {dk: (dv.dict() if isinstance(dv, BaseModel) else dv) for dk, dv in v.items()}
            else:
                result[k] = v
        return result

    def json(self) -> str:
        return json.dumps(self.dict())

    def model_dump_json(self) -> str:
        return self.json()

if HAS_PYDANTIC:
    _Base = _PydanticBaseModel
else:
    _Base = BaseModel

class BoundingBox(_Base):
    x: float = 0.0
    y: float = 0.0
    width: float = 0.0
    height: float = 0.0

class ReferenceCardProfile(_Base):
    id: str = "evidencetwin-reference-v1"
    name: str = "EvidenceTwin Forensic Reference Card v1"
    rows: int = 3
    columns: int = 5
    expected_patch_count: int = 15
    expected_aspect_ratio: float = 1.46
    has_outer_border: bool = True
    has_header: bool = True
    has_scale: bool = True
    minimum_valid_patch_count: int = 12

class PatchMeasurement(_Base):
    patch_id: str = "P1"
    name: str = ""
    expected_hex: str = "#000000"
    detected_hex: str = "#000000"
    centroid: Tuple[float, float] = (0.0, 0.0)
    bbox: Optional[BoundingBox] = None
    area: float = 0.0
    mean_rgb: Tuple[int, int, int] = (0, 0, 0)
    median_rgb: Tuple[int, int, int] = (0, 0, 0)
    hsv: Tuple[int, int, int] = (0, 0, 0)
    lab: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    delta_e: float = 0.0
    matched: bool = False
    row_index: int = 0
    col_index: int = 0

class ReferenceCardResult(_Base):
    detected: bool = False
    confidence: Optional[float] = None
    bbox: Optional[BoundingBox] = None
    corners: Optional[List[Tuple[float, float]]] = None
    polygon: Optional[List[Tuple[float, float]]] = None
    visible_fraction: float = 0.0
    patch_count: int = 0
    required_patch_count: int = 15
    patches: List[PatchMeasurement] = Field(default_factory=list)
    validated: bool = False
    status_message: str = "CARD NOT DETECTED"
    perspective_rectified: bool = False
    rotation_deg: float = 0.0
    profile_id: str = "evidencetwin-reference-v1"
    rows: int = 3
    columns: int = 5
    stages: Dict[str, str] = Field(default_factory=dict)
    package_swatches_rejected: bool = True

class TestKitResult(_Base):
    detected: bool = False
    confidence: Optional[float] = None
    bbox: Optional[BoundingBox] = None
    corners: Optional[List[Tuple[float, float]]] = None
    polygon: Optional[List[Tuple[float, float]]] = None
    status_message: str = "TEST KIT NOT DETECTED"
    profile_id: Optional[str] = "kit-fentanyl-strip"
    swatches_detected: int = 0
    perspective_rectified: bool = False

class ReactionROIResult(_Base):
    detected: bool = False
    confidence: Optional[float] = None
    bbox: Optional[BoundingBox] = None
    polygon: Optional[List[Tuple[float, float]]] = None
    method: str = "AUTO"  # AUTO, MANUAL, PROFILE_GUIDED
    raw_rgb: Optional[Tuple[int, int, int]] = None
    raw_hex: Optional[str] = None
    calibrated_hex: Optional[str] = None
    lab: Optional[Tuple[float, float, float]] = None
    hsv: Optional[Tuple[int, int, int]] = None
    glare_detected: bool = False
    usable_pixel_percent: float = 100.0
    homogeneity_score: float = 90.0
    color_description: str = "Unspecified"
    selection_notes: Optional[str] = None

class QualityAssessment(_Base):
    status: str = "UNSUITABLE"  # OPTIMAL, ACCEPTABLE, DEGRADED, UNSUITABLE
    sharpness: Optional[float] = None
    blur_score: Optional[float] = None
    exposure_balance: Optional[float] = None
    dynamic_range: Optional[float] = None
    lighting_uniformity: Optional[float] = None
    glare_fraction: Optional[float] = None
    glare_detected: bool = False
    dark_clipping: Optional[float] = None
    bright_clipping: Optional[float] = None
    snr_db: Optional[float] = None
    color_temperature_k: Optional[float] = None

class CalibrationResult(_Base):
    status: str = "CALIBRATION_FAILED"  # CALIBRATED, CALIBRATION_MARGINAL, CALIBRATION_FAILED
    patches_detected: int = 0
    correction_matrix: List[List[float]] = Field(default_factory=lambda: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])
    average_delta_e: float = 0.0
    white_balance_k: Optional[float] = None
    patch_measurements: List[PatchMeasurement] = Field(default_factory=list)
    confidence: Optional[float] = None

class EvidenceGateResult(_Base):
    passed: bool = False
    verdict: str = "BLOCKED"  # PASS, BLOCKED
    status: str = "INSUFFICIENT_EVIDENCE"
    reasons: List[str] = Field(default_factory=list)
    required_actions: List[str] = Field(default_factory=list)

class VisionPipelineResponse(_Base):
    status: str = "PROCESSING_ERROR"
    reference_card: ReferenceCardResult = Field(default_factory=ReferenceCardResult)
    test_kit: TestKitResult = Field(default_factory=TestKitResult)
    calibration: CalibrationResult = Field(default_factory=CalibrationResult)
    reaction_roi: ReactionROIResult = Field(default_factory=ReactionROIResult)
    quality: QualityAssessment = Field(default_factory=QualityAssessment)
    gate: EvidenceGateResult = Field(default_factory=EvidenceGateResult)
    debug_image_base64: Optional[str] = None
    rectified_card_base64: Optional[str] = None
    processing_time_ms: float = 0.0
    app_mode: str = "FORENSIC DIGITAL COMPANION"

class ManualInspectionRequest(_Base):
    image_base64: str = ""
    manual_roi_bbox: Optional[BoundingBox] = None
    manual_card_bbox: Optional[BoundingBox] = None
    kit_id: Optional[str] = "kit-fentanyl-strip"
    debug_mode: bool = True
