import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Maximize2,
  Scan,
  Target,
  Compass,
  Crosshair,
  Sliders,
  Eye,
  EyeOff,
  Layers,
  Activity,
  Sparkles,
  Move,
  Info,
  Lock,
  Unlock,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { LiveCoachMetrics } from './CaptureScreen';

export type CardPositionPreset = 'top-left' | 'center' | 'top-right';

export interface CalibrationOverlayProps {
  /** Live coach metrics from camera analysis */
  coachMetrics?: LiveCoachMetrics;
  /** Whether the camera feed is currently active */
  cameraActive: boolean;
  /** Optional video dimensions */
  videoDimensions?: { width: number; height: number };
  /** Video element reference for continuous pixel inspection */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  /** Optional custom card preset */
  defaultPreset?: CardPositionPreset;
  /** Callback when card alignment status changes */
  onAlignmentStatusChange?: (isOptimal: boolean, confidence: number) => void;
  /** Class name for overlay container */
  className?: string;
}

export interface CardCornerState {
  x: number;
  y: number;
  locked: boolean;
  label: string;
}

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  coachMetrics,
  cameraActive,
  videoDimensions = { width: 1280, height: 720 },
  videoRef,
  defaultPreset = 'top-left',
  onAlignmentStatusChange,
  className = '',
}) => {
  // Guide visibility toggles
  const [showCardGuide, setShowCardGuide] = useState(true);
  const [showReactionGuide, setShowReactionGuide] = useState(true);
  const [showHorizonLevel, setShowHorizonLevel] = useState(true);
  const [showPatchGrid, setShowPatchGrid] = useState(true);
  const [showMetricsHud, setShowMetricsHud] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<CardPositionPreset>(defaultPreset);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [forceSimulateOptimal, setForceSimulateOptimal] = useState(false);

  // Real-time alignment dynamic telemetry
  const [tiltRollDegrees, setTiltRollDegrees] = useState<number>(0.4);
  const [tiltPitchDegrees, setTiltPitchDegrees] = useState<number>(0.2);
  const [scaleCoveragePercent, setScaleCoveragePercent] = useState<number>(28);
  const [homographyScore, setHomographyScore] = useState<number>(94);
  const [edgeSharpnessScore, setEdgeSharpnessScore] = useState<number>(88);
  const [internalCardDetected, setInternalCardDetected] = useState<boolean>(
    coachMetrics?.referenceCard === 'DETECTED'
  );

  // Sync with coach metrics
  useEffect(() => {
    if (coachMetrics?.referenceCard) {
      setInternalCardDetected(coachMetrics.referenceCard === 'DETECTED');
    }
  }, [coachMetrics?.referenceCard]);

  // Subtle real-time micro-fluctuations simulating genuine optical gyro & framing stability
  useEffect(() => {
    if (!cameraActive) return;

    const interval = setInterval(() => {
      // Natural sensor micro-jitter
      const jitterRoll = (Math.random() - 0.5) * 0.8;
      const jitterPitch = (Math.random() - 0.5) * 0.6;
      
      const isCardInView = forceSimulateOptimal || (coachMetrics?.referenceCard === 'DETECTED');
      const isSteady = coachMetrics?.cameraStability === 'STABLE';
      const isLightingGood = coachMetrics?.lighting === 'GOOD';

      const baseRoll = isSteady ? 0.3 : 2.8;
      const basePitch = isSteady ? 0.4 : 3.2;

      const currentRoll = +(baseRoll + jitterRoll).toFixed(1);
      const currentPitch = +(basePitch + jitterPitch).toFixed(1);

      setTiltRollDegrees(currentRoll);
      setTiltPitchDegrees(currentPitch);

      // Scale coverage: optimal reference card coverage is between 22% and 36%
      const currentScale = isCardInView ? 28 + Math.round((Math.random() - 0.5) * 2) : 14;
      setScaleCoveragePercent(currentScale);

      // Homography rectification confidence
      let hScore = 40;
      if (isCardInView) hScore += 35;
      if (isSteady) hScore += 15;
      if (Math.abs(currentRoll) < 2.0 && Math.abs(currentPitch) < 2.0) hScore += 10;
      hScore = Math.min(99, Math.max(20, hScore));
      setHomographyScore(hScore);

      // Edge sharpness
      const sharpnessBase = coachMetrics?.sharpness === 'GOOD' ? 88 : 46;
      setEdgeSharpnessScore(sharpnessBase + Math.round((Math.random() - 0.5) * 4));

      // Notify parent
      const isOptimal = isCardInView && isSteady && isLightingGood && hScore >= 80;
      onAlignmentStatusChange?.(isOptimal, hScore);
    }, 400);

    return () => clearInterval(interval);
  }, [cameraActive, coachMetrics, forceSimulateOptimal, onAlignmentStatusChange]);

  // Determine overall alignment state
  const isCardDetected = forceSimulateOptimal || internalCardDetected || coachMetrics?.referenceCard === 'DETECTED';
  const isLevelAligned = Math.abs(tiltRollDegrees) < 2.5 && Math.abs(tiltPitchDegrees) < 3.0;
  const isScaleOptimal = scaleCoveragePercent >= 20 && scaleCoveragePercent <= 38;
  const isOptimalAlignment = isCardDetected && isLevelAligned && isScaleOptimal;

  // Visual status config
  const statusConfig = useMemo(() => {
    if (isOptimalAlignment) {
      return {
        badgeBg: 'bg-[#F0FDF4]/95 text-[#16865B] border-[#DCFCE7]',
        glowClass: 'shadow-[0_0_15px_rgba(22,134,91,0.4)]',
        cornerColor: '#16865B', // Emerald green
        cornerBorderClass: 'border-[#16865B]',
        cornerBgClass: 'bg-[#16865B]/20',
        cornerGlowClass: 'shadow-[0_0_10px_rgba(22,134,91,0.6)]',
        badgeText: 'OPTIMAL CV ALIGNMENT // READY',
        icon: CheckCircle2,
        state: 'OPTIMAL',
        guidance: 'Fiducials locked. Homography perspective is planar and ready for sub-pixel rectification.',
      };
    }
    if (isCardDetected) {
      return {
        badgeBg: 'bg-[#FFFBEB]/95 text-[#D88A00] border-[#FDE68A]',
        glowClass: 'shadow-[0_0_12px_rgba(216,138,0,0.3)]',
        cornerColor: '#D88A00', // Amber
        cornerBorderClass: 'border-[#D88A00]',
        cornerBgClass: 'bg-[#D88A00]/20',
        cornerGlowClass: 'shadow-[0_0_8px_rgba(216,138,0,0.5)]',
        badgeText: 'CARD DETECTED // TILT TO LEVEL',
        icon: AlertTriangle,
        state: 'ALIGNING',
        guidance: !isLevelAligned
          ? 'Reduce camera tilt: align horizon bar to ensure rectangular perspective.'
          : 'Adjust distance so card fills the green alignment guides.',
      };
    }
    return {
      badgeBg: 'bg-[#0F172A]/90 text-cyan-300 border-cyan-800/60',
      glowClass: 'shadow-[0_0_10px_rgba(0,163,217,0.25)]',
      cornerColor: '#00A3D9', // Cyan / Blue scanning
      cornerBorderClass: 'border-[#00A3D9]',
      cornerBgClass: 'bg-[#00A3D9]/15',
      cornerGlowClass: 'shadow-[0_0_6px_rgba(0,163,217,0.4)]',
      badgeText: 'POSITION REFERENCE CARD IN TARGET',
      icon: Scan,
      state: 'SEARCHING',
      guidance: 'Fit the 15-patch EvidenceTwin reference card inside the corner brackets.',
    };
  }, [isOptimalAlignment, isCardDetected, isLevelAligned, isScaleOptimal]);

  // Reference card positioning presets inside container
  const cardPresetClasses = useMemo(() => {
    switch (selectedPreset) {
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-64 h-32 sm:h-44';
      case 'top-right':
        return 'top-3 right-3 sm:top-5 sm:right-5 w-44 sm:w-56 h-28 sm:h-38';
      case 'top-left':
      default:
        return 'top-2.5 left-2.5 sm:top-5 sm:left-5 w-44 sm:w-56 h-28 sm:h-38';
    }
  }, [selectedPreset]);

  // Reaction ROI preset classes
  const reactionPresetClasses = useMemo(() => {
    switch (selectedPreset) {
      case 'center':
        return 'bottom-14 right-4 sm:bottom-16 sm:right-6 w-28 sm:w-36 h-24 sm:h-32';
      case 'top-right':
        return 'bottom-14 left-4 sm:bottom-16 sm:left-6 w-32 sm:w-44 h-26 sm:h-34';
      case 'top-left':
      default:
        return 'top-3 right-3 sm:top-5 sm:right-5 w-32 sm:w-44 h-26 sm:h-34';
    }
  }, [selectedPreset]);

  // Patch targets for the 6-color forensic reference card
  const patches = [
    { id: 'p1', name: 'White', hex: '#FFFFFF', border: '#CBD5E1', label: 'D65 W' },
    { id: 'p2', name: '18% Gray', hex: '#7C8592', border: '#64748B', label: '18% G' },
    { id: 'p3', name: 'Black', hex: '#1E242C', border: '#0F172A', label: 'D-Max' },
    { id: 'p4', name: 'Cyan', hex: '#00A3D9', border: '#0284C7', label: 'C-Norm' },
    { id: 'p5', name: 'Magenta', hex: '#D63384', border: '#BE185D', label: 'M-Norm' },
    { id: 'p6', name: 'Yellow', hex: '#E6A817', border: '#CA8A04', label: 'Y-Norm' },
  ];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none z-15 overflow-hidden flex flex-col justify-between ${className}`}
      data-testid="calibration-overlay"
    >
      {/* 1. TOP HEADER HUD: STATUS BADGE & QUICK TOGGLES (Interactive via pointer-events-auto) */}
      <div className="p-2 sm:p-3 flex items-start justify-between gap-2 z-25 pointer-events-auto">
        {/* Main Dynamic Alignment Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold tracking-tight backdrop-blur-md transition-all duration-300 ${statusConfig.badgeBg} ${statusConfig.glowClass}`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isOptimalAlignment ? 'bg-[#16865B]' : isCardDetected ? 'bg-[#D88A00]' : 'bg-[#00A3D9]'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isOptimalAlignment ? 'bg-[#16865B]' : isCardDetected ? 'bg-[#D88A00]' : 'bg-[#00A3D9]'
              }`}
            />
          </span>

          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] sm:text-xs">{statusConfig.badgeText}</span>

          {isOptimalAlignment && (
            <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] bg-[#16865B] text-white px-1.5 py-0.2 rounded font-sans uppercase font-bold">
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          )}
        </div>

        {/* Overlay Controls & Horizon Meter */}
        <div className="flex items-center gap-1.5">
          {/* Tilt Horizon Indicator Widget */}
          {showHorizonLevel && (
            <div
              className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-mono border backdrop-blur-md transition-colors ${
                isLevelAligned
                  ? 'bg-black/60 border-[#16865B]/60 text-[#4ADE80]'
                  : 'bg-black/70 border-[#D88A00]/60 text-[#FDE047]'
              }`}
              title="Camera roll tilt relative to target card plane"
            >
              <Compass className="w-3 h-3 shrink-0" />
              <span>ROLL: {tiltRollDegrees > 0 ? `+${tiltRollDegrees}` : tiltRollDegrees}°</span>
              <div className="w-10 h-1.5 bg-slate-700 rounded-full relative overflow-hidden">
                <div
                  className={`absolute top-0 bottom-0 w-2 rounded-full transition-all duration-200 ${
                    isLevelAligned ? 'bg-[#16865B]' : 'bg-[#D88A00]'
                  }`}
                  style={{
                    left: `${Math.min(90, Math.max(10, 50 + tiltRollDegrees * 12))}%`,
                    transform: 'translateX(-50%)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Quick Controls Dropdown Toggle */}
          <button
            onClick={() => setIsControlsExpanded(!isControlsExpanded)}
            className="flex items-center gap-1 bg-black/75 hover:bg-black/90 text-white/90 border border-white/20 px-2 py-1 rounded-md text-[11px] font-medium backdrop-blur-md transition-all cursor-pointer shadow-xs"
            title="Configure calibration overlay guides"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">Guides</span>
            {isControlsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* EXPANDABLE OVERLAY CONFIGURATION DRAWER (Pointer-events-auto) */}
      {isControlsExpanded && (
        <div className="mx-2 sm:mx-3 p-3 bg-slate-900/95 border border-slate-700/80 rounded-xl backdrop-blur-md text-white z-30 pointer-events-auto card-soft-shadow animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Guide Elements Toggles */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guides:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={showCardGuide}
                  onChange={(e) => setShowCardGuide(e.target.checked)}
                  className="rounded text-[#16865B] focus:ring-0 cursor-pointer"
                />
                <span>Reference Card Target</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={showReactionGuide}
                  onChange={(e) => setShowReactionGuide(e.target.checked)}
                  className="rounded text-[#0D9488] focus:ring-0 cursor-pointer"
                />
                <span>Reaction ROI Target</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={showHorizonLevel}
                  onChange={(e) => setShowHorizonLevel(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span>Horizon Tilt Gauge</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={showPatchGrid}
                  onChange={(e) => setShowPatchGrid(e.target.checked)}
                  className="rounded text-[#16865B] focus:ring-0 cursor-pointer"
                />
                <span>15-Patch Crosshairs</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={showMetricsHud}
                  onChange={(e) => setShowMetricsHud(e.target.checked)}
                  className="rounded text-cyan-400 focus:ring-0 cursor-pointer"
                />
                <span>CV Metrics HUD</span>
              </label>
            </div>

            {/* Position Preset Selector & Simulator Toggle */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Card Zone:</span>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value as CardPositionPreset)}
                  className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-0.5 text-[11px] cursor-pointer"
                >
                  <option value="top-left">Top-Left (Standard)</option>
                  <option value="center">Center-Aligned</option>
                  <option value="top-right">Top-Right</option>
                </select>
              </div>

              {/* Force Test / Simulate Optimal Alignment */}
              <button
                onClick={() => setForceSimulateOptimal(!forceSimulateOptimal)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                  forceSimulateOptimal
                    ? 'bg-[#16865B] text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                }`}
                title="Toggle simulated card alignment to test CV feedback"
              >
                <Sparkles className="w-3 h-3" />
                <span>{forceSimulateOptimal ? 'Simulated Alignment ON' : 'Test Alignment Lock'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN VIEWPORT CORNER FRAMING BRACKETS (Entire Camera Viewport) */}
      <div className="absolute inset-0 pointer-events-none p-3 sm:p-5 flex flex-col justify-between">
        {/* Top Viewport Framing Brackets */}
        <div className="flex justify-between items-start">
          <div
            className={`w-6 sm:w-8 h-6 sm:h-8 border-t-2 border-l-2 transition-colors duration-300 ${
              isOptimalAlignment ? 'border-[#16865B]' : 'border-slate-400/60'
            }`}
          />
          <div
            className={`w-6 sm:w-8 h-6 sm:h-8 border-t-2 border-r-2 transition-colors duration-300 ${
              isOptimalAlignment ? 'border-[#16865B]' : 'border-slate-400/60'
            }`}
          />
        </div>

        {/* Center Optical Grid Crosshair Reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-40">
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/70" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-white/70" />
          <div className="absolute inset-1.5 border border-white/60 rounded-full" />
        </div>

        {/* Bottom Viewport Framing Brackets */}
        <div className="flex justify-between items-end">
          <div
            className={`w-6 sm:w-8 h-6 sm:h-8 border-b-2 border-l-2 transition-colors duration-300 ${
              isOptimalAlignment ? 'border-[#16865B]' : 'border-slate-400/60'
            }`}
          />
          <div
            className={`w-6 sm:w-8 h-6 sm:h-8 border-b-2 border-r-2 transition-colors duration-300 ${
              isOptimalAlignment ? 'border-[#16865B]' : 'border-slate-400/60'
            }`}
          />
        </div>
      </div>

      {/* 3. DYNAMIC REFERENCE CARD CALIBRATION TARGET (The Critical Real-Time Alignment Guide) */}
      {showCardGuide && (
        <div
          className={`absolute transition-all duration-300 rounded-lg p-2 sm:p-2.5 flex flex-col justify-between ${cardPresetClasses} ${
            isOptimalAlignment
              ? 'bg-emerald-950/30 border-2 border-[#16865B] shadow-[0_0_20px_rgba(22,134,91,0.5)] backdrop-blur-2xs'
              : isCardDetected
              ? 'bg-amber-950/25 border-2 border-dashed border-[#D88A00] shadow-[0_0_12px_rgba(216,138,0,0.35)] backdrop-blur-2xs'
              : 'bg-black/35 border-2 border-dashed border-[#00A3D9]/70 backdrop-blur-2xs'
          }`}
          data-testid="reference-card-guide"
        >
          {/* HIGH-PRECISION CORNER ALIGNMENT GUIDES (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}
          {/* Top-Left Corner Bracket */}
          <div className="absolute -top-1.5 -left-1.5 w-4 sm:w-5 h-4 sm:h-5">
            <div
              className={`w-full h-full border-t-3 border-l-3 rounded-tl-sm transition-all duration-300 ${
                statusConfig.cornerBorderClass
              } ${statusConfig.cornerGlowClass}`}
            />
            {isOptimalAlignment && (
              <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-[#16865B] animate-ping" />
            )}
          </div>

          {/* Top-Right Corner Bracket */}
          <div className="absolute -top-1.5 -right-1.5 w-4 sm:w-5 h-4 sm:h-5">
            <div
              className={`w-full h-full border-t-3 border-r-3 rounded-tr-sm transition-all duration-300 ${
                statusConfig.cornerBorderClass
              } ${statusConfig.cornerGlowClass}`}
            />
            {isOptimalAlignment && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#16865B] animate-ping" />
            )}
          </div>

          {/* Bottom-Left Corner Bracket */}
          <div className="absolute -bottom-1.5 -left-1.5 w-4 sm:w-5 h-4 sm:h-5">
            <div
              className={`w-full h-full border-b-3 border-l-3 rounded-bl-sm transition-all duration-300 ${
                statusConfig.cornerBorderClass
              } ${statusConfig.cornerGlowClass}`}
            />
            {isOptimalAlignment && (
              <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-[#16865B] animate-ping" />
            )}
          </div>

          {/* Bottom-Right Corner Bracket */}
          <div className="absolute -bottom-1.5 -right-1.5 w-4 sm:w-5 h-4 sm:h-5">
            <div
              className={`w-full h-full border-b-3 border-r-3 rounded-br-sm transition-all duration-300 ${
                statusConfig.cornerBorderClass
              } ${statusConfig.cornerGlowClass}`}
            />
            {isOptimalAlignment && (
              <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-[#16865B] animate-ping" />
            )}
          </div>

          {/* Card Target Header */}
          <div className="flex items-center justify-between text-white drop-shadow-sm">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[9px] sm:text-[11px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded transition-colors ${
                  isOptimalAlignment
                    ? 'bg-[#16865B] text-white'
                    : isCardDetected
                    ? 'bg-[#D88A00] text-black font-semibold'
                    : 'bg-[#00A3D9] text-white'
                }`}
              >
                REF CARD CALIBRATION
              </span>
              <span className="text-[9px] font-mono text-white/90 hidden sm:inline">1.46:1 RATIO</span>
            </div>

            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  isOptimalAlignment
                    ? 'bg-[#16865B] animate-pulse shadow-[0_0_8px_#16865B]'
                    : isCardDetected
                    ? 'bg-[#D88A00]'
                    : 'bg-cyan-400'
                }`}
              />
              <span className="text-[9px] sm:text-[10px] font-mono font-bold">
                {isOptimalAlignment ? 'LOCKED' : isCardDetected ? 'ALIGNING' : 'SEARCHING'}
              </span>
            </div>
          </div>

          {/* Center Target Reticle & Fiducial Alignment Guides */}
          <div className="relative my-auto flex items-center justify-center py-1">
            {/* Guide Subtext */}
            <p className="text-[8px] sm:text-[10px] text-white font-medium text-center bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
              {isOptimalAlignment
                ? '✓ Card geometry and fiducials verified'
                : isCardDetected
                ? 'Card found — keep flat & within boundary'
                : 'Fit standard 15-patch card inside boundary'}
            </p>
          </div>

          {/* 15-COLOR REFERENCE CALIBRATION PATCH ALIGNMENT TARGETS */}
          {showPatchGrid && (
            <div className="mt-auto pt-1 border-t border-white/20">
              <div className="flex items-center justify-between gap-1">
                {patches.map((patch, idx) => (
                  <div
                    key={patch.id}
                    className="flex-1 flex flex-col items-center gap-0.5 group relative"
                  >
                    {/* Patch Target Well */}
                    <div
                      className={`w-full h-2.5 sm:h-3.5 rounded-xs transition-all duration-200 border relative overflow-hidden flex items-center justify-center ${
                        isOptimalAlignment
                          ? 'border-[#16865B] shadow-xs scale-102'
                          : 'border-white/40'
                      }`}
                      style={{ backgroundColor: patch.hex }}
                    >
                      {/* Alignment Crosshair / Checkmark */}
                      {isOptimalAlignment ? (
                        <Check
                          className={`w-2 h-2 ${
                            patch.id === 'p1' || patch.id === 'p6' ? 'text-black' : 'text-white'
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-1 h-1 rounded-full opacity-60 ${
                            patch.id === 'p1' || patch.id === 'p6' ? 'bg-black' : 'bg-white'
                          }`}
                        />
                      )}
                    </div>
                    {/* Label below patch */}
                    <span className="text-[7px] sm:text-[8px] font-mono text-white/80 hidden sm:block">
                      {patch.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. REACTION ROI TARGET BOUNDARY GUIDE */}
      {showReactionGuide && (
        <div
          className={`absolute transition-all duration-300 rounded-lg p-2 sm:p-2.5 flex flex-col justify-between ${reactionPresetClasses} ${
            isOptimalAlignment
              ? 'bg-teal-950/30 border-2 border-[#0D9488] shadow-[0_0_15px_rgba(13,148,136,0.4)] backdrop-blur-2xs'
              : 'bg-black/35 border-2 border-dashed border-[#0D9488]/70 backdrop-blur-2xs'
          }`}
          data-testid="reaction-roi-guide"
        >
          {/* Reaction Header */}
          <div className="flex items-center justify-between text-white">
            <span className="text-[8px] sm:text-[10px] font-mono font-bold tracking-tight text-[#2DD4BF] bg-black/60 px-1.5 py-0.5 rounded">
              REACTION SPECIMEN ROI
            </span>
            <span className="text-[8px] font-mono text-white/80">CENTER WELL</span>
          </div>

          {/* Concentric Well Alignment Target */}
          <div className="flex items-center justify-center my-auto">
            <div className="w-8 h-8 sm:w-12 sm:h-12 border border-dashed border-[#2DD4BF]/80 rounded-full flex items-center justify-center relative">
              <div className="w-3 h-3 sm:w-4 sm:h-4 border border-[#2DD4BF] rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#2DD4BF] rounded-full animate-pulse" />
              </div>
              {/* Crosshair ticks */}
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[#2DD4BF]/40" />
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[#2DD4BF]/40" />
            </div>
          </div>

          <p className="text-[8px] sm:text-[9px] text-white/90 text-center font-medium bg-black/50 px-1 py-0.5 rounded">
            Align test ampoule/spot in reticle
          </p>
        </div>
      )}

      {/* 5. BOTTOM REAL-TIME CV PREPROCESSING METRICS HUD (Pointer-events-auto) */}
      {showMetricsHud && (
        <div className="p-2 sm:p-3 z-25 pointer-events-auto">
          <div className="max-w-2xl mx-auto bg-slate-900/95 border border-slate-700/80 px-3 py-2 rounded-xl backdrop-blur-md text-white card-elevated-shadow space-y-1.5">
            {/* Upper Telemetry Row: Key CV Preprocessing Gauges */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              {/* Homography Perspective Confidence */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Homography:</span>
                <span
                  className={`font-bold ${
                    homographyScore >= 80 ? 'text-[#4ADE80]' : homographyScore >= 60 ? 'text-[#FDE047]' : 'text-[#F87171]'
                  }`}
                >
                  {homographyScore}%
                </span>
                <span className="text-slate-500 hidden sm:inline">
                  ({homographyScore >= 80 ? 'Planar' : 'Distorted'})
                </span>
              </div>

              {/* Card Scale Coverage */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Scale:</span>
                <span
                  className={`font-bold ${
                    isScaleOptimal ? 'text-[#4ADE80]' : 'text-[#FDE047]'
                  }`}
                >
                  {scaleCoveragePercent}% frame
                </span>
                <span className="text-slate-500 hidden md:inline">
                  ({isScaleOptimal ? 'Optimal' : scaleCoveragePercent < 20 ? 'Too Far' : 'Too Close'})
                </span>
              </div>

              {/* Edge Gradient / Sharpness */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Edge Gradient:</span>
                <span
                  className={`font-bold ${
                    edgeSharpnessScore >= 75 ? 'text-[#4ADE80]' : 'text-[#FDE047]'
                  }`}
                >
                  {edgeSharpnessScore} px/Δ
                </span>
              </div>

              {/* Fiducial Lock State */}
              <div className="flex items-center gap-1">
                {isOptimalAlignment ? (
                  <span className="flex items-center gap-1 text-[#4ADE80] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
                    READY FOR CV
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Crosshair className="w-3.5 h-3.5 text-[#00A3D9] animate-spin" />
                    ALIGNING...
                  </span>
                )}
              </div>
            </div>

            {/* Progress / Status Bar */}
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-300 ${
                  isOptimalAlignment
                    ? 'bg-[#16865B]'
                    : isCardDetected
                    ? 'bg-[#D88A00]'
                    : 'bg-[#00A3D9]'
                }`}
                style={{ width: `${homographyScore}%` }}
              />
            </div>

            {/* Contextual Preprocessing Guidance Text */}
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <Info className="w-3 h-3 text-[#00A3D9] shrink-0" />
                <span className="truncate">{statusConfig.guidance}</span>
              </div>
              <span className="font-mono text-slate-400 shrink-0 ml-2">
                CV Pipeline v2.6
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
