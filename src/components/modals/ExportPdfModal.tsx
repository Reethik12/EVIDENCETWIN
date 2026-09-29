import React, { useState } from 'react';
import { DigitalEvidenceRecord } from '../../types/evidence';
import { downloadSignedEvidencePdf, PdfReportOptions } from '../../services/reports/pdfReportGenerator';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  Building2,
  UserCheck,
  FileCheck,
  Calendar,
  Lock,
  Layers,
  Printer,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DigitalEvidenceRecord;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  const [agencyName, setAgencyName] = useState(
    'Central Forensic Science Laboratory / State Police CID'
  );
  const [departmentUnit, setDepartmentUnit] = useState(
    'Narcotics Enforcement & Field Drug Identification Division'
  );
  const [primaryOfficerName, setPrimaryOfficerName] = useState(
    record.operatorName || 'Insp. R. Sharma'
  );
  const [primaryOfficerBadge, setPrimaryOfficerBadge] = useState(
    record.operatorId || 'OP-0418'
  );
  const [primaryOfficerTitle, setPrimaryOfficerTitle] = useState(
    'Primary Testing Officer'
  );
  const [witnessOfficerName, setWitnessOfficerName] = useState(
    record.multiWitnessSeal?.secondaryWitness?.name || 'Sgt. V. Raman'
  );
  const [witnessOfficerBadge, setWitnessOfficerBadge] = useState(
    record.multiWitnessSeal?.secondaryWitness?.badgeNumber || 'ND-0892'
  );
  const [witnessOfficerTitle, setWitnessOfficerTitle] = useState(
    record.multiWitnessSeal?.secondaryWitness?.role || 'Supervisory Co-Witness'
  );
  const [includeImage, setIncludeImage] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    setExportSuccess(null);

    const options: PdfReportOptions = {
      agencyName,
      departmentUnit,
      primaryOfficerName,
      primaryOfficerBadge,
      primaryOfficerTitle,
      witnessOfficerName,
      witnessOfficerBadge,
      witnessOfficerTitle,
      includeEvidenceImage: includeImage,
    };

    try {
      const fileName = await downloadSignedEvidencePdf(record, options);
      setIsExporting(false);
      setExportSuccess(fileName);
      setTimeout(() => {
        setExportSuccess(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-2xl w-full p-4 sm:p-6 card-elevated-shadow space-y-5 animate-in fade-in-50 zoom-in-95 my-auto max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EBF3FB] border border-[#BFDBFE] flex items-center justify-center text-[#1769AA] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17212B]">
                Export Signed Chain-of-Custody PDF Report
              </h3>
              <p className="text-xs text-[#64717D]">
                Court-admissible certificate with cryptographic SHA-256 seal & dual-witness attestation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#8A96A3] hover:text-[#17212B] p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Quick Summary Banner */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block">Test Identifier</span>
            <span className="font-mono font-bold text-[#1769AA]">{record.testId}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block">Case Number</span>
            <span className="font-mono font-bold text-[#17212B]">{record.caseId}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block">Classification</span>
            <span className={`font-bold ${
              record.presumptiveResult === 'POSITIVE' ? 'text-[#1769AA]' :
              record.presumptiveResult === 'NEGATIVE' ? 'text-[#16865B]' : 'text-[#D88A00]'
            }`}>
              {record.presumptiveResult} ({record.confidencePercentage.toFixed(1)}%)
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block">Integrity Status</span>
            <span className="text-[#16865B] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> {record.verificationStatus}
            </span>
          </div>
        </div>

        {/* Customization Fields */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#17212B] uppercase tracking-wide flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#1769AA]" /> Official Attestation & Custody Details
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-[#17212B]">Law Enforcement / Forensic Agency</label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#17212B] focus:outline-none focus:border-[#1769AA]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#17212B]">Department / Section Unit</label>
              <input
                type="text"
                value={departmentUnit}
                onChange={(e) => setDepartmentUnit(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#17212B] focus:outline-none focus:border-[#1769AA]"
              />
            </div>

            {/* Primary Testing Officer */}
            <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] space-y-2">
              <span className="font-bold text-[#1769AA] text-[11px] block flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Primary Testing Officer
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#64717D]">Name</label>
                  <input
                    type="text"
                    value={primaryOfficerName}
                    onChange={(e) => setPrimaryOfficerName(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#64717D]">Badge / ID</label>
                  <input
                    type="text"
                    value={primaryOfficerBadge}
                    onChange={(e) => setPrimaryOfficerBadge(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Supervisory Witness Officer */}
            <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] space-y-2">
              <span className="font-bold text-[#16865B] text-[11px] block flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Supervisory Co-Witness
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#64717D]">Name</label>
                  <input
                    type="text"
                    value={witnessOfficerName}
                    onChange={(e) => setWitnessOfficerName(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#64717D]">Badge / ID</label>
                  <input
                    type="text"
                    value={witnessOfficerBadge}
                    onChange={(e) => setWitnessOfficerBadge(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="pt-2 flex items-center justify-between text-xs border-t border-[#EEF2F6]">
            <label className="flex items-center gap-2 cursor-pointer text-[#17212B] font-medium">
              <input
                type="checkbox"
                checked={includeImage}
                onChange={(e) => setIncludeImage(e.target.checked)}
                className="rounded border-[#CBD5E1] text-[#1769AA] focus:ring-[#1769AA]"
              />
              <span>Embed Forensic Optical Specimen Capture in Report</span>
            </label>
            <span className="text-[11px] text-[#8A96A3] font-mono">Format: A4 PDF • 2 Pages</span>
          </div>
        </div>

        {/* Cryptographic Seal Notice */}
        <div className="p-3 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl text-xs flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-[#16865B] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#17212B]">
            <p className="font-semibold text-[#16865B]">Cryptographic Chain of Custody Enforced</p>
            <p className="text-[#64717D] mt-0.5 font-mono break-all text-[10px]">
              Root Seal: {record.hashes.recordHash.substring(0, 48)}...
            </p>
          </div>
        </div>

        {/* Success notification */}
        {exportSuccess && (
          <div className="p-3 bg-[#EBF3FB] border border-[#BFDBFE] rounded-xl text-xs flex items-center gap-2 text-[#1769AA] font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1769AA]" />
            <span>Downloaded successfully: <strong className="font-mono">{exportSuccess}</strong></span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-[#EEF2F6]">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#64717D] font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1769AA] hover:bg-[#13568C] text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating Signed PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Signed PDF Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
