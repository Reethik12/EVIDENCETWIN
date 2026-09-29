import React, { useState } from 'react';
import { SQLITE_SCHEMA_DDL, evidenceDb } from '../../services/data/evidenceDatabase';
import {
  Download,
  RotateCcw,
  Check,
  User,
  Sliders,
  Database,
} from 'lucide-react';

interface SettingsViewProps {
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onDataReset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDemoMode,
  onToggleDemoMode,
  onDataReset,
}) => {
  const [operatorName, setOperatorName] = useState('Insp. R. Sharma');
  const [badgeId, setBadgeId] = useState('OP-0418');
  const [division, setDivision] = useState('Narcotics Control & Field Forensics');
  const [minReliabilityThreshold, setMinReliabilityThreshold] = useState(70);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleDownloadSchema = () => {
    const blob = new Blob([SQLITE_SCHEMA_DDL], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evidence_twin_schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetData = async () => {
    if (confirm('Reset demonstration database to factory baseline records?')) {
      await evidenceDb.resetToSeed();
      onDataReset();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-[#E2E8F0]">
        <span className="text-xs font-semibold text-[#1769AA] uppercase tracking-wide">
          Console Preferences // Forensic Edition
        </span>
        <h2 className="text-2xl font-bold text-[#17212B] mt-0.5">
          Settings
        </h2>
        <p className="text-xs text-[#64717D]">
          Field operator credentials, supervisory review thresholds, and SQLite relational database schema export.
        </p>
      </div>

      <div className="space-y-6">
        {/* Operator Profile */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 card-soft-shadow space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EEF2F6]">
            <User className="w-4 h-4 text-[#1769AA]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
              Operator Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#64717D] uppercase block mb-1">
                Operator Name
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 text-[#17212B] focus:outline-none focus:border-[#1769AA]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#64717D] uppercase block mb-1">
                Badge / Officer ID
              </label>
              <input
                type="text"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 text-[#17212B] focus:outline-none focus:border-[#1769AA]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#64717D] uppercase block mb-1">
                Division / Unit
              </label>
              <input
                type="text"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 text-[#17212B] focus:outline-none focus:border-[#1769AA]"
              />
            </div>
          </div>
        </div>

        {/* Analysis & Reliability Thresholds */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 card-soft-shadow space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EEF2F6]">
            <Sliders className="w-4 h-4 text-[#1769AA]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
              Analysis & Reliability Thresholds
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#64717D]">Manual Review Trigger Threshold</span>
                <span className="text-[#1769AA] font-bold">{minReliabilityThreshold} / 100</span>
              </div>
              <input
                type="range"
                min="50"
                max="85"
                value={minReliabilityThreshold}
                onChange={(e) => setMinReliabilityThreshold(Number(e.target.value))}
                className="w-full accent-[#1769AA] cursor-pointer"
              />
              <p className="text-xs text-[#8A96A3] mt-1">
                Field tests with an Evidence Reliability Score below {minReliabilityThreshold} will be automatically flagged for supervisor review.
              </p>
            </div>
          </div>
        </div>

        {/* Offline Field Operations & Local Sync Queue */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 card-soft-shadow space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${evidenceDb.isOfflineMode() ? 'bg-[#D88A00]' : 'bg-[#16865B]'}`} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                Field Connectivity & Offline Storage Protocol
              </h3>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
              evidenceDb.isOfflineMode()
                ? 'bg-[#FFFBEB] text-[#D88A00] border-[#FDE68A]'
                : 'bg-[#F0FDF4] text-[#16865B] border-[#DCFCE7]'
            }`}>
              {evidenceDb.isOfflineMode() ? 'Offline Mode (Local Storage)' : 'Online (Direct Encrypted Sync)'}
            </span>
          </div>

          <p className="text-xs text-[#64717D] leading-relaxed">
            When deployed at remote border checkpoints or areas with zero cellular connectivity, enable Offline Protocol. Field records will be cryptographically sealed and saved locally, then queued for cloud custody sync once back in range.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const nextState = !evidenceDb.isOfflineMode();
                  evidenceDb.setOfflineMode(nextState);
                  onDataReset();
                }}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  evidenceDb.isOfflineMode()
                    ? 'bg-[#D88A00] text-white border-[#D88A00]'
                    : 'bg-white hover:bg-[#FAFBFD] text-[#17212B] border-[#CBD5E1]'
                }`}
              >
                {evidenceDb.isOfflineMode() ? 'Disable Offline Mode' : 'Enable Offline Mode'}
              </button>

              <span className="text-xs text-[#64717D]">
                Pending Sync Queue: <strong className="text-[#17212B] font-mono">{evidenceDb.getPendingSyncCount()}</strong> records
              </span>
            </div>

            <button
              onClick={async () => {
                await evidenceDb.syncLocalQueue();
                onDataReset();
              }}
              disabled={evidenceDb.getPendingSyncCount() === 0}
              className="px-4 py-2 bg-[#1769AA] hover:bg-[#13568C] disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Sync Queued Records Now
            </button>
          </div>
        </div>

        {/* Database & Schema Export */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 card-soft-shadow space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EEF2F6]">
            <Database className="w-4 h-4 text-[#16865B]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
              Relational Database & Portability
            </h3>
          </div>

          <p className="text-xs text-[#64717D] leading-relaxed">
            EvidenceTwin maintains a relational SQLite 3.38+ / PostgreSQL compliant schema with tables for operators, test sessions, raw evidence images, colorimetric calibration matrices, and chained SHA-256 evidence records.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleDownloadSchema}
              className="px-4 py-2 bg-[#EBF3FB] hover:bg-[#DBEAFE] text-[#1769AA] text-xs font-semibold rounded-lg border border-[#BFDBFE] transition-colors flex items-center gap-2 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export SQLite Schema (schema.sql)</span>
            </button>

            <button
              onClick={handleResetData}
              className="px-4 py-2 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Benchmark Data</span>
            </button>

            {resetSuccess && (
              <span className="text-xs font-semibold text-[#16865B] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Baseline reset successful
              </span>
            )}
          </div>
        </div>

        {/* System Version & Forensic Disclaimer */}
        <div className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl p-5 text-xs text-[#8A96A3] space-y-2">
          <div className="flex items-center justify-between text-[#64717D]">
            <span>System: EvidenceTwin (Forensic Standard Edition)</span>
            <span className="text-[#1769AA] font-semibold">Build 2026.09</span>
          </div>
          <p className="leading-relaxed">
            Legal Notice: EvidenceTwin Field Companion. All field test classifications are presumptive and require certified confirmatory laboratory testing.
          </p>
        </div>
      </div>
    </div>
  );
};
