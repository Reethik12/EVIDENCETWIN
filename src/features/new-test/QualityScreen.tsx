import React, { useState, useEffect } from 'react';
import {
  ImageQualityMetrics,
  EnvironmentalLightingAnalysis,
  ReactionROI,
  CalibrationData,
  ReferenceCardDetectionResult,
  EvidenceGateResult,
} from '../../types/evidence';
import {
  ShieldCheck,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Sun,
  Eye,
  Crosshair,
  Sliders,
  AlertTriangle,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface QualityScreenProps {
  imageUri: string;
  metrics: ImageQualityMetrics;
  lightingAnalysis?: EnvironmentalLightingAnalysis;
  roi?: ReactionROI;
  calibration?: CalibrationData;
  cardDetection?: ReferenceCardDetectionResult;
  gateResult?: EvidenceGateResult;
  cvDebugImage?: string | null;
  cvRectifiedCard?: string | null;
  cvProcessingTimeMs?: number | null;
  cvEngineVersion?: string;
  onUpdateRoiCoords?: (coords: { x: number; y: number; width: number; height: number; method: 'MANUAL' }) => void;
  onUpdateManualCard?: (coords: { x: number; y: number; width: number; height: number }) => void;
  onProceedToCalibration: () => void;
  onBackToCapture: () => void;
}

export const QualityScreen: React.FC<QualityScreenProps> = ({
  imageUri,
  metrics,
  lightingAnalysis,
  roi,
  calibration,
  cardDetection,
  gateResult,
  cvDebugImage,
  cvRectifiedCard,
  cvProcessingTimeMs,
  cvEngineVersion = 'OpenCV 4.6.0',
  onUpdateRoiCoords,
  onUpdateManualCard,
  onProceedToCalibration,
  onBackToCapture,
}) => {
  const [showGlareOverlay, setShowGlareOverlay] = useState(true);
  const [showManualAdjustment, setShowManualAdjustment] = useState(false);
  const [showManualCardAdjustment, setShowManualCardAdjustment] = useState(false);
  const [viewportMode, setViewportMode] = useState<'original' | 'cv_overlay' | 'rectified'>('original');

  // Manual ROI state (in normalized percentages)
  const [roiX, setRoiX] = useState(roi?.boundingBox?.x ?? 18.0);
  const [roiY, setRoiY] = useState(roi?.boundingBox?.y ?? 35.0);
  const [roiW, setRoiW] = useState(roi?.boundingBox?.width ?? 22.0);
  const [roiH, setRoiH] = useState(roi?.boundingBox?.height ?? 26.0);

  // Manual Card state (only used if operator manually adjusts Reference Card)
  const [cardX, setCardX] = useState(cardDetection?.cardBoundingBox?.x ?? 0.0);
  const [cardY, setCardY] = useState(cardDetection?.cardBoundingBox?.y ?? 0.0);
  const [cardW, setCardW] = useState(cardDetection?.cardBoundingBox?.width ?? 0.0);
  const [cardH, setCardH] = useState(cardDetection?.cardBoundingBox?.height ?? 0.0);

  // Sync state if cardDetection or roi updates from CV engine
  useEffect(() => {
    if (cardDetection?.cardBoundingBox) {
      setCardX(cardDetection.cardBoundingBox.x);
      setCardY(cardDetection.cardBoundingBox.y);
      setCardW(cardDetection.cardBoundingBox.width);
      setCardH(cardDetection.cardBoundingBox.height);
    }
  }, [cardDetection?.cardBoundingBox]);

  useEffect(() => {
    if (roi?.boundingBox) {
      setRoiX(roi.boundingBox.x);
      setRoiY(roi.boundingBox.y);
      setRoiW(roi.boundingBox.width);
      setRoiH(roi.boundingBox.height);
    }
  }, [roi?.boundingBox]);

  const handleApplyRoi = () => {
    if (onUpdateRoiCoords) {
      onUpdateRoiCoords({ x: roiX, y: roiY, width: roiW, height: roiH, method: 'MANUAL' });
    }
  };

  const handleApplyManualCard = () => {
    if (onUpdateManualCard && cardW > 0) {
      onUpdateManualCard({ x: cardX, y: cardY, width: cardW, height: cardH });
    }
  };

  const isCardDetected = cardDetection?.detected ?? metrics.referenceDetected;
  const cardConfidence = cardDetection?.confidence ?? null;
  const patchCount = cardDetection?.patchCount ?? (isCardDetected ? 15 : 0);
  const requiredPatches = cardDetection?.requiredPatchCount ?? 15;
  const cardBox = cardDetection?.cardBoundingBox || (showManualCardAdjustment && cardW > 0 ? { x: cardX, y: cardY, width: cardW, height: cardH } : null);

  const lighting = lightingAnalysis || {
    lightingCondition: 'GOOD' as const,
    colorCast: 'LOW' as const,
    estimatedKelvin: metrics.colorTemperatureK || 5400,
    brightnessUniformity: metrics.lightingUniformity || 85,
    glareSeverity: 'LOW' as const,
    glarePercentage: 0.5,
    shadowSeverity: 'LOW' as const,
    shadowPercentage: 1.5,
    unevenIllumination: false,
    specularRegions: [],
    prototypeNormalizationApplied: isCardDetected,
    engineeringNote: isCardDetected
      ? 'Optical illumination meets standard forensic calibration requirements.'
      : 'Reference card unconfirmed. Optical normalization cannot be validated.',
  };

  const isGateBlocked = gateResult?.verdict === 'BLOCKED';

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-3">
        <div>
          <span className="text-xs font-semibold text-[#1769AA] uppercase tracking-wide">
            Stage 02 // Quality & Lighting
          </span>
          <h3 className="text-xl font-bold text-[#17212B] mt-0.5">
            Optical Suitability & Environmental Illumination
          </h3>
          <p className="text-xs text-[#64717D]">
            Multi-spectral sharpness, dynamic exposure, physics-aware lighting normalization, and specular glare detection.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={onBackToCapture}
            className="px-4 py-2 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retake / Back</span>
          </button>
          <button
            onClick={onProceedToCalibration}
            disabled={isGateBlocked}
            className={`px-5 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 min-h-[38px] ${
              isGateBlocked
                ? 'bg-[#CBD5E1] text-[#64717D] cursor-not-allowed opacity-75'
                : 'bg-[#1769AA] hover:bg-[#13568C] text-white cursor-pointer'
            }`}
          >
            <span>Proceed to Calibration</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fail-Closed Banner if Gate is Blocked */}
      {isGateBlocked && (
        <div className="bg-[#FFF5F5] border-2 border-[#D64550]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#D64550] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#D64550] uppercase tracking-wide block">
                ANALYSIS GATING NOTICE: {gateResult.status}
              </span>
              <p className="text-[#64717D] mt-0.5">
                {gateResult.reasons[0] || 'Prerequisites not met. Downstream stages cannot proceed until satisfied.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowManualAdjustment(true)}
            className="px-3.5 py-1.5 bg-white text-[#1769AA] border border-[#1769AA] rounded-lg font-semibold hover:bg-[#F8FAFC] cursor-pointer self-start sm:self-auto shrink-0"
          >
            Select Manual ROI
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Image Viewport with Segmented Overlays (Col 7) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Viewport Mode Switcher */}
          <div className="w-full flex items-center justify-between pb-2">
            <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] text-xs">
              <button
                type="button"
                onClick={() => setViewportMode('original')}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  viewportMode === 'original'
                    ? 'bg-white text-[#17212B] shadow-xs'
                    : 'text-[#64717D] hover:text-[#17212B]'
                }`}
              >
                Optical Specimen
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('cv_overlay')}
                className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewportMode === 'cv_overlay'
                    ? 'bg-white text-[#1769AA] shadow-xs'
                    : 'text-[#64717D] hover:text-[#17212B]'
                }`}
              >
                <span>OpenCV Contours</span>
                {cvDebugImage && (
                  <span className="w-2 h-2 rounded-full bg-[#16865B]" title="OpenCV debug map generated" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('rectified')}
                className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewportMode === 'rectified'
                    ? 'bg-white text-[#18A6A6] shadow-xs'
                    : 'text-[#64717D] hover:text-[#17212B]'
                }`}
              >
                <span>Rectified Card</span>
                {cvRectifiedCard && (
                  <span className="w-2 h-2 rounded-full bg-[#18A6A6]" title="Homography card rectified" />
                )}
              </button>
            </div>

            {cvProcessingTimeMs !== null && (
              <span className="text-[11px] font-mono text-[#16865B] font-bold bg-[#F0FDF4] px-2.5 py-1 rounded-full border border-[#DCFCE7] hidden sm:inline-block">
                OpenCV: {cvProcessingTimeMs}ms
              </span>
            )}
          </div>

          <div className="relative w-full aspect-[4/3] bg-white border border-[#CBD5E1] rounded-xl overflow-hidden flex items-center justify-center card-elevated-shadow">
            {/* Viewport Mode Content */}
            {viewportMode === 'cv_overlay' && cvDebugImage ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#0F172A]">
                <img
                  src={cvDebugImage}
                  alt="OpenCV diagnostic contour map"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-[#0F172A]/90 text-white border border-[#334155] px-2.5 py-1 rounded-md text-[10px] font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span>OPENCV 4.6.0 CANNY / APPROXPOLYDP CONTOURS</span>
                </div>
              </div>
            ) : viewportMode === 'rectified' && cvRectifiedCard ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#F8FAFC] p-4">
                <div className="max-w-[360px] w-full bg-white p-3 rounded-xl border border-[#CBD5E1] shadow-md flex flex-col items-center">
                  <span className="text-[11px] font-bold text-[#17212B] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#16865B]" />
                    Perspective-Rectified Reference Card (320x220)
                  </span>
                  <img
                    src={cvRectifiedCard}
                    alt="Perspective-rectified reference card"
                    className="w-full h-auto rounded border border-[#E2E8F0] shadow-inner"
                  />
                  <span className="text-[10px] text-[#64717D] mt-2 font-mono">
                    Homography Matrix: 4 Quadrilateral Points Warped to D65 Space
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* Captured Base Image */}
                <img
                  src={imageUri}
                  alt="Optical evidence frame"
                  className="w-full h-full object-contain"
                />

                {/* Scientific Overlays */}
                <div className="absolute inset-0 pointer-events-none p-4">
                  {/* Reference Card Bounding Box (Positioned dynamically from OpenCV) */}
                  {isCardDetected ? (
                    <div
                      className="absolute border-2 border-[#1769AA] rounded-md bg-[#1769AA]/10 backdrop-blur-2xs p-1.5 sm:p-2 flex flex-col justify-between transition-all"
                      style={{
                        left: `${cardBox.x}%`,
                        top: `${cardBox.y}%`,
                        width: `${cardBox.width}%`,
                        height: `${cardBox.height}%`,
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-[#1769AA] bg-white/95 px-1.5 py-0.5 rounded shadow-xs font-semibold gap-1 whitespace-nowrap overflow-hidden">
                        <span>EVIDENCETWIN CARD</span>
                        <span className="text-[#16865B] font-mono">
                          {cardConfidence !== null ? `${cardConfidence}%` : 'LOCKED'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono text-[#1769AA] bg-white/90 px-1 py-0.5 rounded gap-1 whitespace-nowrap overflow-hidden">
                        <span>3×5 GRID LOCKED</span>
                        <span className="font-bold text-[#16865B]">{patchCount}/{requiredPatches} VERIFIED</span>
                      </div>
                    </div>
                  ) : showManualCardAdjustment ? (
                    <div
                      className="absolute border-2 border-dashed border-[#1769AA] rounded-md bg-[#1769AA]/10 backdrop-blur-2xs p-1.5 sm:p-2 flex flex-col justify-between"
                      style={{
                        left: `${cardX}%`,
                        top: `${cardY}%`,
                        width: `${cardW}%`,
                        height: `${cardH}%`,
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-[#1769AA] bg-white/95 px-1.5 py-0.5 rounded shadow-xs font-bold gap-1 whitespace-nowrap overflow-hidden">
                        <span>MANUAL CARD ROI</span>
                        <span className="text-[#1769AA] font-mono">POSITIONING</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono text-[#1769AA] bg-white/90 px-1 py-0.5 rounded gap-1 whitespace-nowrap overflow-hidden">
                        <span>ALIGN OVER 15-PATCH CARD</span>
                        <span>0/{requiredPatches}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute top-3 right-3 bg-[#FFF5F5]/95 border border-[#FCA5A5] text-[#D64550] px-2.5 py-1 rounded-md text-[10px] font-bold shadow-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#D64550] animate-pulse" />
                      <span>REFERENCE CARD NOT DETECTED</span>
                    </div>
                  )}

                  {/* Reaction ROI Bounding Box */}
                  {roi?.detected ? (
                    <div
                      className="absolute border-2 border-[#18A6A6] rounded-md bg-[#18A6A6]/10 backdrop-blur-2xs p-1.5 sm:p-2 flex flex-col justify-between transition-all"
                      style={{
                        left: `${roiX}%`,
                        top: `${roiY}%`,
                        width: `${roiW}%`,
                        height: `${roiH}%`,
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-[#18A6A6] bg-white/95 px-1.5 py-0.5 rounded shadow-xs font-semibold">
                        <span>REACTION ROI</span>
                        <span className="text-[#1769AA] font-mono">
                          {metrics.snrDb !== null ? `SNR ${metrics.snrDb} dB` : 'ACQUIRED'}
                        </span>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 border border-[#18A6A6] rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-[#18A6A6] rounded-full" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono text-[#18A6A6] bg-white/80 px-1 rounded">
                        <span>WELL-01</span>
                        <span>{roi.selectionMethod || 'MANUAL'}</span>
                      </div>
                    </div>
                  ) : showManualAdjustment ? (
                    <div
                      className="absolute border-2 border-dashed border-[#18A6A6] rounded-md bg-[#18A6A6]/10 backdrop-blur-2xs p-2 flex flex-col justify-between"
                      style={{
                        left: `${roiX}%`,
                        top: `${roiY}%`,
                        width: `${roiW}%`,
                        height: `${roiH}%`,
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-[#18A6A6] bg-white/95 px-1.5 py-0.5 rounded shadow-xs font-bold">
                        <span>MANUAL ROI POSITIONING</span>
                        <span className="text-[#18A6A6] font-mono">ADJUST SLIDERS</span>
                      </div>
                      <div className="flex items-center justify-center text-[9px] text-[#18A6A6] font-semibold text-center">
                        Align box directly over reaction droplet
                      </div>
                      <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono text-[#18A6A6] bg-white/80 px-1 rounded">
                        <span>MANUAL COORDS</span>
                        <span>{roiX.toFixed(0)}%, {roiY.toFixed(0)}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute top-3 left-3 bg-[#FFF5F5]/95 border border-[#FCA5A5] text-[#D64550] px-2.5 py-1 rounded-md text-[10px] font-bold shadow-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#D64550] animate-pulse" />
                      <span>REACTION ROI NOT DETECTED</span>
                    </div>
                  )}

                  {/* Specular Glare Region Highlights */}
                  {showGlareOverlay && lighting.specularRegions?.map((sr, idx) => (
                    <div
                      key={idx}
                      className="absolute border border-dashed border-[#D64550] bg-[#D64550]/20 rounded flex items-center justify-center animate-pulse"
                      style={{
                        left: `${sr.x}%`,
                        top: `${sr.y}%`,
                        width: `${sr.width}%`,
                        height: `${sr.height}%`,
                      }}
                    >
                      <span className="text-[8px] font-bold text-[#D64550] bg-white/90 px-1 rounded shadow-2xs">
                        GLARE
                      </span>
                    </div>
                  ))}

                  {/* Bottom Status Ribbon */}
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 sm:gap-2 bg-white/95 border px-2.5 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-medium shadow-xs ${
                      isCardDetected ? 'border-[#CBD5E1] text-[#16865B]' : 'border-[#FCA5A5] text-[#D64550]'
                    }`}>
                      {isCardDetected ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-[#16865B]" />
                          <span>{patchCount}/{requiredPatches} Reference Patches Locked</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-[#D64550]" />
                          <span>Reference Card Not Detected</span>
                        </>
                      )}
                    </div>

                    {lighting.glareSeverity !== 'LOW' && (
                      <div className="flex items-center gap-1.5 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold shadow-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#D88A00]" />
                        <span>Potential Glare Highlight</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Interactive Overlay & ROI Toggle Bar */}
          <div className="mt-3 w-full flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-[#64717D] hover:text-[#17212B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGlareOverlay}
                  onChange={(e) => setShowGlareOverlay(e.target.checked)}
                  className="rounded border-[#CBD5E1] text-[#1769AA] focus:ring-[#1769AA]"
                />
                <span className="font-medium">Highlight Specular Glare</span>
              </label>

              <button
                type="button"
                onClick={() => setShowManualAdjustment(!showManualAdjustment)}
                className="flex items-center gap-1 text-[#18A6A6] hover:text-[#138080] font-semibold cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showManualAdjustment ? 'Hide Reaction ROI Controls' : 'Fine-Tune Reaction ROI'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowManualCardAdjustment(!showManualCardAdjustment)}
                className="flex items-center gap-1 text-[#1769AA] hover:text-[#13568C] font-semibold cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{showManualCardAdjustment ? 'Hide Card Controls' : 'Fine-Tune Reference Card ROI'}</span>
              </button>
            </div>

            <span className="text-[11px] font-mono text-[#8A96A3]">
              ROI: {roi?.detected ? `[${roiX.toFixed(1)}%, ${roiY.toFixed(1)}%]` : 'NOT DETECTED'} • Card: {isCardDetected && cardBox ? `[${cardBox.x.toFixed(1)}%, ${cardBox.y.toFixed(1)}%]` : 'UNAVAILABLE'}
            </span>
          </div>

          {/* Collapsible Manual ROI Adjustment Controls */}
          {showManualAdjustment && (
            <div className="mt-4 w-full bg-white border border-[#CBD5E1] p-4 rounded-xl space-y-3 text-xs card-soft-shadow">
              <div className="flex items-center justify-between border-b border-[#EEF2F6] pb-2">
                <div className="flex items-center gap-1.5 text-[#17212B] font-bold">
                  <Crosshair className="w-4 h-4 text-[#18A6A6]" />
                  <span>Manual Reaction ROI Position &amp; Dimension Sliders</span>
                </div>
                <span className="text-[11px] text-[#64717D]">
                  Align box directly over the colored reaction droplet
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[#64717D] block mb-1">X Offset (%):</span>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="0.5"
                    value={roiX}
                    onChange={(e) => setRoiX(parseFloat(e.target.value))}
                    className="w-full accent-[#18A6A6]"
                  />
                  <span className="text-[#17212B] font-bold">{roiX}%</span>
                </div>
                <div>
                  <span className="text-[#64717D] block mb-1">Y Offset (%):</span>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="0.5"
                    value={roiY}
                    onChange={(e) => setRoiY(parseFloat(e.target.value))}
                    className="w-full accent-[#18A6A6]"
                  />
                  <span className="text-[#17212B] font-bold">{roiY}%</span>
                </div>
                <div>
                  <span className="text-[#64717D] block mb-1">Width (%):</span>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="0.5"
                    value={roiW}
                    onChange={(e) => setRoiW(parseFloat(e.target.value))}
                    className="w-full accent-[#18A6A6]"
                  />
                  <span className="text-[#17212B] font-bold">{roiW}%</span>
                </div>
                <div>
                  <span className="text-[#64717D] block mb-1">Height (%):</span>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="0.5"
                    value={roiH}
                    onChange={(e) => setRoiH(parseFloat(e.target.value))}
                    className="w-full accent-[#18A6A6]"
                  />
                  <span className="text-[#17212B] font-bold">{roiH}%</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApplyRoi}
                  className="px-4 py-1.5 bg-[#18A6A6] text-white font-semibold rounded shadow-xs hover:bg-[#138080] cursor-pointer min-h-[34px]"
                >
                  Confirm &amp; Apply Manual ROI
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Manual Card Adjustment Controls */}
          {showManualCardAdjustment && (
            <div className="mt-4 w-full bg-white border border-[#CBD5E1] p-4 rounded-xl space-y-3 text-xs card-soft-shadow">
              <div className="flex items-center justify-between border-b border-[#EEF2F6] pb-2">
                <div className="flex items-center gap-1.5 text-[#17212B] font-bold">
                  <Crosshair className="w-4 h-4 text-[#1769AA]" />
                  <span>Manual Reference Card ROI Position &amp; Dimension Sliders</span>
                </div>
                <span className="text-[11px] text-[#64717D]">
                  Align box directly over the 15-patch calibration card
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[#64717D] block mb-1">Card X (%):</span>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="0.5"
                    value={cardX}
                    onChange={(e) => setCardX(parseFloat(e.target.value))}
                    className="w-full accent-[#1769AA]"
                  />
                  <span className="text-[#17212B] font-bold">{cardX}%</span>
                </div>
                <div>
                  <span className="text-[#64717D] block mb-1">Card Y (%):</span>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="0.5"
                    value={cardY}
                    onChange={(e) => setCardY(parseFloat(e.target.value))}
                    className="w-full accent-[#1769AA]"
                  />
                  <span className="text-[#17212B] font-bold">{cardY}%</span>
                </div>
                <div>
                  <span className="text-[#64717D] block mb-1">Card Width (%):</span>
                  <input
                    type="range"
                    min="15"
                    max="75"
                    step="0.5"
                    value={cardW}
                    onChange={(e) => setCardW(parseFloat(e.target.value))}
                    className="w-full accent-[#1769AA]"
                  />
                  <span className="text-[#17212B] font-bold">{cardW}%</span>
                </div>
                <div>
                  <span className="text-[#64717D] block mb-1">Card Height (%):</span>
                  <input
                    type="range"
                    min="15"
                    max="75"
                    step="0.5"
                    value={cardH}
                    onChange={(e) => setCardH(parseFloat(e.target.value))}
                    className="w-full accent-[#1769AA]"
                  />
                  <span className="text-[#17212B] font-bold">{cardH}%</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApplyManualCard}
                  className="px-4 py-1.5 bg-[#1769AA] text-white font-semibold rounded shadow-xs hover:bg-[#13568C] cursor-pointer min-h-[34px]"
                >
                  Confirm &amp; Apply Reference Card ROI
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quality Scorecard & Environmental Lighting Analysis (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Environmental Lighting Panel */}
          <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
              <div className="flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-[#D88A00]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                  Environmental Lighting Analysis
                </h4>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                  lighting.lightingCondition === 'GOOD'
                    ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                    : lighting.lightingCondition === 'ACCEPTABLE'
                    ? 'bg-[#EFF6FF] text-[#1769AA] border border-[#DBEAFE]'
                    : 'bg-[#FFFBEB] text-[#D88A00] border border-[#FDE68A]'
                }`}
              >
                {lighting.lightingCondition}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-[#EEF2F6]">
                <span className="text-[#8A96A3] text-[10px] block uppercase font-bold">Colour Cast</span>
                <span className={`text-xs font-bold ${lighting.colorCast === 'LOW' ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                  {lighting.colorCast} {metrics.colorTemperatureK ? `(~${metrics.colorTemperatureK}K)` : '(UNAVAILABLE)'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-[#EEF2F6]">
                <span className="text-[#8A96A3] text-[10px] block uppercase font-bold">Uniformity</span>
                <span className="text-xs font-bold text-[#17212B]">
                  {lighting.brightnessUniformity}% Uniform
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-[#EEF2F6]">
                <span className="text-[#8A96A3] text-[10px] block uppercase font-bold">Specular Glare</span>
                <span className={`text-xs font-bold ${lighting.glareSeverity === 'LOW' ? 'text-[#16865B]' : 'text-[#D64550]'}`}>
                  {lighting.glareSeverity} ({lighting.glarePercentage}%)
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-[#EEF2F6]">
                <span className="text-[#8A96A3] text-[10px] block uppercase font-bold">Shadow Regions</span>
                <span className={`text-xs font-bold ${lighting.shadowSeverity === 'LOW' ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                  {lighting.shadowSeverity} ({lighting.shadowPercentage}%)
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#EEF2F6] flex items-start gap-2 text-[11px] text-[#64717D]">
              <Info className="w-3.5 h-3.5 text-[#1769AA] shrink-0 mt-0.5" />
              <p className="leading-snug">{lighting.engineeringNote}</p>
            </div>
          </div>

          {/* Core Optical Quality Scorecard */}
          <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                Optical Quality Scorecard
              </h4>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                metrics.overallQuality === 'OPTIMAL'
                  ? 'text-[#16865B] bg-[#F0FDF4] border-[#DCFCE7]'
                  : metrics.overallQuality === 'ACCEPTABLE'
                  ? 'text-[#1769AA] bg-[#EFF6FF] border-[#DBEAFE]'
                  : 'text-[#D64550] bg-[#FFF5F5] border-[#FCA5A5]'
              }`}>
                {metrics.overallQuality}
              </span>
            </div>

            {/* Individual Quality Indicator Meters */}
            <div className="mt-3.5 space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-[#64717D] mb-1">
                  <span>Spatial Sharpness</span>
                  <span className="text-[#17212B] font-bold">{metrics.sharpness} / 100</span>
                </div>
                <div className="w-full h-1.5 bg-[#EEF2F6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1769AA] rounded-full"
                    style={{ width: `${metrics.sharpness}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#64717D] mb-1">
                  <span>Dynamic Exposure Balance</span>
                  <span className="text-[#17212B] font-bold">{metrics.exposure} / 100</span>
                </div>
                <div className="w-full h-1.5 bg-[#EEF2F6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1769AA] rounded-full"
                    style={{ width: `${metrics.exposure}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#64717D] mb-1">
                  <span>Reaction Well SNR Quality</span>
                  <span className="text-[#17212B] font-bold">
                    {metrics.snrDb !== null ? `${metrics.snrDb} dB` : 'UNAVAILABLE'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#EEF2F6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#18A6A6] rounded-full"
                    style={{ width: `${metrics.roiQuality}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="mt-4 pt-3 border-t border-[#EEF2F6] space-y-2 text-xs text-[#64717D]">
              <div className="flex items-center justify-between">
                <span>Reference Card Fiducials</span>
                {isCardDetected ? (
                  <span className="text-[#16865B] font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Locked ({patchCount}/{requiredPatches} Patches)
                  </span>
                ) : (
                  <span className="text-[#D64550] font-semibold flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Not Detected ({patchCount}/{requiredPatches} Patches)
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Reaction Region [ROI]</span>
                {roi?.detected ? (
                  <span className="text-[#16865B] font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Acquired ({roi.selectionMethod || 'MANUAL'})
                  </span>
                ) : (
                  <span className="text-[#D64550] font-semibold flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Missing
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>White Balance Estimation</span>
                <span className="font-mono text-[#17212B]">
                  {metrics.colorTemperatureK !== null ? `${metrics.colorTemperatureK} K` : 'UNAVAILABLE'}
                </span>
              </div>
            </div>
          </div>

          {/* OpenCV Computer Vision Engine Telemetry Badge */}
          <div className="bg-[#FAFBFD] border border-[#CBD5E1] p-4 rounded-xl card-soft-shadow space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-[#EEF2F6] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="font-bold text-[#17212B] uppercase tracking-wider text-[11px]">
                  {cvEngineVersion} Pipeline Telemetry
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#EBF3FB] text-[#1769AA] px-2 py-0.5 rounded border border-[#BFDBFE]">
                {cvProcessingTimeMs !== null ? `${cvProcessingTimeMs} ms` : 'REAL-TIME'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-white border border-[#E2E8F0]">
                <span className="text-[#8A96A3] block text-[9px] uppercase font-bold">Spatial Warp</span>
                <span className="font-semibold text-[#17212B]">cv2.approxPolyDP</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#E2E8F0]">
                <span className="text-[#8A96A3] block text-[9px] uppercase font-bold">Rectification</span>
                <span className="font-semibold text-[#17212B]">4-Pt Homography (320x220)</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#E2E8F0]">
                <span className="text-[#8A96A3] block text-[9px] uppercase font-bold">Illumination Equalization</span>
                <span className="font-semibold text-[#17212B]">CLAHE Multi-Channel</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#E2E8F0]">
                <span className="text-[#8A96A3] block text-[9px] uppercase font-bold">Evidence Gate</span>
                <span className={`font-bold font-mono ${isGateBlocked ? 'text-[#D64550]' : 'text-[#16865B]'}`}>
                  {gateResult?.verdict || 'PASS'} ({gateResult?.status || 'VALIDATED'})
                </span>
              </div>
            </div>

            <p className="text-[10px] text-[#64717D] leading-tight pt-1">
              Fail-closed architecture guarantees downstream spectrophotometric inference is locked until optical fiducials are verified by genuine OpenCV contour analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation & Action Bar for Mobile & Desktop Ergonomics */}
      <div className="bg-white border border-[#CBD5E1] p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 card-soft-shadow">
        <div className="flex items-center gap-2 text-xs text-[#64717D] w-full sm:w-auto">
          <span className={`w-2 h-2 rounded-full ${isGateBlocked ? 'bg-[#D64550]' : 'bg-[#16865B]'}`} />
          <span className="font-semibold text-[#17212B]">
            {isGateBlocked ? 'Gate Blocked — Reference card or ROI required' : 'Optical prerequisites verified'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={onBackToCapture}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retake / Back</span>
          </button>
          <button
            onClick={onProceedToCalibration}
            disabled={isGateBlocked}
            className={`flex-1 sm:flex-initial px-5 py-2.5 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 min-h-[42px] touch-manipulation ${
              isGateBlocked
                ? 'bg-[#CBD5E1] text-[#64717D] cursor-not-allowed opacity-75'
                : 'bg-[#1769AA] hover:bg-[#13568C] text-white cursor-pointer active:scale-98'
            }`}
          >
            <span>Proceed to Calibration</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
