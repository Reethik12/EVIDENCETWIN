import React from 'react';
import { MatrixInterferenceAnalysis } from '../../types/evidence';
import {
  ShieldAlert,
  AlertTriangle,
  Beaker,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  Info
} from 'lucide-react';

interface MatrixInterferenceVisualProps {
  analysis: MatrixInterferenceAnalysis;
  targetSubstanceName?: string;
}

export const MatrixInterferenceVisual: React.FC<MatrixInterferenceVisualProps> = ({
  analysis,
  targetSubstanceName = 'Target Reagent Profile',
}) => {
  const isAtypical = analysis.interferenceStatus === 'ATYPICAL_MATRIX';
  const isPotential = analysis.interferenceStatus === 'POTENTIAL_INTERFERENCE';
  const isLow = analysis.interferenceStatus === 'LOW_DEVIATION';

  return (
    <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EEF2F6]">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-[#D88A00]" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
              Matrix / Excipient Interference Analysis (Research Feature)
            </h4>
            <span className="text-[10px] text-[#64717D]">
              Qualitative deviation modeling against target spectral baseline &amp; known excipient vectors.
            </span>
          </div>
        </div>

        <span
          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${
            isLow
              ? 'bg-[#F0FDF4] text-[#16865B] border-[#DCFCE7]'
              : isPotential
              ? 'bg-[#FFFBEB] text-[#D88A00] border-[#FDE68A]'
              : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
          }`}
        >
          {isLow
            ? '✓ LOW MATRIX DEVIATION'
            : isPotential
            ? '⚠ POTENTIAL INTERFERENCE EFFECT'
            : '⚠ ATYPICAL REACTION VECTOR'}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-1">
          <span className="text-[10px] text-[#8A96A3] uppercase font-bold block">Reaction Vector Similarity</span>
          <span className="text-lg font-bold font-mono text-[#17212B]">
            {analysis.reactionSimilarity}%
          </span>
          <p className="text-[10px] text-[#64717D]">
            Normalized Euclidean fit to reference chromophore corridor
          </p>
        </div>

        <div className="p-3 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-1">
          <span className="text-[10px] text-[#8A96A3] uppercase font-bold block">Profile Deviation (ΔE)</span>
          <span className="text-lg font-bold font-mono text-[#1769AA]">
            {analysis.profileDeviationDeltaE}
          </span>
          <p className="text-[10px] text-[#64717D]">
            Total perceptual displacement from pure reference standard
          </p>
        </div>

        <div className="p-3 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-1">
          <span className="text-[10px] text-[#8A96A3] uppercase font-bold block">Angular Hue Drift</span>
          <span className="text-lg font-bold font-mono text-[#D88A00]">
            {analysis.vectorDeviationAngleDeg}°
          </span>
          <p className="text-[10px] text-[#64717D]">
            Directional rotation in chromaticity plane
          </p>
        </div>
      </div>

      {/* Qualitative Scientific Note */}
      <div
        className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
          isLow
            ? 'bg-[#F0FDF4]/70 border-[#DCFCE7] text-[#166534]'
            : isPotential
            ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
            : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
        }`}
      >
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block uppercase tracking-wide text-[10px]">
            Evidentiary Excipient Assessment
          </span>
          <p className="mt-0.5 leading-relaxed">{analysis.interpretationNote}</p>
        </div>
      </div>

      {/* Excipient Candidates Table */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-[#17212B] uppercase tracking-wide block">
          Candidate Matrix Interferent Vectors (Evaluated Library)
        </span>
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden divide-y divide-[#EEF2F6] text-xs">
          {analysis.potentialInterferences.map((cand, idx) => (
            <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAFBFD]">
              <div className="space-y-0.5 max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#17212B]">{cand.name}</span>
                  <span className="text-[10px] font-mono text-[#64717D] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                    {cand.chemicalClass}
                  </span>
                </div>
                <p className="text-[11px] text-[#64717D] leading-tight">{cand.note}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto font-mono text-[11px]">
                <span className="text-[#8A96A3]">Shift Vector:</span>
                <span className="text-[#17212B] font-medium">{cand.typicalColorShift}</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    cand.likelihood === 'HIGH'
                      ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                      : cand.likelihood === 'MODERATE'
                      ? 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                      : 'bg-[#F8FAFC] text-[#64717D] border border-[#CBD5E1]'
                  }`}
                >
                  {cand.likelihood} Likelihood
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Scientific Safety Disclaimer */}
      <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#CBD5E1] flex items-start gap-2 text-[11px] text-[#64717D]">
        <Info className="w-3.5 h-3.5 text-[#1769AA] shrink-0 mt-0.5" />
        <p className="leading-snug">{analysis.scientificDisclaimer}</p>
      </div>
    </div>
  );
};
