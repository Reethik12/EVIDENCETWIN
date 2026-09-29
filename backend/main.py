import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from backend.cv_engine.schemas import (
    ManualInspectionRequest,
    VisionPipelineResponse,
    ReferenceCardResult,
    QualityAssessment,
    BoundingBox,
)
from backend.cv_engine.pipeline import EvidenceVisionPipeline

app = FastAPI(
    title="EvidenceTwin Computer Vision Service",
    description="High-Accuracy OpenCV Reference Card Detection, Perspective Rectification, Calibration, & Forensic Evidence Gate",
    version="2.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline_engine = EvidenceVisionPipeline(debug_render=True)

@app.get("/api/health")
@app.get("/health")
def health_check():
    import cv2
    import numpy as np
    return {
        "status": "healthy",
        "service": "EvidenceTwin-OpenCV-Engine",
        "version": "2.0.0",
        "opencv_version": cv2.__version__,
        "numpy_version": np.__version__,
        "pipeline": "EvidenceVisionPipeline",
        "anti_fabrication": "ACTIVE - FAIL CLOSED"
    }

@app.post("/api/cv/analyze", response_model=VisionPipelineResponse)
@app.post("/api/cv/pipeline", response_model=VisionPipelineResponse)
def analyze_image(request: ManualInspectionRequest):
    """
    Main evidence validation pipeline.
    Executes full anti-fabrication pipeline on uploaded image:
    1. Preprocessing
    2. Reference card candidate detection & geometric validation
    3. Perspective rectification
    4. Calibration patch identification
    5. Structural verification
    6. Reaction ROI segmentation
    7. Image quality analysis
    8. Mathematical color calibration
    9. Strict Evidence Gate verdict
    """
    try:
        response = pipeline_engine.run(
            image_input=request.image_base64,
            manual_roi_bbox=request.manual_roi_bbox,
            manual_card_bbox=request.manual_card_bbox,
            kit_id=request.kit_id or "kit-marquis-pro"
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Computer Vision Pipeline Error: {str(e)}")

@app.post("/api/cv/detect-card")
def detect_card_only(request: ManualInspectionRequest):
    """Convenience endpoint focusing on reference card detection and rectification."""
    try:
        response = pipeline_engine.run(
            image_input=request.image_base64,
            manual_roi_bbox=request.manual_roi_bbox,
            manual_card_bbox=request.manual_card_bbox,
            kit_id=request.kit_id or "kit-marquis-pro"
        )
        return {
            "reference_card": response.reference_card,
            "calibration": response.calibration,
            "gate": response.gate,
            "rectified_card_base64": response.rectified_card_base64,
            "debug_image_base64": response.debug_image_base64
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("CV_PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
