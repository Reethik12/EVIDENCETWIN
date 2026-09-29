import React from 'react';
import { ShieldCheck, UserCheck, Plus, CloudOff, Wifi } from 'lucide-react';
import { evidenceDb } from '../../services/data/evidenceDatabase';
import { EvidenceTwinLogo } from '../common/EvidenceTwinLogo';

interface TopConsoleHeaderProps {
  currentViewTitle: string;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onLaunchNewTest: () => void;
}

export const TopConsoleHeader: React.FC<TopConsoleHeaderProps> = ({
  currentViewTitle,
  isDemoMode,
  onToggleDemoMode,
  onLaunchNewTest,
}) => {
  const isOffline = evidenceDb.isOfflineMode();
  const pendingCount = evidenceDb.getPendingSyncCount();

  return (
    <header className="sticky top-0 z-20 flex h-14 md:h-16 w-full items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-3 md:px-8 backdrop-blur-md select-none">
      {/* Brand & View Title */}
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <div className="md:hidden shrink-0 flex items-center justify-center">
          <EvidenceTwinLogo size={26} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-bold text-[#17212B] tracking-tight truncate leading-tight">
            {currentViewTitle}
          </h1>
          <p className="md:hidden text-[10px] text-[#64717D] truncate leading-none">
            EvidenceTwin Field
          </p>
        </div>
        <span className="hidden md:inline text-xs text-[#CBD5E1]" aria-hidden="true">|</span>
        <span className="hidden lg:inline text-xs text-[#64717D] truncate">
          Forensic Digital Field Companion
        </span>
      </div>

      {/* Header Actions & Operator Badge */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 shrink-0">
        {/* Offline / Online Network Indicator */}
        <div
          title={isOffline ? 'Offline Field Mode active — records queued locally' : 'Online Encrypted Link active'}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOffline
              ? 'bg-[#FFFBEB] text-[#D88A00] border-[#FDE68A]'
              : 'bg-[#F0FDF4] text-[#16865B] border-[#DCFCE7]'
          }`}
        >
          {isOffline ? <CloudOff className="w-3 h-3 text-[#D88A00]" /> : <Wifi className="w-3 h-3 text-[#16865B]" />}
          <span className="hidden xs:inline text-[10px] sm:text-[11px] md:text-xs">
            {isOffline ? `Offline (${pendingCount})` : 'Encrypted'}
          </span>
        </div>

        {/* Demo Mode Toggle */}
        <button
          onClick={onToggleDemoMode}
          title="Toggle Demonstration Mode vs Live Field Protocol"
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium transition-colors cursor-pointer min-h-[32px] touch-manipulation ${
            isDemoMode
              ? 'bg-[#EBF3FB] text-[#1769AA] border border-[#BFDBFE]'
              : 'bg-[#F1F5F9] text-[#64717D] border border-[#E2E8F0]'
          }`}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isDemoMode ? 'bg-[#1769AA]' : 'bg-[#94A3B8]'}`} />
          <span>{isDemoMode ? 'Demo' : 'Live'}</span>
        </button>

        {/* Operator Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-l border-[#EEF2F6] pl-1.5 sm:pl-2.5 text-xs">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#EEF2F6] text-[#1769AA] font-semibold text-xs shrink-0">
            <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold leading-tight text-[#17212B]">Insp. R. Sharma</p>
            <p className="text-[10px] text-[#64717D] font-mono">OP-0418 · NDPS</p>
          </div>
        </div>

        {/* Desktop Primary "+ New Field Test" CTA Button (Hidden on mobile where bottom nav is present) */}
        <button
          onClick={onLaunchNewTest}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 bg-[#1769AA] hover:bg-[#13568C] text-white text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer min-h-[36px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Field Test</span>
        </button>
      </div>
    </header>
  );
};
