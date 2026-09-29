import React, { useState } from 'react';
import {
  TemporalReactionSignature,
  TemporalFramePoint,
  StabilizationStatus,
  TemporalComparisonStatus
} from '../../types/evidence';
import {
  Activity,
  Clock,
  Gauge,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Info
} from 'lucide-react';

interface TemporalTrajectoryVisualProps {
  signature: TemporalReactionSignature;
}

export const TemporalTrajectoryVisual: React.FC<TemporalTrajectoryVisualProps> = ({ signature }) => {
  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(signature.trajectory.length - 1);
  const [activeMetricView, setActiveMetricView] = useState<'DELTA_E' | 'VELOCITY' | 'LAB'>('DELTA_E');

  const trajectory = signature.trajectory || [];
  const selectedPoint: TemporalFramePoint | undefined = trajectory[selectedPointIndex] || trajectory[trajectory.length - 1];

  const maxDeltaE = Math.max(1, signature.peakColourChangeDeltaE, ...trajectory.map((p) => p.deltaEFromInitial));
  const maxVelocity = Math.max(0.5, signature.peakVelocityDeltaEPerSec, ...trajectory.map((p) => p.deltaEPerSec));

  const isStable = signature.stabilizationStatus === 'STABLE';
  const isDeveloping = signature.stabilizationStatus === 'DEVELOPING';
  const isUnstable = signature.stabilizationStatus === 'UNSTABLE';

  return (
    <div className="space-y-5">
      {/* FEATURE 5: Reaction Stabilization Detection Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isStable
            ? 'bg-[#F0FDF4] border-[#DCFCE7] text-[#166534]'
            : isDeveloping
            ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
            : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
        }`}
      >
        <div className="flex items-center gap-3">
          {isStable ? (
            <CheckCircle2 className="w-5 h-5 text-[#16865B] shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#D88A00] shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider">
                {isStable
                  ? 'REACTION APPEARS STABLE'
                  : isDeveloping
                  ? 'REACTION STILL CHANGING'
                  : 'REACTION KINETICS UNSTABLE'}
              </span>
              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-white/80 shadow-2xs">
                STATUS: {signature.stabilizationStatus}
              </span>
            </div>
            <p className="text-xs mt-0.5 opacity-90">
              {isStable
                ? `Kinetic rate plateaued at t = ${signature.stabilizationTimeSeconds || 14}s. Peak velocity was ${signature.peakVelocityDeltaEPerSec} ΔE/sec.`
                : 'Reaction velocity remains above stabilization threshold. Officer extended observation or manual review advised.'}
            </p>
          </div>
        </div>

        {/* FEATURE 6: Temporal Profile Comparison Badge */}
        <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] uppercase font-bold text-[#64717D]">Kinetic Profile:</span>
          <span
            className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md border ${
              signature.temporalComparisonStatus === 'CONSISTENT'
                ? 'bg-[#EBF3FB] border-[#BFDBFE] text-[#1769AA]'
                : signature.temporalComparisonStatus === 'PARTIALLY_CONSISTENT'
                ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D88A00]'
                : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#64717D]'
            }`}
          >
            {signature.temporalComparisonStatus}
          </span>
        </div>
      </div>

      {/* FEATURE 1 & 2: Chromatic Swatch Progression Strip */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl card-soft-shadow space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F6]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1769AA]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
              Temporal Reaction Chromatic Progression (t0 &rarr; t{signature.observationDuration}s)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[#64717D]">
            {signature.frameCount} frames sampled ({signature.samplingInterval}s interval)
          </span>
        </div>

        {/* Swatch Timeline Bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 px-1">
          {trajectory.map((point, idx) => {
            const isSelected = idx === selectedPointIndex;
            return (
              <button
                key={idx}
                onClick={() => setSelectedPointIndex(idx)}
                className={`group flex flex-col items-center gap-1.5 transition-all cursor-pointer p-1 rounded-md ${
                  isSelected ? 'bg-[#EBF3FB] ring-2 ring-[#1769AA]' : 'hover:bg-[#F8FAFC]'
                }`}
                title={`Frame #${idx + 1} at t=${point.timestampSeconds}s`}
              >
                <div
                  className="w-7 h-9 rounded-sm border border-[#CBD5E1] shadow-2xs transition-transform group-hover:scale-105"
                  style={{ backgroundColor: point.colorHex }}
                />
                <span className="text-[9px] font-mono text-[#64717D] group-hover:text-[#17212B]">
                  {point.timestampSeconds}s
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-[#8A96A3] font-mono">
          Click any temporal frame above to inspect individual time-point optical features and kinetics.
        </p>
      </div>

      {/* FEATURE 2 & 3: Interactive Time Series Multi-Graph */}
      <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF2F6]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1769AA]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
              Reaction Dynamics vs Time Series
            </h4>
          </div>

          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveMetricView('DELTA_E')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                activeMetricView === 'DELTA_E' ? 'bg-[#1769AA] text-white' : 'text-[#64717D] hover:text-[#17212B]'
              }`}
            >
              ΔE from Baseline
            </button>
            <button
              onClick={() => setActiveMetricView('VELOCITY')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                activeMetricView === 'VELOCITY' ? 'bg-[#1769AA] text-white' : 'text-[#64717D] hover:text-[#17212B]'
              }`}
            >
              Velocity (ΔE/sec)
            </button>
            <button
              onClick={() => setActiveMetricView('LAB')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                activeMetricView === 'LAB' ? 'bg-[#1769AA] text-white' : 'text-[#64717D] hover:text-[#17212B]'
              }`}
            >
              CIE L*a*b* Channels
            </button>
          </div>
        </div>

        {/* SVG Time Series Graph */}
        <div className="relative w-full h-56 bg-[#FAFBFD] border border-[#EEF2F6] rounded-lg p-3">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
            {/* Horizontal Grid lines */}
            <line x1="30" y1="20" x2="490" y2="20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="30" y1="70" x2="490" y2="70" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="30" y1="120" x2="490" y2="120" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="30" y1="160" x2="490" y2="160" stroke="#CBD5E1" strokeWidth="1.5" />

            {/* View 1: ΔE from Initial */}
            {activeMetricView === 'DELTA_E' && (
              <>
                {/* Area under curve */}
                <path
                  d={
                    `M 30 160 ` +
                    trajectory
                      .map((p, i) => {
                        const x = 30 + (i / Math.max(1, trajectory.length - 1)) * 460;
                        const y = 160 - (p.deltaEFromInitial / maxDeltaE) * 140;
                        return `L ${x} ${y}`;
                      })
                      .join(' ') +
                    ` L 490 160 Z`
                  }
                  fill="#1769AA"
                  fillOpacity="0.12"
                />

                {/* Primary curve */}
                <path
                  d={
                    `M ` +
                    trajectory
                      .map((p, i) => {
                        const x = 30 + (i / Math.max(1, trajectory.length - 1)) * 460;
                        const y = 160 - (p.deltaEFromInitial / maxDeltaE) * 140;
                        return `${x} ${y}`;
                      })
                      .join(' L ')
                  }
                  fill="none"
                  stroke="#1769AA"
                  strokeWidth="2.5"
                />

                {/* Data points */}
                {trajectory.map((p, i) => {
                  const x = 30 + (i / Math.max(1, trajectory.length - 1)) * 460;
                  const y = 160 - (p.deltaEFromInitial / maxDeltaE) * 140;
                  const isSel = i === selectedPointIndex;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={isSel ? 5 : 3}
                      fill={p.colorHex}
                      stroke={isSel ? '#1769AA' : '#FFFFFF'}
                      strokeWidth={isSel ? 2.5 : 1}
                      className="cursor-pointer"
                      onClick={() => setSelectedPointIndex(i)}
                    />
                  );
                })}
              </>
            )}

            {/* View 2: Reaction Velocity (ΔE/sec) */}
            {activeMetricView === 'VELOCITY' && (
              <>
                <path
                  d={
                    `M 30 160 ` +
                    trajectory
                      .map((p, i) => {
                        const x = 30 + (i / Math.max(1, trajectory.length - 1)) * 460;
                        const y = 160 - (p.deltaEPerSec / maxVelocity) * 140;
                        return `L ${x} ${y}`;
                      })
                      .join(' ') +
                    ` L 490 160 Z`
                  }
                  fill="#18A6A6"
                  fillOpacity="0.15"
                />

                <path
                  d={
                    `M ` +
                    trajectory
                      .map((p, i) => {
                        const x = 30 + (i / Math.max(1, trajectory.length - 1)) * 460;
                        const y = 160 - (p.deltaEPerSec / maxVelocity) * 140;
                        return `${x} ${y}`;
                      })
                      .join(' L ')
                  }
                  fill="none"
                  stroke="#0D9488"
                  strokeWidth="2.5"
                />

                {trajectory.map((p, i) => {
                  const x = 30 + (i / Math.max(1, trajectory.length - 1)) * 460;
                  const y = 160 - (p.deltaEPerSec / maxVelocity) * 140;
                  const isSel = i === selectedPointIndex;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={isSel ? 5 : 3}
                      fill="#0D9488"
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                      className="cursor-pointer"
                      onClick={() => setSelectedPointIndex(i)}
                    />
                  );
                })}
              </>
            )}

            {/* View 3: Multi-Channel CIE Lab (L*, a*, b*) */}
            {activeMetricView === 'LAB' && (
              <>
                {/* L* (Luminance) line in Dark Slate */}
                <path
                  d={
                    `M ` +
                    trajectory
                      .map((p, i) => {
                        const x = 30 + (i / Math.max(1, trajectory.length - 1)) * 460;
                        const y = 160 - (p.lab.L / 100) * 140;
                        return `${x} ${y}`;
                      })
                      .join(' L ')
                  }
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2"
                />
                {/* a* (Red-Green) line in Magenta/Pink */}
                <path
                  d={
                    `M ` +
                    trajectory
                      .map((p, i) => {
                        const x = 30 + (i / Math.max(1, trajectory.length - 1)) * 460;
                        const y = 100 - (p.lab.a / 80) * 60;
                        return `${x} ${y}`;
                      })
                      .join(' L ')
                  }
                  fill="none"
                  stroke="#D63384"
                  strokeWidth="2"
                />
                {/* b* (Yellow-Blue) line in Amber */}
                <path
                  d={
                    `M ` +
                    trajectory
                      .map((p, i) => {
                        const x = 30 + (i / Math.max(1, trajectory.length - 1)) * 460;
                        const y = 100 - (p.lab.b / 80) * 60;
                        return `${x} ${y}`;
                      })
                      .join(' L ')
                  }
                  fill="none"
                  stroke="#E6A817"
                  strokeWidth="2"
                />
              </>
            )}

            {/* Vertical Marker for Selected Point */}
            {selectedPoint && (
              <line
                x1={30 + (selectedPointIndex / Math.max(1, trajectory.length - 1)) * 460}
                y1="10"
                x2={30 + (selectedPointIndex / Math.max(1, trajectory.length - 1)) * 460}
                y2="160"
                stroke="#1769AA"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            )}
          </svg>

          {/* Graph Legend */}
          <div className="absolute top-2 right-4 flex items-center gap-3 text-[10px] font-mono text-[#64717D] bg-white/90 px-2 py-1 rounded border border-[#E2E8F0]">
            {activeMetricView === 'DELTA_E' && (
              <span className="flex items-center gap-1 font-semibold text-[#1769AA]">
                <span className="w-2.5 h-0.5 bg-[#1769AA]" /> Cumulative ΔE (Peak: {signature.peakColourChangeDeltaE})
              </span>
            )}
            {activeMetricView === 'VELOCITY' && (
              <span className="flex items-center gap-1 font-semibold text-[#0D9488]">
                <span className="w-2.5 h-0.5 bg-[#0D9488]" /> Reaction Velocity (Peak: {signature.peakVelocityDeltaEPerSec} ΔE/s)
              </span>
            )}
            {activeMetricView === 'LAB' && (
              <>
                <span className="flex items-center gap-1 text-[#334155]">
                  <span className="w-2.5 h-0.5 bg-[#334155]" /> L* (Luma)
                </span>
                <span className="flex items-center gap-1 text-[#D63384]">
                  <span className="w-2.5 h-0.5 bg-[#D63384]" /> a* (Red-Green)
                </span>
                <span className="flex items-center gap-1 text-[#E6A817]">
                  <span className="w-2.5 h-0.5 bg-[#E6A817]" /> b* (Yellow-Blue)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Selected Temporal Point Detailed Telemetry Panel */}
        {selectedPoint && (
          <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="flex items-center gap-2.5 col-span-2 md:col-span-1">
              <div
                className="w-10 h-10 rounded-md border border-[#CBD5E1] shadow-xs"
                style={{ backgroundColor: selectedPoint.colorHex }}
              />
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8A96A3] block">Frame #{selectedPoint.frameIndex + 1}</span>
                <span className="text-xs font-mono font-bold text-[#17212B]">t = {selectedPoint.timestampSeconds}s</span>
              </div>
            </div>

            <div className="p-2 rounded bg-white border border-[#EEF2F6]">
              <span className="text-[10px] text-[#8A96A3] block">RGB Color</span>
              <span className="font-mono font-bold text-[#17212B] text-[11px]">
                {selectedPoint.rgb.r}, {selectedPoint.rgb.g}, {selectedPoint.rgb.b}
              </span>
            </div>

            <div className="p-2 rounded bg-white border border-[#EEF2F6]">
              <span className="text-[10px] text-[#8A96A3] block">CIE Lab</span>
              <span className="font-mono text-[#17212B] text-[11px]">
                L* {selectedPoint.lab.L} • a* {selectedPoint.lab.a} • b* {selectedPoint.lab.b}
              </span>
            </div>

            <div className="p-2 rounded bg-white border border-[#EEF2F6]">
              <span className="text-[10px] text-[#8A96A3] block">Cumulative Shift</span>
              <span className="font-mono font-bold text-[#1769AA] text-[11px]">
                ΔE = {selectedPoint.deltaEFromInitial}
              </span>
            </div>

            <div className="p-2 rounded bg-white border border-[#EEF2F6]">
              <span className="text-[10px] text-[#8A96A3] block">Current Velocity</span>
              <span className="font-mono font-bold text-[#0D9488] text-[11px]">
                {selectedPoint.deltaEPerSec} ΔE / sec
              </span>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 text-[11px] text-[#64717D] pt-1">
          <Info className="w-3.5 h-3.5 text-[#1769AA] shrink-0 mt-0.5" />
          <p className="leading-snug">{signature.engineeringDisclaimer}</p>
        </div>
      </div>
    </div>
  );
};
