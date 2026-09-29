import React, { useState, useRef } from 'react';
import { DigitalEvidenceRecord } from '../../types/evidence';
import { verifyEvidenceIntegrity } from '../../services/engines/integrityEngine';
import {
  ShieldCheck,
  AlertTriangle,
  Key,
  Layers,
  Sparkles,
  CheckCircle,
  Search,
  Upload,
  FileText,
  FileCheck,
  Check,
  AlertCircle
} from 'lucide-react';

interface IntegrityVerificationToolProps {
  records: DigitalEvidenceRecord[];
}

export const IntegrityVerificationTool: React.FC<IntegrityVerificationToolProps> = ({ records }) => {
  const [activeTab, setActiveTab] = useState<'database' | 'external'>('database');
  const [selectedRecordId, setSelectedRecordId] = useState<string>(records[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [tamperedState, setTamperedState] = useState(false);

  // External file audit state
  const [externalRecord, setExternalRecord] = useState<DigitalEvidenceRecord | null>(null);
  const [externalJsonInput, setExternalJsonInput] = useState('');
  const [externalParseError, setExternalParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRecord = activeTab === 'database'
    ? (records.find((r) => r.id === selectedRecordId) || records[0])
    : externalRecord;

  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    computedRecordHash: string;
    storedRecordHash: string;
    discrepancies: string[];
  } | null>(null);

  const filteredRecords = records.filter(
    (r) =>
      r.testId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.presumptiveResult.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.targetAnalyte.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const runVerification = async (forceTamper: boolean = false) => {
    if (!activeRecord) return;
    setVerifying(true);
    setVerificationResult(null);

    const targetRecord = forceTamper
      ? { ...activeRecord, confidencePercentage: 99.99, presumptiveResult: 'POSITIVE' as const }
      : activeRecord;

    const res = await verifyEvidenceIntegrity(targetRecord);
    setTamperedState(forceTamper);
    setTimeout(() => {
      setVerificationResult(res);
      setVerifying(false);
    }, 350);
  };

  const handleExternalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.hashes || !parsed.hashes.recordHash) {
          setExternalParseError('Invalid evidence record format: Missing cryptographic hash object.');
          return;
        }
        setExternalRecord(parsed);
        setExternalJsonInput(text);
        setExternalParseError(null);
        setVerificationResult(null);
        setTamperedState(false);
      } catch (err: any) {
        setExternalParseError(`JSON parse error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyPastedJson = () => {
    if (!externalJsonInput.trim()) return;
    try {
      const parsed = JSON.parse(externalJsonInput);
      if (!parsed.hashes || !parsed.hashes.recordHash) {
        setExternalParseError('Invalid evidence record format: Missing hashes object.');
        return;
      }
      setExternalRecord(parsed);
      setExternalParseError(null);
      setVerificationResult(null);
      setTamperedState(false);
    } catch (err: any) {
      setExternalParseError(`Invalid JSON: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleExternalFileUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-4">
        <div>
          <span className="text-xs font-semibold text-[#1769AA] uppercase tracking-wide">
            Cryptographic Integrity Suite // SHA-256
          </span>
          <h2 className="text-2xl font-bold text-[#17212B] mt-0.5">
            Integrity Verification
          </h2>
          <p className="text-xs text-[#64717D]">
            Mathematical recalculation of stored evidence hashes to detect tampering, corruption, or unauthorised modifications.
          </p>
        </div>

        {/* Source Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0] self-start md:self-auto">
          <button
            onClick={() => {
              setActiveTab('database');
              setVerificationResult(null);
              setTamperedState(false);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'database'
                ? 'bg-white text-[#1769AA] font-semibold shadow-xs'
                : 'text-[#64717D] hover:text-[#17212B]'
            }`}
          >
            Database Custody Records
          </button>
          <button
            onClick={() => {
              setActiveTab('external');
              setVerificationResult(null);
              setTamperedState(false);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'external'
                ? 'bg-white text-[#1769AA] font-semibold shadow-xs'
                : 'text-[#64717D] hover:text-[#17212B]'
            }`}
          >
            Audit External JSON Certificate
          </button>
        </div>
      </div>

      {/* Control Station: Record Selector & Verification Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Record Selection or External Input (Col 5) */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] p-6 rounded-xl card-soft-shadow space-y-4">
          {activeTab === 'database' ? (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                  Select Evidence Record to Audit
                </h4>
                <span className="text-[11px] text-[#8A96A3]">
                  {filteredRecords.length} records
                </span>
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8A96A3] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by Test ID, Case File, Analyte..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-xs text-[#17212B] focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredRecords.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRecordId(r.id);
                      setVerificationResult(null);
                      setTamperedState(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${
                      selectedRecordId === r.id
                        ? 'border-[#1769AA] bg-[#EBF3FB] text-[#17212B]'
                        : 'border-[#E2E8F0] bg-[#FAFBFD] hover:border-[#1769AA]/40 text-[#64717D]'
                    }`}
                  >
                    <div>
                      <p className="font-bold font-mono text-[#17212B]">{r.testId} • {r.caseId}</p>
                      <p className="text-[11px] text-[#64717D]">{r.presumptiveResult} • Reliability {r.reliability.score}/100</p>
                    </div>
                    <span className="text-xs font-medium text-[#16865B] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#DCFCE7]">
                      Block #{r.hashes.blockHeight}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-[#EEF2F6] flex flex-wrap gap-2.5">
                <button
                  onClick={() => runVerification(false)}
                  disabled={verifying || !activeRecord}
                  className="flex-1 py-2.5 bg-[#1769AA] hover:bg-[#13568C] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Verify Genuine Record</span>
                </button>
                <button
                  onClick={() => runVerification(true)}
                  disabled={verifying || !activeRecord}
                  className="py-2.5 px-3 bg-white hover:bg-[#FFFBEB] text-[#D88A00] text-xs font-medium rounded-lg border border-[#FDE68A] transition-colors cursor-pointer"
                >
                  Simulate Alteration
                </button>
              </div>
            </>
          ) : (
            /* External JSON Certificate Audit Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F6]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                  Import Certificate File (.json)
                </h4>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-[#EBF3FB] hover:bg-[#DBEAFE] text-[#1769AA] text-xs font-semibold rounded-md border border-[#BFDBFE] flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Select File</span>
                </button>
              </div>

              <p className="text-xs text-[#64717D] leading-relaxed">
                Upload or paste an exported Evidence Record JSON to verify its SHA-256 seal independently from external agencies.
              </p>

              <div>
                <label className="text-[10px] font-bold text-[#8A96A3] uppercase block mb-1">
                  Or Paste JSON Payload Directly
                </label>
                <textarea
                  rows={6}
                  value={externalJsonInput}
                  onChange={(e) => setExternalJsonInput(e.target.value)}
                  placeholder='Paste {"testId": "TEST-024", "hashes": {...}} here...'
                  className="w-full p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-xs font-mono text-[#17212B] focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              {externalParseError && (
                <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#D64550] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{externalParseError}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyPastedJson}
                  className="px-3.5 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#17212B] text-xs font-medium rounded-lg cursor-pointer"
                >
                  Load Pasted Data
                </button>

                <button
                  onClick={() => runVerification(false)}
                  disabled={verifying || !externalRecord}
                  className="flex-1 py-2 bg-[#1769AA] hover:bg-[#13568C] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Verify External Seal</span>
                </button>
              </div>

              {externalRecord && (
                <div className="p-3 bg-[#F0FDF4] border border-[#DCFCE7] rounded-lg text-xs text-[#16865B] space-y-1">
                  <span className="font-bold block">✓ Record Loaded: {externalRecord.testId}</span>
                  <span className="text-[11px] text-[#475569] block">
                    Case: {externalRecord.caseId} • Analyte: {externalRecord.targetAnalyte}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Verification Engine Viewport (Col 7) */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] p-6 rounded-xl card-soft-shadow space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
              Integrity Comparison Engine
            </h4>
            <span className="text-xs font-mono text-[#64717D]">
              Record: {activeRecord?.id || 'No Record Selected'}
            </span>
          </div>

          {/* Stored vs Computed Hashes */}
          <div className="space-y-4 text-xs font-mono">
            {/* Stored Hash */}
            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] font-sans font-bold text-[#64717D] uppercase block">
                Stored Cryptographic Seal (On-Chain Hash)
              </span>
              <span className="text-[#1769AA] font-bold break-all block mt-1">
                {activeRecord?.hashes.recordHash || '—'}
              </span>
            </div>

            {/* Calculated Hash */}
            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] font-sans font-bold text-[#64717D] uppercase block">
                Calculated from Raw Optical Sensor & Analysis Payload
              </span>
              <span className="text-[#17212B] font-bold break-all block mt-1">
                {verificationResult
                  ? verificationResult.computedRecordHash
                  : 'Click "Verify Genuine Record" to run live SHA-256 calculation...'}
              </span>
            </div>
          </div>

          {/* Verification Status Reveal */}
          {verifying ? (
            <div className="p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-center space-y-2">
              <Sparkles className="w-5 h-5 text-[#1769AA] mx-auto animate-spin" />
              <p className="text-xs text-[#1769AA] font-semibold">Recalculating 4-tier cryptographic hash chain...</p>
            </div>
          ) : verificationResult ? (
            <div
              className={`p-5 rounded-xl border space-y-2 card-soft-shadow ${
                verificationResult.valid
                  ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                  : 'bg-[#FEF2F2] border-[#FECACA]'
              }`}
            >
              <div className="flex items-center gap-3">
                {verificationResult.valid ? (
                  <ShieldCheck className="w-6 h-6 text-[#16865B]" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-[#D64550]" />
                )}
                <div>
                  <h4 className={`text-sm font-bold ${
                    verificationResult.valid ? 'text-[#16865B]' : 'text-[#D64550]'
                  }`}>
                    {verificationResult.valid
                      ? '✓ Integrity Verified — Hashes Match Perfectly'
                      : '⚠ Integrity Mismatch — Hash Deviation Detected'}
                  </h4>
                  <p className="text-xs text-[#64717D] mt-0.5">
                    {verificationResult.valid
                      ? 'The captured evidence matches the stored cryptographic record with zero discrepancies.'
                      : 'Stored evidence does not match the recomputed record. Data alteration detected.'}
                  </p>
                </div>
              </div>

              {!verificationResult.valid && verificationResult.discrepancies.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#FECACA] text-xs font-mono text-[#D64550] space-y-1">
                  {verificationResult.discrepancies.map((d, i) => (
                    <p key={i}>• {d}</p>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Technical Info */}
          <div className="text-xs text-[#64717D] leading-relaxed border-t border-[#EEF2F6] pt-4">
            <span className="font-bold text-[#17212B] block mb-0.5">How Integrity Verification Operates:</span>
            EvidenceTwin anchors raw optical pixels directly to the calibration matrix and classification response using linked SHA-256 digests. Any subsequent edit to the confidence score or analyte label invalidates the mathematical seal.
          </div>
        </div>
      </div>
    </div>
  );
};
