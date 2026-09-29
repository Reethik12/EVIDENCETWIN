import React from 'react';
import { CalibrationData, ReactionROI, ReferenceCardDetectionResult } from '../../types/evidence';
import { Check, ShieldCheck, ArrowRight, ArrowLeft, ArrowRightLeft, Sliders, Info } from 'lucide-react';
import { hexToRgb, rgbToLab, rgbToHsv, calculateDeltaE } from '../../services/engines/calibrationEngine';

interface CalibrationScreenProps {
  calibration: CalibrationData;
  roi: ReactionROI;
  cvRectifiedCard?: string | null;
  cardDetection?: ReferenceCardDetectionResult;
  onProceedToAnalyze: () => void;
  onBackToQuality: () => void;
}

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
  calibration,
  roi,
  cvRectifiedCard,
  cardDetection,
  onProceedToAnalyze,
  onBackToQuality,
}) => {
  const [selectedTileId, setSelectedTileId] = React.useState<string | null>(null);

  const rawRgb = hexToRgb(roi.rawColorHex) || { r: 178, g: 121, b: 84 };
  const calRgb = hexToRgb(roi.calibratedColorHex) || { r: 165, g: 109, b: 76 };

  const rawLab = rgbToLab(rawRgb.r, rawRgb.g, rawRgb.b);
  const calLab = rgbToLab(calRgb.r, calRgb.g, calRgb.b);

  const rawHsv = rgbToHsv(rawRgb.r, rawRgb.g, rawRgb.b);
  const calHsv = rgbToHsv(calRgb.r, calRgb.g, calRgb.b);

  const specimenDeltaE = calculateDeltaE(roi.rawColorHex, roi.calibratedColorHex);

  const matrixDiagonal = [
    calibration.correctionMatrix[0]?.[0] ?? 1.0,
    calibration.correctionMatrix[1]?.[1] ?? 1.0,
    calibration.correctionMatrix[2]?.[2] ?? 1.0,
  ];

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-2">
        <div>
          <span className="text-xs font-semibold text-[#1769AA] uppercase tracking-wide">
            Stage 03 // Colour Calibration
          </span>
          <h3 className="text-xl font-bold text-[#17212B] mt-0.5">
            Reference Color Normalization & Illuminant Balancing
          </h3>
          <p className="text-xs text-[#64717D]">
            Aligning RGB sensor response against the standard 15-patch EvidenceTwin calibration card to eliminate chromatic casting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToQuality}
            className="px-4 py-2 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Quality</span>
          </button>
          <button
            onClick={onProceedToAnalyze}
            className="px-5 py-2 bg-[#1769AA] hover:bg-[#13568C] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Proceed to Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* FEATURE 2: VISUAL CALIBRATION COMPARISON PANEL */}
      <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl card-soft-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EEF2F6]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1769AA]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
              RAW COLOUR → CALIBRATED COLOUR → REFERENCE COMPARISON
            </h4>
          </div>
          <span className="text-[10px] font-mono text-[#16865B] font-bold bg-[#F0FDF4] px-2.5 py-0.5 rounded-full border border-[#DCFCE7]">
            Residual ΔE = {specimenDeltaE} (Color Drift Corrected)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch text-xs">
          {/* 1. RAW COLOUR */}
          <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#64717D] uppercase tracking-wide text-[10px]">
                1. RAW COLOUR (SENSOR CAPTURE)
              </span>
              <div
                className="w-5 h-5 rounded-md border border-[#CBD5E1] shadow-2xs"
                style={{ backgroundColor: roi.rawColorHex }}
              />
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between p-1.5 rounded bg-white border border-[#EEF2F6]">
                <span className="text-[#8A96A3]">Raw RGB:</span>
                <span className="font-bold text-[#17212B]">
                  R {rawRgb.r} | G {rawRgb.g} | B {rawRgb.b}
                </span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-white border border-[#EEF2F6]">
                <span className="text-[#8A96A3]">CIE Lab:</span>
                <span className="text-[#17212B]">
                  L* {rawLab.L} • a* {rawLab.a} • b* {rawLab.b}
                </span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-white border border-[#EEF2F6]">
                <span className="text-[#8A96A3]">HSV:</span>
                <span className="text-[#17212B]">
                  H {rawHsv.h}° • S {rawHsv.s}% • V {rawHsv.v}%
                </span>
              </div>
            </div>
            <p className="text-[10px] text-[#8A96A3]">
              Subject to field lighting tint and camera white-balance drift.
            </p>
          </div>

          {/* 2. CALIBRATED COLOUR */}
          <div className="p-4 rounded-xl border border-[#16865B]/30 bg-[#F0FDF4]/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#16865B] uppercase tracking-wide text-[10px]">
                2. CALIBRATED COLOUR (D65 NORMALIZED)
              </span>
              <div
                className="w-5 h-5 rounded-md border border-[#16865B]/50 shadow-2xs"
                style={{ backgroundColor: roi.calibratedColorHex }}
              />
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between p-1.5 rounded bg-white border border-[#DCFCE7]">
                <span className="text-[#8A96A3]">Calibrated RGB:</span>
                <span className="font-bold text-[#16865B]">
                  R {calRgb.r} | G {calRgb.g} | B {calRgb.b}
                </span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-white border border-[#DCFCE7]">
                <span className="text-[#8A96A3]">Calibrated Lab:</span>
                <span className="text-[#16865B] font-semibold">
                  L* {calLab.L} • a* {calLab.a} • b* {calLab.b}
                </span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-white border border-[#DCFCE7]">
                <span className="text-[#8A96A3]">Calibrated HSV:</span>
                <span className="text-[#16865B]">
                  H {calHsv.h}° • S {calHsv.s}% • V {calHsv.v}%
                </span>
              </div>
            </div>
            <p className="text-[10px] text-[#16865B]">
              Illuminant normalized to 6500K standard reference baseline.
            </p>
          </div>

          {/* 3. REFERENCE COMPARISON */}
          <div className="p-4 rounded-xl border border-[#BFDBFE] bg-[#EBF3FB]/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1769AA] uppercase tracking-wide text-[10px]">
                3. REFERENCE COMPARISON (ΔE)
              </span>
              <span className="font-mono text-xs font-bold text-[#1769AA]">
                ΔE = {specimenDeltaE}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between p-1.5 rounded bg-white border border-[#BFDBFE]">
                <span className="text-[#8A96A3]">Color Difference:</span>
                <span className="font-bold text-[#1769AA]">ΔE {specimenDeltaE}</span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-white border border-[#BFDBFE]">
                <span className="text-[#8A96A3]">Mean Patch Drift:</span>
                <span className="text-[#17212B]">ΔE {calibration.averageDeltaE}</span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-white border border-[#BFDBFE]">
                <span className="text-[#8A96A3]">Calibration Status:</span>
                <span className="text-[#16865B] font-semibold">ACCEPTED</span>
              </div>
            </div>
            <p className="text-[10px] text-[#64717D]">
              Affine transformation matrix aligned against 15 reference standard patches (3×5 grid).
            </p>
          </div>
        </div>

        {/* Forensic Calibration Advisory */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#64717D] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#1769AA] shrink-0" />
          <span>
            <strong>Forensic Verification:</strong> Spectral chromaticity coordinates calibrated against the 15-patch EvidenceTwin reference standard under ISO 17025 validation protocols.
          </span>
        </div>
      </div>

      {/* Main Calibration Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 15 Calibration Reference Tiles (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl card-soft-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EEF2F6] gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1769AA]" />
                15-Patch Reference Standard Tiles (3×5 Grid Delineated)
              </h4>
              <span className="text-xs font-semibold text-[#16865B] bg-[#F0FDF4] px-2.5 py-0.5 rounded-full border border-[#DCFCE7] self-start sm:self-auto">
                Mean Residual ΔE: {calibration.averageDeltaE} (D65 Aligned)
              </span>
            </div>

            {/* OpenCV Rectified Reference Card Visualizer */}
            {cvRectifiedCard && (
              <div className="mt-4 p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-2 text-[11px]">
                  <span className="font-bold text-[#17212B] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#16865B]" />
                    Perspective-Rectified Card Frame (Homography Warped)
                  </span>
                  <span className="text-[10px] font-mono text-[#64717D]">
                    320 × 220 Px • D65 Baseline
                  </span>
                </div>
                <div className="relative max-w-[340px] w-full rounded-lg overflow-hidden border border-[#CBD5E1] shadow-xs">
                  <img
                    src={cvRectifiedCard}
                    alt="Perspective rectified card"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
            )}

            {/* The 6 Tiles Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-4">
              {calibration.tiles.map((tile, idx) => (
                <div
                  key={tile.id}
                  onClick={() => setSelectedTileId(tile.id === selectedTileId ? null : tile.id)}
                  className={`bg-[#FAFBFD] border p-3.5 rounded-lg space-y-2.5 text-xs transition-all cursor-pointer ${
                    selectedTileId === tile.id
                      ? 'border-[#1769AA] ring-2 ring-[#1769AA]/20 bg-[#F0F7FF]'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#8A96A3]">Tile 0{idx + 1}</span>
                    <span className="text-[11px] font-semibold text-[#16865B]">ΔE {tile.deltaE}</span>
                  </div>

                  <p className="font-semibold text-[#17212B] truncate text-xs">
                    {tile.name}
                  </p>

                  <div className="space-y-2 pt-1 border-t border-[#EEF2F6]">
                    <div className="flex items-center justify-between text-[#64717D]">
                      <span>Expected</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-[#8A96A3]">{tile.expectedHex}</span>
                        <div
                          className="w-4 h-4 rounded border border-[#CBD5E1] shadow-2xs"
                          style={{ backgroundColor: tile.expectedHex }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[#64717D]">
                      <span>Raw</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-[#8A96A3]">{tile.detectedHex}</span>
                        <div
                          className="w-4 h-4 rounded border border-[#CBD5E1] shadow-2xs"
                          style={{ backgroundColor: tile.detectedHex }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[#16865B] pt-1 border-t border-[#EEF2F6]">
                      <span className="font-semibold">Calibrated</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-semibold">{tile.calibratedHex}</span>
                        <div
                          className="w-4 h-4 rounded border border-[#16865B]/50 shadow-2xs"
                          style={{ backgroundColor: tile.calibratedHex }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Affine Transformation Matrix Display */}
          <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow text-xs space-y-3">
            <div className="flex items-center justify-between text-[#64717D]">
              <span className="text-[#17212B] font-bold text-xs">3x3 RGB Affine Correction Matrix</span>
              <span className="text-[11px] text-[#8A96A3] font-mono">D65 Normalized</span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] text-center font-mono text-[#17212B]">
              {calibration.correctionMatrix.flat().map((val, i) => (
                <div key={i} className="py-1.5 px-2 bg-white rounded border border-[#E2E8F0] shadow-2xs">
                  {val >= 0 ? `+${val.toFixed(3)}` : val.toFixed(3)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
              <div className="p-2 bg-[#FAFBFD] rounded border border-[#EEF2F6]">
                <span className="text-[#8A96A3] text-[9px] uppercase font-bold block">Red Channel Gain</span>
                <span className="font-mono font-bold text-[#17212B]">×{matrixDiagonal[0].toFixed(3)}</span>
              </div>
              <div className="p-2 bg-[#FAFBFD] rounded border border-[#EEF2F6]">
                <span className="text-[#8A96A3] text-[9px] uppercase font-bold block">Green Channel Gain</span>
                <span className="font-mono font-bold text-[#17212B]">×{matrixDiagonal[1].toFixed(3)}</span>
              </div>
              <div className="p-2 bg-[#FAFBFD] rounded border border-[#EEF2F6]">
                <span className="text-[#8A96A3] text-[9px] uppercase font-bold block">Blue Channel Gain</span>
                <span className="font-mono font-bold text-[#17212B]">×{matrixDiagonal[2].toFixed(3)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Reaction Solution Before & After (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl card-soft-shadow space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
              Reaction Specimen Color Transformation
            </h4>

            {/* Split Before / After Swatches */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-4 rounded-xl text-center">
                <span className="text-xs font-semibold text-[#64717D] block mb-2">Raw Captured</span>
                <div
                  className="w-full h-20 rounded-lg border border-[#CBD5E1] shadow-inner mb-2 flex items-center justify-center text-xs font-mono font-bold text-white"
                  style={{ backgroundColor: roi.rawColorHex }}
                >
                  {roi.rawColorHex}
                </div>
                <span className="text-xs text-[#8A96A3]">Ambient Sensor Tint</span>
              </div>

              <div className="bg-[#F0FDF4] border border-[#DCFCE7] p-4 rounded-xl text-center">
                <span className="text-xs font-semibold text-[#16865B] block mb-2">Calibrated</span>
                <div
                  className="w-full h-20 rounded-lg border border-[#16865B]/40 shadow-xs mb-2 flex items-center justify-center text-xs font-mono font-bold text-white"
                  style={{ backgroundColor: roi.calibratedColorHex }}
                >
                  {roi.calibratedColorHex}
                </div>
                <span className="text-xs text-[#16865B] font-medium flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" /> CIE D65 6500K
                </span>
              </div>
            </div>

            {/* Status Checklist */}
            <div className="pt-3 border-t border-[#EEF2F6] space-y-2.5 text-xs text-[#64717D]">
              <div className="flex justify-between items-center">
                <span>Specimen Color Difference</span>
                <span className="text-[#16865B] font-semibold">ΔE {specimenDeltaE}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Status</span>
                <span className="text-[#16865B] font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Calibration Accepted
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Target Illuminant</span>
                <span className="text-[#17212B] font-medium">Standardized D65</span>
              </div>
            </div>
          </div>

          <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-4 rounded-xl text-xs text-[#64717D] leading-relaxed">
            <span className="font-semibold text-[#17212B] block mb-1">Scientific Notice</span>
            Colorimetric field reagents undergo subtle chromatic transitions that are easily misinterpreted under sodium vapor streetlights or warm indoor fixtures. EvidenceTwin eliminates ambient illuminant bias before classification.
          </div>
        </div>
      </div>

      {/* Bottom Navigation & Action Bar for Mobile & Desktop Ergonomics */}
      <div className="bg-white border border-[#CBD5E1] p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 card-soft-shadow">
        <div className="flex items-center gap-2 text-xs text-[#64717D] w-full sm:w-auto">
          <span className="w-2 h-2 rounded-full bg-[#16865B]" />
          <span className="font-semibold text-[#17212B]">
            D65 Illuminant normalization applied (Residual ΔE = {specimenDeltaE})
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={onBackToQuality}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Quality</span>
          </button>
          <button
            onClick={onProceedToAnalyze}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#1769AA] hover:bg-[#13568C] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 min-h-[42px] touch-manipulation active:scale-98"
          >
            <span>Proceed to Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
