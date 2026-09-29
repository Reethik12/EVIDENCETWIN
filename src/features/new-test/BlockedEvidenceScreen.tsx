import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Crosshair,
  FileQuestion,
  ExternalLink,
  Info,
  CheckCircle2,
  XCircle,
  Camera,
} from 'lucide-react';
import { EvidenceGateResult, EvidencePipelineStatus } from '../../types/evidence';

interface BlockedEvidenceScreenProps {
  gateResult: EvidenceGateResult;
  imageUri: string | null;
  onRetake: () => void;
  onManualRoiClick?: () => void;
  onManualCardClick?: () => void;
  onSelectBenchmarkClick?: () => void;
}

export const BlockedEvidenceScreen: React.FC<BlockedEvidenceScreenProps> = ({
  gateResult,
  imageUri,
  onRetake,
  onManualRoiClick,
  onManualCardClick,
  onSelectBenchmarkClick,
}) => {
  const getStatusBadge = (status: EvidencePipelineStatus) => {
    switch (status) {
      case 'REFERENCE_CARD_NOT_FOUND':
        return { label: 'REFERENCE CARD NOT DETECTED', color: 'bg-[#FEF2F2] text-[#D64550] border-[#FCA5A5]' };
      case 'REFERENCE_CARD_INCOMPLETE':
        return { label: 'REFERENCE CARD INCOMPLETE', color: 'bg-[#FFFBEB] text-[#D88A00] border-[#FDE68A]' };
      case 'REACTION_ROI_NOT_FOUND':
        return { label: 'REACTION ROI NOT FOUND', color: 'bg-[#FEF2F2] text-[#D64550] border-[#FCA5A5]' };
      case 'ROI_INVALID':
        return { label: 'REACTION ROI INVALID', color: 'bg-[#FEF2F2] text-[#D64550] border-[#FCA5A5]' };
      case 'CALIBRATION_FAILED':
        return { label: 'CALIBRATION CANNOT BE PERFORMED', color: 'bg-[#FEF2F2] text-[#D64550] border-[#FCA5A5]' };
      case 'IMAGE_INVALID':
        return { label: 'IMAGE FILE INVALID', color: 'bg-[#FEF2F2] text-[#D64550] border-[#FCA5A5]' };
      case 'IMAGE_QUALITY_FAILED':
        return { label: 'OPTICAL QUALITY INSUFFICIENT', color: 'bg-[#FEF2F2] text-[#D64550] border-[#FCA5A5]' };
      default:
        return { label: 'INSUFFICIENT EVIDENCE', color: 'bg-[#FEF2F2] text-[#D64550] border-[#FCA5A5]' };
    }
  };

  const badge = getStatusBadge(gateResult.status);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Primary Blocked Banner */}
      <div className="bg-[#FFF5F5] border-2 border-[#D64550]/40 rounded-2xl p-6 sm:p-8 card-elevated-shadow space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#FCA5A5]/40">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-[#D64550]/10 rounded-xl text-[#D64550] shrink-0 mt-0.5">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
                <span className="text-[10px] font-bold text-[#8A96A3] uppercase tracking-wider">
                  FAIL-CLOSED MANDATE ENFORCED
                </span>
              </div>
              <h2 className="text-2xl font-black text-[#17212B] tracking-tight">
                ANALYSIS BLOCKED
              </h2>
              <p className="text-xs text-[#64717D] mt-1">
                Downstream classification, reliability metrics, and forensic certificates are strictly withheld until mandatory optical evidence prerequisites are satisfied.
              </p>
            </div>
          </div>

          <button
            onClick={onRetake}
            className="px-5 py-2.5 bg-[#D64550] hover:bg-[#B93842] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RETAKE CAPTURE</span>
          </button>
        </div>

        {/* Diagnostic Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Why image cannot be analyzed */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B] flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-[#D64550]" />
              <span>Evidence Failure Reasons</span>
            </h4>
            <div className="space-y-2">
              {gateResult.reasons.map((r, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white border border-[#FCA5A5]/60 text-xs font-medium text-[#17212B] flex items-start gap-2 shadow-2xs"
                >
                  <span className="text-[#D64550] font-bold mt-0.5">•</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>

            {/* Evidence Breakdown Matrix */}
            <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase text-[#8A96A3] block">
                Forensic Evidence Checklist
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center py-0.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64717D]">Image File Integrity:</span>
                  <span className={gateResult.details.imageValid ? 'text-[#16865B] font-bold' : 'text-[#D64550] font-bold'}>
                    {gateResult.details.imageValid ? '✓ VALID' : '✗ INVALID'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64717D]">Reference Card Detection:</span>
                  <span className={gateResult.details.referenceCardDetected ? 'text-[#16865B] font-bold' : 'text-[#D64550] font-bold'}>
                    {gateResult.details.referenceCardDetected
                      ? `✓ ${gateResult.details.detectedPatchCount}/${gateResult.details.requiredPatchCount} LOCKED`
                      : `✗ ${gateResult.details.detectedPatchCount}/${gateResult.details.requiredPatchCount} DETECTED`}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64717D]">Reference Card Confidence:</span>
                  <span className="text-[#64717D] font-bold">
                    {gateResult.details.referenceConfidence !== null ? `${gateResult.details.referenceConfidence}%` : 'UNAVAILABLE'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64717D]">Reaction ROI:</span>
                  <span className={gateResult.details.roiDetected && gateResult.details.roiValid ? 'text-[#16865B] font-bold' : 'text-[#D64550] font-bold'}>
                    {gateResult.details.roiDetected && gateResult.details.roiValid ? '✓ ACQUIRED' : '✗ NOT FOUND'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#64717D]">Photometric Calibration:</span>
                  <span className={gateResult.details.calibrationPerformed ? 'text-[#16865B] font-bold' : 'text-[#D64550] font-bold'}>
                    {gateResult.details.calibrationPerformed ? '✓ CALIBRATED' : '✗ CANNOT BE PERFORMED'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Required Action & User Recourse */}
          <div className="space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#D88A00]" />
                <span>Required Corrective Actions</span>
              </h4>

              <div className="space-y-2">
                {gateResult.requiredActions.map((action, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-white border border-[#FDE68A] text-xs font-medium text-[#17212B] flex items-start gap-2 shadow-2xs"
                  >
                    <span className="text-[#D88A00] font-bold mt-0.5">→</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>

              {/* Thumbnail of Uploaded Image */}
              {imageUri && (
                <div className="p-3 bg-white rounded-xl border border-[#CBD5E1] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#8A96A3] uppercase">
                    <span>Uploaded Frame Inspected</span>
                    <span className="text-[#D64550]">Prerequisites Missing</span>
                  </div>
                  <div className="relative aspect-video max-h-36 bg-[#F8FAFC] rounded-lg overflow-hidden border border-[#E2E8F0] flex items-center justify-center">
                    <img src={imageUri} alt="Captured specimen" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-[#D64550]/10 backdrop-grayscale-50 flex items-center justify-center">
                      <span className="text-[11px] font-bold bg-[#17212B]/90 text-white px-3 py-1 rounded-full shadow-xs">
                        NO SCIENTIFIC ARTIFACTS CONFIRMED
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              {onManualRoiClick && (
                <button
                  onClick={onManualRoiClick}
                  className="w-full px-4 py-2.5 bg-white hover:bg-[#F8FAFC] text-[#1769AA] border border-[#1769AA] font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>SELECT REACTION REGION MANUALLY</span>
                </button>
              )}

              {onSelectBenchmarkClick && (
                <button
                  onClick={onSelectBenchmarkClick}
                  className="w-full px-4 py-2 bg-[#F8FAFC] hover:bg-[#EEF2F6] text-[#64717D] hover:text-[#17212B] border border-[#CBD5E1] font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileQuestion className="w-3.5 h-3.5" />
                  <span>Load Verified Ground-Truth Benchmark Specimen</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
