import React from 'react';
import { ReactionROI, ExpectedColourRegion } from '../../types/evidence';
import { hexToRgb, rgbToLab, rgbToHsv, calculateDeltaE } from '../../services/engines/calibrationEngine';
import { decomposeColorSpace } from '../../services/engines/colorSpaceEngine';
import { Layers, Compass, Crosshair, Check, Info } from 'lucide-react';

interface ColorSpaceDecompositionVisualProps {
  roi: ReactionROI;
  referenceTargetHex: string;
  referenceTargetLabel?: string;
  toleranceDeltaE?: number;
  trajectoryPoints?: Array<{ colorHex: string; timestampSeconds: number }>;
}

export const ColorSpaceDecompositionVisual: React.FC<ColorSpaceDecompositionVisualProps> = ({
  roi,
  referenceTargetHex,
  referenceTargetLabel = 'Reference Target',
  toleranceDeltaE = 12.0,
  trajectoryPoints = [],
}) => {
  const decomp = decomposeColorSpace(roi.calibratedColorHex, referenceTargetHex, toleranceDeltaE);
  const rawRgb = hexToRgb(roi.rawColorHex) || { r: 128, g: 128, b: 128 };
  const rawLab = rgbToLab(rawRgb.r, rawRgb.g, rawRgb.b);

  // Map CIE a* (-60 to +60) and b* (-60 to +60) to 2D SVG canvas (280x280)
  const mapLabToSvg = (a: number, b: number) => {
    const cx = 140;
    const cy = 140;
    const scale = 1.9; // 60 * 1.9 = 114px radius
    const x = cx + a * scale;
    const y = cy - b * scale; // inverted Y axis
    return { x, y };
  };

  const obsCoords = mapLabToSvg(decomp.lab.a, decomp.lab.b);
  const targetCoords = mapLabToSvg(decomp.referenceEnvelope.targetLab.a, decomp.referenceEnvelope.targetLab.b);
  const rawCoords = mapLabToSvg(rawLab.a, rawLab.b);

  return (
    <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EEF2F6]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#1769AA]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
            CIE L*a*b* Colour-Space Decomposition & Chromaticity Vectors
          </h4>
        </div>
        <span className="text-[11px] font-mono text-[#16865B] font-semibold bg-[#F0FDF4] px-2.5 py-0.5 rounded border border-[#DCFCE7]">
          Distance ΔE = {decomp.deltaEToReference}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* 2D Chromaticity Plot (Col 6) */}
        <div className="md:col-span-6 flex flex-col items-center">
          <div className="relative w-72 h-72 bg-[#FAFBFD] border border-[#CBD5E1] rounded-xl overflow-hidden shadow-2xs">
            <svg className="w-full h-full" viewBox="0 0 280 280">
              {/* Background Quadrant Tints */}
              {/* Top-Right: +a* +b* (Warm Orange/Red) */}
              <rect x="140" y="20" width="120" height="120" fill="#FFF7ED" opacity="0.6" />
              {/* Top-Left: -a* +b* (Yellow-Green) */}
              <rect x="20" y="20" width="120" height="120" fill="#FEFCE8" opacity="0.6" />
              {/* Bottom-Left: -a* -b* (Cyan-Green) */}
              <rect x="20" y="140" width="120" height="120" fill="#F0FDFA" opacity="0.6" />
              {/* Bottom-Right: +a* -b* (Violet-Magenta) */}
              <rect x="140" y="140" width="120" height="120" fill="#FAF5FF" opacity="0.6" />

              {/* Concentric Chroma Circles */}
              <circle cx="140" cy="140" r="38" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="140" cy="140" r="76" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="140" cy="140" r="114" fill="none" stroke="#CBD5E1" strokeWidth="1" />

              {/* Axes */}
              <line x1="20" y1="140" x2="260" y2="140" stroke="#94A3B8" strokeWidth="1.5" />
              <line x1="140" y1="20" x2="140" y2="260" stroke="#94A3B8" strokeWidth="1.5" />

              {/* Quadrant Axis Labels */}
              <text x="250" y="136" textAnchor="end" fontSize="9" fill="#D63384" fontFamily="monospace" fontWeight="bold">+a* Red</text>
              <text x="30" y="136" textAnchor="start" fontSize="9" fill="#16865B" fontFamily="monospace" fontWeight="bold">-a* Green</text>
              <text x="144" y="32" textAnchor="start" fontSize="9" fill="#E6A817" fontFamily="monospace" fontWeight="bold">+b* Yellow</text>
              <text x="144" y="254" textAnchor="start" fontSize="9" fill="#00A3D9" fontFamily="monospace" fontWeight="bold">-b* Blue</text>

              {/* Reference Target Tolerance Envelope Ellipse */}
              <circle
                cx={targetCoords.x}
                cy={targetCoords.y}
                r={toleranceDeltaE * 1.9}
                fill="#16865B"
                fillOpacity="0.08"
                stroke="#16865B"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Reaction Trajectory Path if points provided */}
              {trajectoryPoints.length > 1 && (
                <path
                  d={
                    `M ` +
                    trajectoryPoints
                      .map((tp) => {
                        const rgb = hexToRgb(tp.colorHex) || { r: 128, g: 128, b: 128 };
                        const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
                        const c = mapLabToSvg(lab.a, lab.b);
                        return `${c.x} ${c.y}`;
                      })
                      .join(' L ')
                  }
                  fill="none"
                  stroke="#1769AA"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
              )}

              {/* Raw vs Calibrated Drift Vector Line */}
              <line
                x1={rawCoords.x}
                y1={rawCoords.y}
                x2={obsCoords.x}
                y2={obsCoords.y}
                stroke="#64717D"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Raw Capture Point */}
              <circle cx={rawCoords.x} cy={rawCoords.y} r="4" fill={roi.rawColorHex} stroke="#64717D" strokeWidth="1.5" />

              {/* Target Point */}
              <circle cx={targetCoords.x} cy={targetCoords.y} r="6" fill={referenceTargetHex} stroke="#16865B" strokeWidth="2" />

              {/* Calibrated Observed Point */}
              <circle cx={obsCoords.x} cy={obsCoords.y} r="7" fill={roi.calibratedColorHex} stroke="#1769AA" strokeWidth="2.5" />
            </svg>

            {/* In-chart legend */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] font-mono text-[#64717D] bg-white/90 p-1 rounded border border-[#E2E8F0]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full border border-[#16865B]" style={{ backgroundColor: referenceTargetHex }} />
                Target Zone
              </span>
              <span className="flex items-center gap-1 font-bold text-[#1769AA]">
                <span className="w-2 h-2 rounded-full border border-[#1769AA]" style={{ backgroundColor: roi.calibratedColorHex }} />
                Observed Reaction
              </span>
            </div>
          </div>
          <span className="text-[10px] text-[#8A96A3] font-mono mt-1">CIE 1976 (L*, a*, b*) Chromaticity Plane</span>
        </div>

        {/* Detailed Coordinate Breakdown (Col 6) */}
        <div className="md:col-span-6 space-y-3 text-xs">
          <div className="p-3 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-2">
            <span className="font-bold text-[#17212B] uppercase text-[10px] tracking-wide block">
              1. CIE L*a*b* Scientific Coordinates
            </span>
            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="p-2 rounded bg-white border border-[#EEF2F6]">
                <span className="text-[10px] text-[#8A96A3] block">L* (Luma)</span>
                <span className="font-bold text-xs text-[#17212B]">{decomp.lab.L}</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#EEF2F6]">
                <span className="text-[10px] text-[#D63384] block">a* (Red/Grn)</span>
                <span className="font-bold text-xs text-[#17212B]">{decomp.lab.a}</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#EEF2F6]">
                <span className="text-[10px] text-[#E6A817] block">b* (Yel/Blu)</span>
                <span className="font-bold text-xs text-[#17212B]">{decomp.lab.b}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-2">
            <span className="font-bold text-[#17212B] uppercase text-[10px] tracking-wide block">
              2. Cylindrical Chroma & Hue Angle
            </span>
            <div className="grid grid-cols-2 gap-2 font-mono text-center">
              <div className="p-2 rounded bg-white border border-[#EEF2F6]">
                <span className="text-[10px] text-[#8A96A3] block">Chroma (C*)</span>
                <span className="font-bold text-xs text-[#1769AA]">{decomp.chromaC}</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#EEF2F6]">
                <span className="text-[10px] text-[#8A96A3] block">Hue Angle (h°)</span>
                <span className="font-bold text-xs text-[#1769AA]">{decomp.hueAngleDeg}°</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#64717D]">Envelope Status:</span>
              <span className={`font-bold ${decomp.referenceEnvelope.withinEnvelope ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                {decomp.referenceEnvelope.withinEnvelope ? 'INSIDE TOLERANCE ENVELOPE' : 'OUTSIDE TOLERANCE'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64717D]">Tolerance Radius:</span>
              <span>ΔE &le; {toleranceDeltaE}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
