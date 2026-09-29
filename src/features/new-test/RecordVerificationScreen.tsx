import React, { useState } from 'react';
import { DigitalEvidenceRecord, PresumptiveClassification } from '../../types/evidence';
import { verifyEvidenceIntegrity } from '../../services/engines/integrityEngine';
import { EvidenceTwinLogo } from '../../components/common/EvidenceTwinLogo';
import { ExportPdfModal } from '../../components/modals/ExportPdfModal';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  FileCheck,
  ArrowLeft,
  FileText,
  Download,
  Printer,
  QrCode,
  KeyRound,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Clock,
  Sun,
  Beaker,
  Users,
  Activity
} from 'lucide-react';

interface RecordVerificationScreenProps {
  record: DigitalEvidenceRecord;
  onSaveAndFinish: () => void;
  onBackToAnalysis: () => void;
}

type TamperTarget = 'confidence' | 'classification' | 'calibration' | 'roi' | 'image';

export const RecordVerificationScreen: React.FC<RecordVerificationScreenProps> = ({
  record,
  onSaveAndFinish,
  onBackToAnalysis,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isTampered, setIsTampered] = useState(false);
  const [tamperTarget, setTamperTarget] = useState<TamperTarget>('confidence');
  const [simulatedRecord, setSimulatedRecord] = useState<DigitalEvidenceRecord>(record);
  const [verifying, setVerifying] = useState(false);
  const [exportPdfModalOpen, setExportPdfModalOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    computedRecordHash: string;
    storedRecordHash: string;
    discrepancies: string[];
  }>({
    valid: true,
    computedRecordHash: record.hashes.recordHash,
    storedRecordHash: record.hashes.recordHash,
    discrepancies: [],
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleRunTamperSimulation = async (target: TamperTarget) => {
    setVerifying(true);
    setTamperTarget(target);

    let modified: DigitalEvidenceRecord = { ...record };

    switch (target) {
      case 'confidence':
        modified = {
          ...record,
          confidencePercentage: 99.99,
        };
        break;
      case 'classification':
        const flippedResult: PresumptiveClassification =
          record.presumptiveResult === 'POSITIVE' ? 'NEGATIVE' : 'POSITIVE';
        modified = {
          ...record,
          presumptiveResult: flippedResult,
        };
        break;
      case 'calibration':
        modified = {
          ...record,
          calibration: {
            ...record.calibration,
            averageDeltaE: 0.12,
            whiteBalanceK: 5500,
          },
        };
        break;
      case 'roi':
        modified = {
          ...record,
          roi: {
            ...record.roi,
            calibratedColorHex: '#FF0055',
          },
        };
        break;
      case 'image':
        modified = {
          ...record,
          hashes: {
            ...record.hashes,
            imageSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // empty sha
          },
        };
        break;
    }

    setSimulatedRecord(modified);
    setIsTampered(true);
    const res = await verifyEvidenceIntegrity(modified);
    setVerificationResult(res);
    setTimeout(() => setVerifying(false), 200);
  };

  const handleRestoreGenuine = async () => {
    setVerifying(true);
    setSimulatedRecord(record);
    setIsTampered(false);
    const res = await verifyEvidenceIntegrity(record);
    setVerificationResult(res);
    setTimeout(() => setVerifying(false), 200);
  };

  const isVerified = verificationResult.valid && !isTampered;

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(record, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `EvidenceRecord_${record.testId}_${record.caseId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadCsv = () => {
    const csvRows = [
      ['FIELD', 'VALUE'],
      ['Test ID', record.testId],
      ['Case ID', record.caseId],
      ['Timestamp (UTC)', new Date(record.timestamp).toISOString()],
      ['Operator ID', record.operatorId],
      ['Operator Name', record.operatorName],
      ['Kit Profile', record.kitName],
      ['Target Analyte', record.targetAnalyte],
      ['Presumptive Classification', record.presumptiveResult],
      ['Confidence Percentage', `${record.confidencePercentage}%`],
      ['Evidence Reliability Score', `${record.reliability.score}/100`],
      ['Reliability Grade', record.reliability.status],
      ['Stability Score', `${record.robustness.stabilityScore}%`],
      ['Image SHA-256', record.hashes.imageSha256],
      ['Calibration Hash', record.hashes.calibrationHash],
      ['Analysis Hash', record.hashes.analysisHash],
      ['Final Record Seal', record.hashes.recordHash],
      ['Previous Block Hash', record.hashes.previousRecordHash],
      ['Block Height', `${record.hashes.blockHeight}`],
      ['Verification Status', record.verificationStatus],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `EvidenceSummary_${record.testId}_${record.caseId}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-2 print:hidden">
        <div>
          <span className="text-xs font-semibold text-[#1769AA] uppercase tracking-wide">
            Stage 05 // Digital Evidence Record
          </span>
          <h3 className="text-xl font-bold text-[#17212B] mt-0.5">
            Evidence Certificate & Cryptographic Integrity Seal
          </h3>
          <p className="text-xs text-[#64717D]">
            Tamper-evident 4-tier SHA-256 seal anchoring optical capture, calibration matrix, and field classification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setExportPdfModalOpen(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-[#EBF3FB] hover:bg-[#DCEBF9] text-[#1769AA] text-xs font-semibold rounded-lg border border-[#BFDBFE] transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-h-[40px] touch-manipulation"
            title="Export official signed PDF report for chain-of-custody documentation"
          >
            <FileText className="w-3.5 h-3.5 text-[#1769AA]" />
            <span>Export Signed PDF</span>
          </button>

          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <button
              onClick={handleDownloadJson}
              className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 bg-white hover:bg-[#F8FAFC] text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer min-h-[40px] touch-manipulation"
              title="Export tamper-evident JSON payload"
            >
              <Download className="w-3.5 h-3.5 text-[#1769AA]" />
              <span>JSON</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 bg-white hover:bg-[#F8FAFC] text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer min-h-[40px] touch-manipulation"
              title="Export CSV Audit Ledger"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#16865B]" />
              <span>CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="hidden xs:flex px-2.5 sm:px-3 py-2 bg-white hover:bg-[#F8FAFC] text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors items-center justify-center gap-1 shadow-xs cursor-pointer min-h-[40px] touch-manipulation"
              title="Print or Save as Official PDF Certificate"
            >
              <Printer className="w-3.5 h-3.5 text-[#64717D]" />
              <span>Print</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
            <button
              onClick={onBackToAnalysis}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center justify-center min-h-[40px] touch-manipulation cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back</span>
            </button>
            <button
              onClick={onSaveAndFinish}
              className="flex-1 sm:flex-initial px-5 py-2 bg-[#16865B] hover:bg-[#126E4A] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 min-h-[40px] touch-manipulation cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save to Timeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verification State Banner & Tamper Simulation Station */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 card-soft-shadow print:hidden ${
          isVerified
            ? 'bg-[#F0FDF4] border-[#BBF7D0]'
            : 'bg-[#FEF2F2] border-[#FECACA]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            isVerified ? 'bg-[#DCFCE7] text-[#16865B]' : 'bg-[#FEE2E2] text-[#D64550]'
          }`}>
            {isVerified ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h4 className={`text-sm font-bold ${isVerified ? 'text-[#16865B]' : 'text-[#D64550]'}`}>
              {isVerified ? '✓ Cryptographic Seal Validated — Zero Divergence' : '⚠ Cryptographic Tamper Detected — Seal Broken'}
            </h4>
            <p className="text-xs text-[#64717D] mt-0.5">
              {isVerified
                ? 'All stage hashes match cryptographic payload recomputation: Image → Calibration → Analysis → Seal.'
                : 'Recalculated SHA-256 hash does not match stored block seal. Audit discrepancy detected.'}
            </p>
            {verificationResult.discrepancies.length > 0 && (
              <div className="mt-2 space-y-1">
                {verificationResult.discrepancies.map((d, i) => (
                  <p key={i} className="text-[11px] font-mono text-[#D64550] bg-white/70 px-2 py-0.5 rounded border border-[#FECACA]">
                    • {d}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Tamper Simulator Controller */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          {!isTampered ? (
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[#CBD5E1]">
              <span className="text-[10px] font-bold text-[#8A96A3] uppercase px-1.5">Simulate:</span>
              <button
                onClick={() => handleRunTamperSimulation('confidence')}
                disabled={verifying}
                className="px-2 py-1 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold rounded border border-[#FDE68A] cursor-pointer"
                title="Alter confidence from 89% to 99.9%"
              >
                Bit-Flip Score
              </button>
              <button
                onClick={() => handleRunTamperSimulation('classification')}
                disabled={verifying}
                className="px-2 py-1 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold rounded border border-[#FDE68A] cursor-pointer"
                title="Flip presumptive classification"
              >
                Flip Result
              </button>
              <button
                onClick={() => handleRunTamperSimulation('calibration')}
                disabled={verifying}
                className="px-2 py-1 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold rounded border border-[#FDE68A] cursor-pointer"
                title="Alter calibration matrix values"
              >
                Alter Matrix
              </button>
              <button
                onClick={() => handleRunTamperSimulation('image')}
                disabled={verifying}
                className="px-2 py-1 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold rounded border border-[#FDE68A] cursor-pointer"
                title="Corrupt image hash"
              >
                Corrupt Image
              </button>
            </div>
          ) : (
            <button
              onClick={handleRestoreGenuine}
              disabled={verifying}
              className="px-4 py-1.5 bg-[#16865B] hover:bg-[#126E4A] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Restore Genuine Verified Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Official Forensic Field Evidence Certificate */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl card-elevated-shadow p-6 md:p-10 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Printable Official Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#CBD5E1] gap-4">
          <div className="flex items-center gap-3">
            <EvidenceTwinLogo size={42} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1769AA] uppercase tracking-wider">
                  Digital Evidence Companion // Field Edition
                </span>
                <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
                <span className="text-xs font-mono text-[#8A96A3]">Immutable Block #{record.hashes.blockHeight}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-[#17212B] mt-0.5">
                Field Evidence Certificate of Analysis
              </h2>
              <p className="text-xs text-[#64717D]">
                Colorimetric screening record with cryptographic chain of custody & optical calibration standard.
              </p>
            </div>
          </div>

          {/* Clean Stamp Badge */}
          <div className="flex items-center gap-4">
            <div
              className={`border-2 px-4 py-2 rounded-xl text-center font-bold text-xs uppercase tracking-wider ${
                isVerified
                  ? 'border-[#16865B] text-[#16865B] bg-[#F0FDF4]'
                  : 'border-[#D64550] text-[#D64550] bg-[#FEF2F2]'
              }`}
            >
              {isVerified ? '✓ Cryptographic Seal Intact' : '⚠ Seal Tampered / Mismatch'}
            </div>

            {/* QR Code Verification Representation */}
            <div className="hidden sm:flex flex-col items-center bg-[#FAFBFD] p-2 rounded-lg border border-[#E2E8F0]">
              <QrCode className="w-9 h-9 text-[#17212B]" />
              <span className="text-[8px] font-mono text-[#8A96A3] mt-0.5">BLOCK #{record.hashes.blockHeight}</span>
            </div>
          </div>
        </div>

        {/* Section: Case Details & Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-3.5 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block mb-1">Test Identifier</span>
            <span className="text-sm font-bold text-[#17212B] font-mono">{record.testId}</span>
          </div>

          <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-3.5 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block mb-1">Case Reference</span>
            <span className="text-sm font-bold text-[#17212B] font-mono">{record.caseId}</span>
          </div>

          <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-3.5 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block mb-1">Field Operator</span>
            <span className="text-xs font-bold text-[#17212B]">{record.operatorName}</span>
            <span className="text-[11px] font-mono text-[#64717D] block mt-0.5">{record.operatorId}</span>
          </div>

          <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-3.5 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block mb-1">Timestamp (UTC)</span>
            <span className="text-xs font-medium text-[#17212B] font-mono">
              {new Date(record.timestamp).toUTCString()}
            </span>
          </div>
        </div>

        {/* Section: Field Analysis Finding & Specimen Swatches */}
        <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-5 rounded-xl space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#EEF2F6] gap-2">
            <span className="font-bold text-[#17212B] uppercase text-[11px] tracking-wider">
              Colorimetric Analysis Finding
            </span>
            <span className="text-[#64717D] font-medium">Reagent: {record.kitName}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
            {/* Presumptive Result */}
            <div>
              <span className="text-[11px] text-[#64717D] block mb-0.5">Presumptive Classification</span>
              <span className={`text-xl font-extrabold tracking-tight ${
                simulatedRecord.presumptiveResult === 'POSITIVE' ? 'text-[#1769AA]' :
                simulatedRecord.presumptiveResult === 'NEGATIVE' ? 'text-[#16865B]' : 'text-[#D88A00]'
              }`}>
                {simulatedRecord.presumptiveResult}
              </span>
              <span className="text-[10px] text-[#8A96A3] block mt-0.5">{record.reactionDescription}</span>
            </div>

            {/* Confidence Score */}
            <div>
              <span className="text-[11px] text-[#64717D] block mb-0.5">Classification Confidence</span>
              <span className="text-xl font-extrabold text-[#17212B]">
                {simulatedRecord.confidencePercentage}%
              </span>
              <span className="text-[10px] text-[#8A96A3] block mt-0.5">CIE ΔE spectral proximity</span>
            </div>

            {/* Evidence Reliability */}
            <div>
              <span className="text-[11px] text-[#64717D] block mb-0.5">Evidence Reliability Score</span>
              <span className="text-xl font-extrabold text-[#1769AA]">
                {record.reliability.score} / 100
              </span>
              <span className="text-[10px] text-[#16865B] font-semibold block mt-0.5">
                {record.reliability.score >= 80 ? 'HIGH RELIABILITY' : 'MODERATE / REVIEW'}
              </span>
            </div>

            {/* Color Swatch Comparison */}
            <div className="flex items-center gap-2">
              <div className="text-center">
                <span className="text-[9px] text-[#8A96A3] block">RAW</span>
                <div
                  className="w-12 h-10 rounded border border-[#CBD5E1] shadow-2xs"
                  style={{ backgroundColor: record.roi.rawColorHex }}
                  title={`Raw: ${record.roi.rawColorHex}`}
                />
              </div>
              <span className="text-[#8A96A3] font-mono">→</span>
              <div className="text-center">
                <span className="text-[9px] text-[#16865B] font-bold block">CALIBRATED</span>
                <div
                  className="w-12 h-10 rounded border border-[#16865B]/50 shadow-2xs"
                  style={{ backgroundColor: simulatedRecord.roi.calibratedColorHex }}
                  title={`Calibrated: ${simulatedRecord.roi.calibratedColorHex}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Forensic Optical Evidence & OpenCV Rectification Artifacts */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl space-y-4 text-xs card-soft-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EEF2F6] gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1769AA]" />
              <h4 className="font-bold text-[#17212B] uppercase text-[11px] tracking-wider">
                Optical Specimen Evidence &amp; OpenCV Rectification Artifacts
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-[#F0FDF4] text-[#16865B] px-2.5 py-0.5 rounded border border-[#DCFCE7]">
                {record.cvEngineVersion || 'OpenCV 4.6.0 Pipeline'}
              </span>
              {record.cvProcessingTimeMs && (
                <span className="text-[10px] font-mono text-[#1769AA] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#DBEAFE]">
                  {record.cvProcessingTimeMs} ms
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* 1. Captured Primary Frame */}
            <div className="bg-[#FAFBFD] border border-[#CBD5E1] p-3 rounded-xl flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[10px] font-semibold text-[#64717D]">
                <span>1. RAW OPTICAL SPECIMEN</span>
                <span className="font-mono text-[#1769AA]">SHA-256 ANCHORED</span>
              </div>
              <div className="w-full aspect-[4/3] bg-white rounded-lg border border-[#E2E8F0] overflow-hidden flex items-center justify-center shadow-inner">
                {record.imageUrl ? (
                  <img
                    src={record.imageUrl}
                    alt="Optical evidence capture"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[11px] text-[#8A96A3]">No Image Available</span>
                )}
              </div>
              <span className="text-[10px] text-[#8A96A3] font-mono text-center">
                Unmodified sensor capture
              </span>
            </div>

            {/* 2. OpenCV Contour & Feature Overlay */}
            <div className="bg-[#FAFBFD] border border-[#CBD5E1] p-3 rounded-xl flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[10px] font-semibold text-[#64717D]">
                <span>2. OPENCV CONTOUR SEGMENTATION</span>
                <span className="font-mono text-[#16865B]">cv2.approxPolyDP</span>
              </div>
              <div className="w-full aspect-[4/3] bg-[#0F172A] rounded-lg border border-[#334155] overflow-hidden flex items-center justify-center shadow-inner">
                {record.cvDebugImageUrl ? (
                  <img
                    src={record.cvDebugImageUrl}
                    alt="OpenCV diagnostic contours"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-4 text-center space-y-1">
                    <span className="text-[10px] text-[#94A3B8] font-mono block">CONTOUR DELINEATION</span>
                    <span className="text-[9px] text-[#64748B] block">Card Quadrilateral &amp; Droplet ROI Segments</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[#8A96A3] font-mono text-center">
                Fiducial bounds &amp; reaction ROI verified
              </span>
            </div>

            {/* 3. Homography Rectified Reference Card */}
            <div className="bg-[#FAFBFD] border border-[#CBD5E1] p-3 rounded-xl flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[10px] font-semibold text-[#64717D]">
                <span>3. HOMOGRAPHY RECTIFIED CARD</span>
                <span className="font-mono text-[#18A6A6]">320 × 220 Px</span>
              </div>
              <div className="w-full aspect-[4/3] bg-white rounded-lg border border-[#E2E8F0] overflow-hidden flex items-center justify-center p-2 shadow-inner">
                {record.cvRectifiedCardUrl ? (
                  <img
                    src={record.cvRectifiedCardUrl}
                    alt="Perspective-rectified reference card"
                    className="w-full h-auto object-contain rounded border border-[#CBD5E1]"
                  />
                ) : (
                  <div className="p-4 text-center space-y-1">
                    <span className="text-[10px] text-[#18A6A6] font-mono block">15-PATCH CARD STANDARD (3×5 GRID)</span>
                    <span className="text-[9px] text-[#8A96A3] block">D65 Reference Baseline</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[#8A96A3] font-mono text-center">
                Residual ΔE = {record.calibration.averageDeltaE} across {record.calibration.tiles?.length || 15} tiles
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64717D]">
            <span>
              <strong>Cryptographic Chain of Custody:</strong> All 3 visual artifacts are bound to Root Hash <span className="font-mono text-[#17212B] font-bold">{record.hashes.recordHash.slice(0, 16)}...</span>
            </span>
            <span className="font-semibold text-[#16865B] flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Fail-Closed Verified
            </span>
          </div>
        </div>

        {/* Section: Human-AI Agreement Observation */}
        {record.humanInterpretation && record.humanInterpretation.operatorInterpretation && (
          <div className="p-4 bg-[#FAFBFD] rounded-xl border border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#8A96A3] uppercase block">
                Human-AI Concordance Audit
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[#17212B] font-semibold">
                  Operator Visual Assessment: <strong>{record.humanInterpretation.operatorInterpretation}</strong>
                </span>
                <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
                <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                  record.humanInterpretation.agreementStatus === 'AGREEMENT'
                    ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                    : 'bg-[#FFFBEB] text-[#D88A00] border border-[#FDE68A]'
                }`}>
                  {record.humanInterpretation.agreementStatus === 'AGREEMENT' ? '✓ CONCORDANT' : '⚠ DISCORDANT'}
                </span>
              </div>
              {record.humanInterpretation.operatorNotes && (
                <p className="text-[11px] text-[#64717D] italic mt-1">
                  "{record.humanInterpretation.operatorNotes}"
                </p>
              )}
            </div>
            <span className="text-[10px] text-[#8A96A3] font-mono shrink-0">
              Recorded: {new Date(record.humanInterpretation.recordedAt).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Section: Universal Reaction Profile & Calibration Audit */}
        <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-4 rounded-xl text-xs space-y-2">
          <span className="text-[10px] font-bold text-[#8A96A3] uppercase block">
            Universal Profile & Method Specifications
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="text-[#8A96A3] block">Kit Profile:</span>
              <span className="font-semibold text-[#17212B]">{record.kitName} (v{record.kitProfileVersion || '1.0'})</span>
            </div>
            <div>
              <span className="text-[#8A96A3] block">Reaction Procedure:</span>
              <span className="font-semibold text-[#1769AA]">{record.reactionProfileName || 'Primary Reagent'} (v{record.reactionProfileVersion || '1.0'})</span>
            </div>
            <div>
              <span className="text-[#8A96A3] block">Calibration Mode:</span>
              <span className="font-mono text-[#16865B]">{record.calibrationMethod || 'EVIDENCETWIN_15PATCH_GRID'}</span>
            </div>
            <div>
              <span className="text-[#8A96A3] block">ROI Segmentation:</span>
              <span className="font-mono text-[#17212B]">{record.roiMethod || 'REACTION_WELL_SEGMENTATION'}</span>
            </div>
          </div>
        </div>

        {/* Section: Temporal Reaction Fingerprint & Kinetics Summary */}
        {record.temporalSignature && (
          <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-5 rounded-xl text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#EEF2F6] gap-2">
              <span className="font-bold text-[#17212B] uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1769AA]" />
                Temporal Reaction Fingerprint & Kinetics (t0 &rarr; t{record.temporalSignature.observationDuration}s)
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                  record.temporalSignature.stabilizationStatus === 'STABLE'
                    ? 'bg-[#F0FDF4] border-[#DCFCE7] text-[#16865B]'
                    : 'bg-[#FFFBEB] border-[#FDE68A] text-[#D88A00]'
                }`}>
                  {record.temporalSignature.stabilizationStatus === 'STABLE' ? '✓ REACTION STABILIZED' : '⚠ REACTION DEVELOPING'}
                </span>
                <span className="font-mono text-[10px] bg-[#EBF3FB] border border-[#BFDBFE] text-[#1769AA] px-2 py-0.5 rounded">
                  KINETIC PROFILE: {record.temporalSignature.temporalComparisonStatus}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-[#8A96A3] block">Observation Period</span>
                <span className="font-semibold text-[#17212B]">{record.temporalSignature.observationDuration}s ({record.temporalSignature.frameCount} frames @ 1s)</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A96A3] block">Peak Reaction Velocity</span>
                <span className="font-mono font-bold text-[#1769AA]">{record.temporalSignature.peakVelocityDeltaEPerSec} &Delta;E/sec</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A96A3] block">Total Reaction Drift (&Delta;E)</span>
                <span className="font-mono font-bold text-[#17212B]">{record.temporalSignature.totalColourChangeDeltaE ?? record.temporalSignature.peakColourChangeDeltaE} &Delta;E</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A96A3] block">Stabilization Plateau Time</span>
                <span className="font-semibold text-[#16865B]">t = {record.temporalSignature.stabilizationTimeSeconds || 14}s</span>
              </div>
            </div>

            {/* Micro swatch strip */}
            {record.temporalSignature.trajectory && (
              <div className="pt-2">
                <span className="text-[9px] font-bold text-[#8A96A3] uppercase block mb-1">Time Series Chromatic Progression:</span>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {record.temporalSignature.trajectory.map((pt, idx) => (
                    <div key={idx} className="flex-1 min-w-[20px] text-center" title={`t=${pt.timestampSeconds}s, ΔE=${pt.deltaEFromInitial}, ${pt.colorHex}`}>
                      <div
                        className="w-full h-5 rounded border border-[#CBD5E1]"
                        style={{ backgroundColor: pt.colorHex }}
                      />
                      <span className="text-[8px] font-mono text-[#8A96A3] block">{pt.timestampSeconds}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section: Environmental Capture & Lighting Audit */}
        {record.lightingAnalysis && (
          <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-4 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#EEF2F6]">
              <span className="font-bold text-[#17212B] uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[#D88A00]" />
                Physics-Aware Lighting & Environmental Audit
              </span>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                record.lightingAnalysis.overallIlluminationQuality === 'OPTIMAL'
                  ? 'bg-[#F0FDF4] border-[#DCFCE7] text-[#16865B]'
                  : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
              }`}>
                {record.lightingAnalysis.overallIlluminationQuality} ILLUMINATION
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-[#8A96A3] block">Uniformity:</span>
                <span className="font-semibold text-[#17212B]">{record.lightingAnalysis.uniformityScore}/100</span>
              </div>
              <div>
                <span className="text-[#8A96A3] block">Correlated Color Temp:</span>
                <span className="font-mono text-[#1769AA]">{record.lightingAnalysis.colorTemperatureKelvin}K ({record.lightingAnalysis.kelvinQuality})</span>
              </div>
              <div>
                <span className="text-[#8A96A3] block">Specular Highlights:</span>
                <span className="font-semibold text-[#16865B]">{record.lightingAnalysis.specularHighlightSeverity === 'NONE' ? 'None in ROI' : record.lightingAnalysis.specularHighlightSeverity}</span>
              </div>
              <div>
                <span className="text-[#8A96A3] block">Estimated Illuminance:</span>
                <span className="font-mono text-[#17212B]">{record.lightingAnalysis.estimatedLux} Lux</span>
              </div>
            </div>
          </div>
        )}

        {/* Section: Multi-Matrix & Excipient Interference Research */}
        {record.matrixInterference && (
          <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-4 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#EEF2F6]">
              <span className="font-bold text-[#17212B] uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Beaker className="w-3.5 h-3.5 text-[#7C3AED]" />
                Multi-Matrix & Excipient Interference Research
              </span>
              <span className="text-[10px] font-mono font-bold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] px-2 py-0.5 rounded">
                SIMILARITY: {record.matrixInterference.profileSimilarityPercentage}%
              </span>
            </div>
            <p className="text-[11px] text-[#64717D] leading-relaxed">
              Vector deviation &Delta;E = {record.matrixInterference.vectorDeviationDeltaE}. {record.matrixInterference.matrixInterferenceNote}
            </p>
          </div>
        )}

        {/* Section: Multi-Witness Dual Cryptographic Seal */}
        {record.multiWitnessSeal && (
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-4 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#DCFCE7]">
              <span className="font-bold text-[#166534] uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#16865B]" />
                Multi-Witness Dual Cryptographic Seal
              </span>
              <span className="text-[10px] font-mono font-bold text-[#16865B] bg-white px-2 py-0.5 rounded border border-[#BBF7D0]">
                STATUS: {record.multiWitnessSeal.status}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-[#166534] font-bold block">Primary Testing Officer:</span>
                <span className="text-[#17212B]">{record.multiWitnessSeal.primaryOfficerName} ({record.multiWitnessSeal.primaryOfficerId})</span>
              </div>
              <div>
                <span className="text-[#166534] font-bold block">Co-Examiner / Supervisor Witness:</span>
                <span className="text-[#17212B]">{record.multiWitnessSeal.witnessOfficerName} ({record.multiWitnessSeal.witnessOfficerId})</span>
              </div>
            </div>
            <div className="font-mono text-[10px] text-[#166534] bg-white/80 p-2 rounded border border-[#DCFCE7] break-all">
              Dual SHA-256 Seal: {record.multiWitnessSeal.dualSignatureHash}
            </div>
          </div>
        )}

        {/* Section: Cryptographic Hash Chain Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F6]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B] flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#1769AA]" />
              4-Tier SHA-256 Cryptographic Audit Chain
            </h4>
            <span className="text-xs font-mono text-[#8A96A3]">SHA-256 Digest Chain</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {/* Stage 1: Captured Image Hash */}
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-sans font-semibold text-[#64717D] uppercase block">
                  Stage 1 // Optical Evidence Frame SHA-256
                </span>
                <span className="text-[#1769AA] break-all">{simulatedRecord.hashes.imageSha256}</span>
              </div>
              <button
                onClick={() => handleCopy(record.hashes.imageSha256, 'image')}
                className="self-end sm:self-center px-2.5 py-1 bg-white hover:bg-[#EEF2F6] border border-[#CBD5E1] rounded text-[11px] text-[#64717D] flex items-center gap-1 cursor-pointer print:hidden"
              >
                {copiedHash === 'image' ? <Check className="w-3 h-3 text-[#16865B]" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>

            {/* Stage 2: Calibration Hash */}
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-sans font-semibold text-[#64717D] uppercase block">
                  Stage 2 // 15-Patch Normalization Matrix Hash
                </span>
                <span className="text-[#18A6A6] break-all">{record.hashes.calibrationHash}</span>
              </div>
              <button
                onClick={() => handleCopy(record.hashes.calibrationHash, 'calib')}
                className="self-end sm:self-center px-2.5 py-1 bg-white hover:bg-[#EEF2F6] border border-[#CBD5E1] rounded text-[11px] text-[#64717D] flex items-center gap-1 cursor-pointer print:hidden"
              >
                {copiedHash === 'calib' ? <Check className="w-3 h-3 text-[#16865B]" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>

            {/* Stage 3: Analysis Hash */}
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-sans font-semibold text-[#64717D] uppercase block">
                  Stage 3 // Analysis & Presumptive Payload Hash
                </span>
                <span className="text-[#16865B] break-all">{record.hashes.analysisHash}</span>
              </div>
              <button
                onClick={() => handleCopy(record.hashes.analysisHash, 'analysis')}
                className="self-end sm:self-center px-2.5 py-1 bg-white hover:bg-[#EEF2F6] border border-[#CBD5E1] rounded text-[11px] text-[#64717D] flex items-center gap-1 cursor-pointer print:hidden"
              >
                {copiedHash === 'analysis' ? <Check className="w-3 h-3 text-[#16865B]" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>

            {/* Stage 4: Record Hash */}
            <div className="p-3 bg-[#EBF3FB] rounded-lg border border-[#BFDBFE] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-sans font-bold text-[#1769AA] uppercase block">
                  Stage 4 // Block Seal Digest (Cryptographic Anchoring)
                </span>
                <span className="text-[#17212B] font-bold break-all">{record.hashes.recordHash}</span>
                <span className="text-[11px] text-[#64717D] font-sans block mt-1">
                  Previous Block Digest: {record.hashes.previousRecordHash.slice(0, 24)}...
                </span>
              </div>
              <button
                onClick={() => handleCopy(record.hashes.recordHash, 'seal')}
                className="self-end sm:self-center px-2.5 py-1 bg-white hover:bg-[#EEF2F6] border border-[#1769AA]/40 rounded text-[11px] text-[#1769AA] font-semibold flex items-center gap-1 cursor-pointer print:hidden"
              >
                {copiedHash === 'seal' ? <Check className="w-3 h-3 text-[#16865B]" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>

        {/* Official Forensic Signature & Chain of Custody Signoff */}
        <div className="pt-6 border-t border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase text-[#8A96A3] block">
              Testing Officer Signoff
            </span>
            <div className="border-b border-dashed border-[#CBD5E1] pb-1 pt-6 flex justify-between items-end">
              <span className="font-serif italic text-sm text-[#17212B]">{record.operatorName}</span>
              <span className="font-mono text-[10px] text-[#8A96A3]">{record.operatorId}</span>
            </div>
            <p className="text-[10px] text-[#64717D]">
              Certified that field testing was executed following standard forensic reagent protocol.
            </p>
          </div>

          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase text-[#8A96A3] block">
              Evidence Custodian / Supervisor Verification
            </span>
            <div className="border-b border-dashed border-[#CBD5E1] pb-1 pt-6 flex justify-between items-end">
              <span className="text-[11px] text-[#8A96A3] italic">Counter-signature / Seal</span>
              <span className="font-mono text-[10px] text-[#8A96A3]">BLOCK #{record.hashes.blockHeight}</span>
            </div>
            <p className="text-[10px] text-[#64717D]">
              Chain-of-custody transfer verified with valid cryptographic hash integrity.
            </p>
          </div>
        </div>

        {/* Certificate Statutory Disclaimer */}
        <div className="pt-4 border-t border-[#EEF2F6] text-xs text-[#8A96A3] leading-relaxed">
          <p className="font-semibold text-[#64717D] mb-0.5">Statutory Forensic Field Notice</p>
          This digital certificate establishes cryptographic provenance, optical calibration integrity, and presumptive colorimetric classification. It is a preliminary field screening instrument and does not replace confirmatory analytical laboratory methods (GC-MS / HPLC-MS) required for final court admissibility.
        </div>
      </div>

      {/* Bottom Navigation & Action Bar for Mobile & Desktop Ergonomics */}
      <div className="bg-white border border-[#CBD5E1] p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 card-soft-shadow print:hidden">
        <div className="flex items-center gap-2 text-xs text-[#64717D] w-full sm:w-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16865B]" />
          <span className="font-semibold text-[#17212B]">
            Block #{record.hashes.blockHeight} Sealed • SHA-256 Verified
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => setExportPdfModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#EBF3FB] hover:bg-[#DCEBF9] text-[#1769AA] text-xs font-semibold rounded-lg border border-[#BFDBFE] transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] touch-manipulation"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Signed PDF</span>
          </button>
          <button
            onClick={onSaveAndFinish}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#16865B] hover:bg-[#126E4A] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 min-h-[42px] touch-manipulation cursor-pointer active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save to Timeline</span>
          </button>
        </div>
      </div>

      {/* Signed PDF Export Modal */}
      <ExportPdfModal
        isOpen={exportPdfModalOpen}
        onClose={() => setExportPdfModalOpen(false)}
        record={record}
      />
    </div>
  );
};
