import React, { useEffect, useState } from 'react';
import { EvidenceTwinLogo } from '../common/EvidenceTwinLogo';
import { ShieldCheck, Cpu, Database, CheckCircle2 } from 'lucide-react';

interface SystemInitializationProps {
  onComplete: () => void;
}

export const SystemInitialization: React.FC<SystemInitializationProps> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 200);
    const timer2 = setTimeout(() => setStage(2), 500);
    const timer3 = setTimeout(() => setStage(3), 800);
    const timer4 = setTimeout(() => setStage(4), 1100);
    const timer5 = setTimeout(() => {
      onComplete();
    }, 1450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F5F7FA]/95 backdrop-blur-sm px-4 select-none">
      <div className="w-full max-w-md bg-white border border-[#D9E2EC] rounded-xl p-6 card-elevated-shadow">
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#EEF2F6]">
          <EvidenceTwinLogo size={34} />
          <div>
            <h2 className="text-base font-bold text-[#17212B] tracking-tight">EvidenceTwin</h2>
            <p className="text-xs text-[#64717D]">Digital Companion for Field Drug Testing</p>
          </div>
        </div>

        {/* Diagnostic Checklist */}
        <div className="my-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-2 text-[#17212B] font-medium">
              <Cpu className="w-4 h-4 text-[#1769AA]" /> Optical Evidence Engine
            </span>
            <span className={stage >= 1 ? 'text-[#16865B] font-semibold' : 'text-[#8A96A3]'}>
              {stage >= 1 ? 'Ready' : 'Checking...'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-2 text-[#17212B] font-medium">
              <ShieldCheck className="w-4 h-4 text-[#18A6A6]" /> Colour Calibration Matrix
            </span>
            <span className={stage >= 2 ? 'text-[#16865B] font-semibold' : 'text-[#8A96A3]'}>
              {stage >= 2 ? 'Ready' : 'Checking...'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-2 text-[#17212B] font-medium">
              <Database className="w-4 h-4 text-[#1769AA]" /> Cryptographic Seal Suite
            </span>
            <span className={stage >= 3 ? 'text-[#16865B] font-semibold' : 'text-[#8A96A3]'}>
              {stage >= 3 ? 'Locked' : 'Checking...'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-2 text-[#17212B] font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#16865B]" /> Reagent Analysis Engine
            </span>
            <span className={stage >= 4 ? 'text-[#16865B] font-semibold' : 'text-[#8A96A3]'}>
              {stage >= 4 ? 'Ready' : 'Standby...'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#EEF2F6] h-1.5 rounded-full overflow-hidden mb-3">
          <div
            className="bg-[#1769AA] h-full transition-all duration-300 rounded-full"
            style={{ width: `${(stage / 4) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8A96A3] font-mono">
          <span>Forensic Standard Edition // v2.6</span>
          <span>v2.4-FIELD</span>
        </div>
      </div>
    </div>
  );
};
