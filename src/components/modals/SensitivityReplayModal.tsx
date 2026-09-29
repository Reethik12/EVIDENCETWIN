import React from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  ShieldCheck,
  Check
} from 'lucide-react';
import { RobustnessAnalysis, PresumptiveClassification } from '../../types/evidence';

interface SensitivityReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  robustness: RobustnessAnalysis;
  baseResult: PresumptiveClassification;
  baseColorHex: string;
}

export const SensitivityReplayModal: React.FC<SensitivityReplayModalProps> = ({
  isOpen,
  onClose,
  robustness,
  baseResult,
  baseColorHex,
}) => {
  if (!isOpen) return null;

  const stableVariants = robustness.variants.filter((v) => v.stable);
  const unstableVariants = robustness.variants.filter((v) => !v.stable);
  const isHighStability = robustness.stabilityStatus === 'HIGH';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF3FB] border border-[#BFDBFE] flex items-center justify-center text-[#1769AA]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17212B] flex items-center gap-2">
                <span>EVIDENCE REPLAY // SENSITIVITY ANALYSIS</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isHighStability
                      ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                      : 'bg-[#FFFBEB] text-[#D88A00] border border-[#FDE68A]'
                  }`}
                >
                  {isHighStability ? 'STABLE RESULT' : 'SENSITIVITY DETECTED'}
                </span>
              </h3>
              <p className="text-xs text-[#64717D]">
                Re-evaluates presumptive classification under controlled optical perturbations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#64717D] hover:text-[#17212B] hover:bg-[#EEF2F6] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#17212B]">
          {/* Stability Metric Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isHighStability
                ? 'bg-[#F0FDF4] border-[#DCFCE7]'
                : 'bg-[#FFFBEB] border-[#FDE68A]'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64717D] block">
                Perturbation Invariance Score
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-2xl font-extrabold ${
                    isHighStability ? 'text-[#16865B]' : 'text-[#D88A00]'
                  }`}
                >
                  {robustness.stabilityScore}%
                </span>
                <span className="text-xs text-[#64717D]">
                  • {stableVariants.length} of {robustness.variants.length} perturbation scenarios concordant
                </span>
              </div>
              <p className="text-xs text-[#64717D]">
                {robustness.recommendationNote}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-[#8A96A3] block uppercase">Base Specimen</span>
                <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                  <div
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: baseColorHex }}
                  />
                  <span className="font-mono font-bold text-[#17212B]">{baseResult}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Perturbation Scenarios Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                Controlled Optical Perturbation Scenarios
              </h4>
              <span className="text-[10px] text-[#8A96A3] font-mono">
                {robustness.variants.length} SIMULATED VARIANTS
              </span>
            </div>

            <div className="divide-y divide-[#EEF2F6] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
              {robustness.variants.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFBFD] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        v.stable
                          ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                          : 'bg-[#FFFBEB] text-[#D88A00] border border-[#FDE68A]'
                      }`}
                    >
                      {v.stable ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#17212B]">{v.parameter}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#EEF2F6] text-[#64717D]">
                          {v.deviation}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A96A3] mt-0.5">
                        Spectral drift ΔE: {v.deltaE.toFixed(1)} • Output confidence: {v.confidence}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-[#8A96A3] block">Result Under Variance</span>
                      <span
                        className={`font-bold font-mono text-xs ${
                          v.result === baseResult ? 'text-[#16865B]' : 'text-[#D88A00]'
                        }`}
                      >
                        {v.result}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        v.stable
                          ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                          : 'bg-[#FFFBEB] text-[#D88A00] border border-[#FDE68A]'
                      }`}
                    >
                      {v.stable ? 'STABLE' : 'DRIFT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prototype Scientific Notice */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5 text-[#64717D]">
            <Info className="w-4 h-4 text-[#1769AA] shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-bold text-[#17212B] block">Prototype Sensitivity Analysis Notice</span>
              <p className="text-[11px]">
                Perturbation testing evaluates the mathematical boundary margin of the colorimetric classification algorithm. If minor optical variations alter the presumptive result, the system prompts supervisor manual review to prevent premature field reliance.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <span className="text-[11px] text-[#8A96A3] font-mono">
            Algorithm Version: v2.4-PERTURB
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1769AA] hover:bg-[#13568C] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
