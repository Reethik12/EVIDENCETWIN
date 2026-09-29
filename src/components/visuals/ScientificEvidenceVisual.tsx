import React, { useState } from 'react';
import { Check, ShieldCheck, Eye, Layers } from 'lucide-react';

interface ScientificEvidenceVisualProps {
  className?: string;
  reactionColor?: string;
}

export const ScientificEvidenceVisual: React.FC<ScientificEvidenceVisualProps> = ({
  className = '',
  reactionColor = '#3D1C52',
}) => {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  return (
    <div className={`relative w-full max-w-xl mx-auto ${className}`}>
      {/* Floating Evidence Workstation Frame */}
      <div className="relative bg-white rounded-xl border border-[#D9E2EC] card-elevated-shadow p-5 overflow-hidden transition-all duration-300">
        
        {/* Subtle grid header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6] text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16865B]" />
            <span className="font-semibold text-[#17212B]">OPTICAL EVIDENCE RECONSTRUCTION</span>
          </div>
          <span className="font-mono text-[11px] text-[#64717D]">CIE D65 // CALIBRATED</span>
        </div>

        {/* Central Visualization Stage */}
        <div className="relative my-4 aspect-[16/10] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] overflow-hidden flex items-center justify-center select-none">
          {/* Scientific coordinate grid */}
          <div className="absolute inset-0 scientific-subtle-grid pointer-events-none opacity-60" />

          {/* Calibrated Target Specimen */}
          <div className="relative w-[85%] h-[80%] bg-white rounded-md border border-[#CBD5E1] card-soft-shadow p-4 flex gap-4 items-center">
            
            {/* 1. Reference Card Section */}
            <div
              onMouseEnter={() => setHoveredZone('reference')}
              onMouseLeave={() => setHoveredZone(null)}
              className={`w-1/3 h-full rounded border transition-all p-2 flex flex-col justify-between cursor-pointer ${
                hoveredZone === 'reference'
                  ? 'border-[#1769AA] bg-[#F0F7FD] shadow-sm'
                  : 'border-[#E2E8F0] bg-[#FAFBFD]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] font-semibold text-[#1769AA]">15-PATCH REF</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#16865B]" />
              </div>

              {/* 15 reference color tiles in 3 rows x 5 columns */}
              <div className="grid grid-cols-5 gap-1 my-auto">
                <div className="h-3.5 rounded-[2px] bg-[#B23A22]" title="R1 Red" />
                <div className="h-3.5 rounded-[2px] bg-[#F0C808]" title="R1 Yellow" />
                <div className="h-3.5 rounded-[2px] bg-[#2A9D8F]" title="R1 Green" />
                <div className="h-3.5 rounded-[2px] bg-[#00A3D9]" title="R1 Cyan" />
                <div className="h-3.5 rounded-[2px] bg-[#1D3557]" title="R1 Blue" />

                <div className="h-3.5 rounded-[2px] bg-[#D63384]" title="R2 Magenta" />
                <div className="h-3.5 rounded-[2px] bg-[#6A0572]" title="R2 Violet" />
                <div className="h-3.5 rounded-[2px] bg-[#E76F51]" title="R2 Ochre" />
                <div className="h-3.5 rounded-[2px] bg-[#E9C46A]" title="R2 Sand" />
                <div className="h-3.5 rounded-[2px] bg-[#264653]" title="R2 Indigo" />

                <div className="h-3.5 rounded-[2px] bg-[#F8FAFC] border border-[#CBD5E1]" title="R3 White" />
                <div className="h-3.5 rounded-[2px] bg-[#B0B8C4]" title="R3 Light Grey" />
                <div className="h-3.5 rounded-[2px] bg-[#7C8592]" title="R3 Mid Grey" />
                <div className="h-3.5 rounded-[2px] bg-[#3D4550]" title="R3 Dark Grey" />
                <div className="h-3.5 rounded-[2px] bg-[#1E242C]" title="R3 Black" />
              </div>

              <span className="text-[9px] font-mono text-[#64717D] text-center">15/15 VERIFIED (PASS)</span>
            </div>

            {/* 2. Reaction Well (ROI) Section */}
            <div
              onMouseEnter={() => setHoveredZone('roi')}
              onMouseLeave={() => setHoveredZone(null)}
              className={`flex-1 h-full rounded border transition-all p-3 flex flex-col justify-between cursor-pointer ${
                hoveredZone === 'roi'
                  ? 'border-[#18A6A6] bg-[#F0FDFC] shadow-sm'
                  : 'border-[#E2E8F0] bg-[#FAFBFD]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] font-semibold text-[#18A6A6]">REACTION ROI</span>
                <span className="text-[9px] font-mono text-[#64717D]">CONF 94%</span>
              </div>

              {/* Reaction Solution Well Preview */}
              <div className="my-auto flex items-center justify-center gap-3">
                <div className="relative w-12 h-14 rounded-md border border-[#94A3B8] shadow-inner overflow-hidden flex items-end">
                  <div
                    className="w-full h-10 transition-colors duration-500"
                    style={{ backgroundColor: reactionColor }}
                  />
                  {/* Meniscus reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
                </div>
                <div className="text-left font-mono text-[10px]">
                  <p className="text-[#17212B] font-semibold">MARQUIS</p>
                  <p className="text-[#64717D]">λ 560nm Peak</p>
                  <span className="text-[#16865B] font-medium text-[9px] flex items-center gap-0.5 mt-0.5">
                    <Check className="w-2.5 h-2.5" /> Calibrated
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono text-[#64717D]">
                <span>SNR: 34.2 dB</span>
                <span className="text-[#1769AA]">POSITIVE FIT</span>
              </div>
            </div>
          </div>

          {/* Optical Corner Precision Marks */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#94A3B8]" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#94A3B8]" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#94A3B8]" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#94A3B8]" />
        </div>

        {/* Status Callout Labels (Clean Light Badges) */}
        <div className="grid grid-cols-3 gap-2 text-xs pt-1">
          <div className="flex items-center gap-1.5 p-2 rounded-md bg-[#F0FDF4] border border-[#DCFCE7] text-[#16865B]">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium text-[11px] truncate">Reference Card ✓</span>
          </div>

          <div className="flex items-center gap-1.5 p-2 rounded-md bg-[#EFF6FF] border border-[#DBEAFE] text-[#1769AA]">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium text-[11px] truncate">Calibration ✓</span>
          </div>

          <div className="flex items-center gap-1.5 p-2 rounded-md bg-[#F0FDF4] border border-[#DCFCE7] text-[#16865B]">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium text-[11px] truncate">Image Quality ✓</span>
          </div>
        </div>
      </div>
    </div>
  );
};
