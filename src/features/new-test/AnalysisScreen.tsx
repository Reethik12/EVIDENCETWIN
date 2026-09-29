import React, { useState } from 'react';
import {
  PresumptiveClassification,
  EvidenceReliability,
  RobustnessAnalysis,
  ReactionROI,
  TestKitProfile,
  ReactionProfile,
  HumanInterpretation,
  ImageQualityMetrics,
  CalibrationData,
  TemporalReactionSignature,
  EnvironmentalLightingAnalysis,
  MatrixInterferenceAnalysis,
  MultiWitnessSeal
} from '../../types/evidence';
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Activity,
  Check,
  UserCheck,
  ShieldCheck,
  Sliders,
  Flag,
  Sparkles,
  Layers,
  Clock,
  Beaker,
  FileCheck,
  Lock,
  ChevronRight,
  Eye,
  Info
} from 'lucide-react';
import { WhyThisResultModal } from '../../components/modals/WhyThisResultModal';
import { SensitivityReplayModal } from '../../components/modals/SensitivityReplayModal';
import { MultiWitnessSealModal } from '../../components/modals/MultiWitnessSealModal';
import { TemporalTrajectoryVisual } from '../../components/visuals/TemporalTrajectoryVisual';
import { ColorSpaceDecompositionVisual } from '../../components/visuals/ColorSpaceDecompositionVisual';
import { MatrixInterferenceVisual } from '../../components/visuals/MatrixInterferenceVisual';
import { hexToRgb, rgbToLab, calculateDeltaE } from '../../services/engines/calibrationEngine';

interface AnalysisScreenProps {
  result: PresumptiveClassification;
  confidence: number;
  reliability: EvidenceReliability;
  robustness: RobustnessAnalysis;
  roi: ReactionROI;
  kit: TestKitProfile;
  reactionProfile?: ReactionProfile;
  temporalSignature?: TemporalReactionSignature;
  lightingAnalysis?: EnvironmentalLightingAnalysis;
  matrixInterference?: MatrixInterferenceAnalysis;
  multiWitnessSeal?: MultiWitnessSeal;
  onUpdateMultiWitnessSeal?: (seal: MultiWitnessSeal) => void;
  imageUrl?: string;
  imageQuality: ImageQualityMetrics;
  calibration: CalibrationData;
  humanInterpretation?: HumanInterpretation | null;
  onUpdateHumanInterpretation?: (interpretation: HumanInterpretation) => void;
  onProceedToRecord: () => void;
  onBackToCalibration: () => void;
  isDemoSample?: boolean;
}

type AnalysisTab =
  | 'overview'
  | 'temporal'
  | 'decomposition'
  | 'matrix'
  | 'stress'
  | 'witness';

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  result,
  confidence,
  reliability,
  robustness,
  roi,
  kit,
  reactionProfile,
  temporalSignature,
  lightingAnalysis,
  matrixInterference,
  multiWitnessSeal,
  onUpdateMultiWitnessSeal,
  imageUrl,
  imageQuality,
  calibration,
  humanInterpretation,
  onUpdateHumanInterpretation,
  onProceedToRecord,
  onBackToCalibration,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');

  // Modal states
  const [whyResultModalOpen, setWhyResultModalOpen] = useState(false);
  const [sensitivityModalOpen, setSensitivityModalOpen] = useState(false);
  const [witnessModalOpen, setWitnessModalOpen] = useState(false);

  // Manual review flag state
  const [manualReviewMarked, setManualReviewMarked] = useState<boolean>(() => {
    return reliability.status !== 'ACCEPTABLE_FOR_FIELD_ANALYSIS' || robustness.reviewRequired;
  });

  // Local human interpretation state
  const [operatorChoice, setOperatorChoice] = useState<PresumptiveClassification | null>(
    humanInterpretation?.operatorInterpretation || null
  );
  const [operatorNotes, setOperatorNotes] = useState<string>(
    humanInterpretation?.operatorNotes || ''
  );

  const isPositive = result === 'POSITIVE';
  const isNegative = result === 'NEGATIVE';
  const isInconclusive = result === 'INCONCLUSIVE';

  // Handle operator visual interpretation change
  const handleOperatorSelection = (choice: PresumptiveClassification) => {
    setOperatorChoice(choice);
    const agreementStatus: HumanInterpretation['agreementStatus'] =
      choice === result ? 'AGREEMENT' : 'DISAGREEMENT';

    if (agreementStatus === 'DISAGREEMENT') {
      setManualReviewMarked(true);
    }

    if (onUpdateHumanInterpretation) {
      onUpdateHumanInterpretation({
        operatorInterpretation: choice,
        agreementStatus,
        operatorNotes,
        recordedAt: new Date().toISOString(),
      });
    }
  };

  const handleNotesChange = (notes: string) => {
    setOperatorNotes(notes);
    if (onUpdateHumanInterpretation && operatorChoice) {
      onUpdateHumanInterpretation({
        operatorInterpretation: operatorChoice,
        agreementStatus: operatorChoice === result ? 'AGREEMENT' : 'DISAGREEMENT',
        operatorNotes: notes,
        recordedAt: new Date().toISOString(),
      });
    }
  };

  const agreementState = operatorChoice
    ? operatorChoice === result
      ? 'AGREEMENT'
      : 'DISAGREEMENT'
    : 'PENDING';

  const rawRgb = hexToRgb(roi.rawColorHex) || { r: 178, g: 121, b: 84 };
  const calRgb = hexToRgb(roi.calibratedColorHex) || { r: 165, g: 109, b: 76 };
  const lab = rgbToLab(calRgb.r, calRgb.g, calRgb.b);

  const matchedReaction = reactionProfile?.expectedColourRegions?.find((r) => r.result === result) ||
    kit.colorResponseChart?.find((r) => r.result === result) || {
      label: 'Reaction Observed',
      meaning: 'Colorimetric shift digitally registered.',
      colorHex: '#3D1C52',
    };

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-2">
        <div>
          <span className="text-xs font-semibold text-[#1769AA] uppercase tracking-wide">
            Stage 04 // Advanced Analysis Engine
          </span>
          <h3 className="text-xl font-bold text-[#17212B] mt-0.5">
            Temporal Kinetics, Presumptive Classification &amp; Evidence Reliability
          </h3>
          <p className="text-xs text-[#64717D]">
            Multi-dimensional colorimetric trajectory, environmental lighting normalization, excipient matrix screening, and adversarial stress testing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCalibration}
            className="px-4 py-2 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Calibration</span>
          </button>
          <button
            onClick={onProceedToRecord}
            className="px-5 py-2 bg-[#1769AA] hover:bg-[#13568C] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Proceed to Record &amp; Seal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Profile & Reagent Information Ribbon */}
      <div className="bg-[#FAFBFD] border border-[#CBD5E1] p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block">Active Test Kit</span>
            <span className="font-bold text-[#17212B]">{kit.name}</span>
            <span className="text-[10px] text-[#64717D] font-mono ml-1.5">({kit.profileVersion || kit.version})</span>
          </div>

          <div className="h-6 w-px bg-[#CBD5E1] hidden sm:block" />

          <div>
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block">Reaction Procedure</span>
            <span className="font-bold text-[#1769AA]">{reactionProfile?.name || 'Standard Color Response'}</span>
            <span className="text-[10px] text-[#64717D] font-mono ml-1.5">({reactionProfile?.profileVersion || 'v1.0'})</span>
          </div>

          <div className="h-6 w-px bg-[#CBD5E1] hidden sm:block" />

          <div>
            <span className="text-[10px] uppercase font-bold text-[#8A96A3] block">Target Analyte</span>
            <span className="font-semibold text-[#17212B]">{kit.targetSubstances[0]}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#64717D] font-semibold">
            STATUS: {kit.status || 'PROTOTYPE'}
          </span>
        </div>
      </div>

      {/* SCIENTIFIC NAVIGATION TABS */}
      <div className="border-b border-[#CBD5E1] flex items-center gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-[#1769AA] text-[#1769AA] bg-white'
              : 'border-transparent text-[#64717D] hover:text-[#17212B]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Presumptive Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('temporal')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'temporal'
              ? 'border-[#1769AA] text-[#1769AA] bg-white'
              : 'border-transparent text-[#64717D] hover:text-[#17212B]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Temporal Fingerprint &amp; Kinetics</span>
          {temporalSignature && (
            <span className="w-2 h-2 rounded-full bg-[#16865B]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('decomposition')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'decomposition'
              ? 'border-[#1769AA] text-[#1769AA] bg-white'
              : 'border-transparent text-[#64717D] hover:text-[#17212B]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Colour-Space Decomposition</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'border-[#1769AA] text-[#1769AA] bg-white'
              : 'border-transparent text-[#64717D] hover:text-[#17212B]'
          }`}
        >
          <Beaker className="w-3.5 h-3.5" />
          <span>Matrix / Interference Mode</span>
        </button>

        <button
          onClick={() => setActiveTab('stress')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'stress'
              ? 'border-[#1769AA] text-[#1769AA] bg-white'
              : 'border-transparent text-[#64717D] hover:text-[#17212B]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Adversarial Stress Test</span>
          <span className="font-mono text-[10px] bg-[#EEF2F6] px-1.5 py-0.2 rounded text-[#17212B]">
            {robustness.stabilityScore}%
          </span>
        </button>

        <button
          onClick={() => setActiveTab('witness')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'witness'
              ? 'border-[#1769AA] text-[#1769AA] bg-white'
              : 'border-transparent text-[#64717D] hover:text-[#17212B]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Witness Co-Signing</span>
          {multiWitnessSeal?.multiWitnessStatus === 'DUAL_WITNESS_SEALED' && (
            <span className="text-[10px] text-[#16865B] font-bold">✓ 2X</span>
          )}
        </button>
      </div>

      {/* TAB CONTENT 1: PRESUMPTIVE OVERVIEW & RELIABILITY */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Primary Result Banner & Metric Display (Col 7) */}
            <div className="lg:col-span-7 space-y-4">
              <div
                className={`p-6 rounded-2xl border-2 card-elevated-shadow transition-all ${
                  isPositive
                    ? 'bg-[#FAF5FF] border-[#9333EA]/30'
                    : isNegative
                    ? 'bg-[#F0FDF4] border-[#16865B]/30'
                    : 'bg-[#FFFBEB] border-[#D88A00]/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBD5E1]/30">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#64717D]">
                    PRESUMPTIVE FIELD-TEST INTERPRETATION
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#64717D]">Confidence Fit:</span>
                    <span className="text-sm font-bold font-mono text-[#17212B] bg-white/90 px-2 py-0.5 rounded border border-[#CBD5E1]/40">
                      {confidence}%
                    </span>
                  </div>
                </div>

                <div className="my-4 flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl border-2 border-white shadow-md shrink-0"
                    style={{ backgroundColor: roi.calibratedColorHex }}
                  />
                  <div>
                    <h2
                      className={`text-2xl font-black tracking-tight ${
                        isPositive
                          ? 'text-[#6B21A8]'
                          : isNegative
                          ? 'text-[#166534]'
                          : 'text-[#92400E]'
                      }`}
                    >
                      PRESUMPTIVE {result}
                    </h2>
                    <p className="text-xs font-semibold text-[#17212B] mt-0.5">
                      {matchedReaction.label}
                    </p>
                    <p className="text-xs text-[#64717D] mt-0.5 leading-relaxed">
                      {matchedReaction.meaning}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#CBD5E1]/30 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWhyResultModalOpen(true)}
                      className="px-3.5 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#17212B] font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-[#1769AA]" />
                      <span>WHY THIS RESULT?</span>
                    </button>
                    <button
                      onClick={() => setSensitivityModalOpen(true)}
                      className="px-3.5 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#17212B] font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#1769AA]" />
                      <span>SENSITIVITY LAB</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-[#8A96A3] font-mono">
                    ΔE to Standard = {calculateDeltaE(roi.calibratedColorHex, matchedReaction.colorHex)}
                  </span>
                </div>
              </div>

              {/* Evidence Reliability Scorecard */}
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F6]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#1769AA]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                      EVIDENCE RELIABILITY SCORE
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-[#17212B]">
                      {reliability.score} / 100
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        reliability.status === 'ACCEPTABLE_FOR_FIELD_ANALYSIS'
                          ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                          : 'bg-[#FFFBEB] text-[#D88A00] border border-[#FDE68A]'
                      }`}
                    >
                      {reliability.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  {reliability.factors.slice(0, 4).map((f) => (
                    <div key={f.id} className="p-2.5 rounded-lg bg-[#FAFBFD] border border-[#EEF2F6]">
                      <span className="text-[#8A96A3] text-[10px] block truncate">{f.name}</span>
                      <span className="font-mono font-bold text-xs text-[#17212B]">{f.score}%</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-[#64717D] italic pt-1">
                  {reliability.engineeringNote}
                </p>
              </div>
            </div>

            {/* Operator Interpretation & Human + System Agreement (Col 5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#1769AA]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                      Human + System Agreement
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full ${
                      agreementState === 'AGREEMENT'
                        ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                        : agreementState === 'DISAGREEMENT'
                        ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                        : 'bg-[#F8FAFC] text-[#64717D] border border-[#CBD5E1]'
                    }`}
                  >
                    {agreementState === 'AGREEMENT'
                      ? '✓ AGREEMENT'
                      : agreementState === 'DISAGREEMENT'
                      ? '⚠ DISAGREEMENT'
                      : 'PENDING ASSESSMENT'}
                  </span>
                </div>

                {/* Operator Visual Input Selection */}
                <div className="space-y-2 text-xs">
                  <span className="text-[11px] font-semibold text-[#17212B] block">
                    1. Record Officer Visual Interpretation:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['POSITIVE', 'NEGATIVE', 'INCONCLUSIVE'] as PresumptiveClassification[]).map((c) => {
                      const isSel = operatorChoice === c;
                      return (
                        <button
                          key={c}
                          onClick={() => handleOperatorSelection(c)}
                          className={`py-2 px-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                            isSel
                              ? c === 'POSITIVE'
                                ? 'bg-[#9333EA] text-white border-[#9333EA]'
                                : c === 'NEGATIVE'
                                ? 'bg-[#16865B] text-white border-[#16865B]'
                                : 'bg-[#D88A00] text-white border-[#D88A00]'
                              : 'bg-white text-[#64717D] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Agreement Summary Table */}
                <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#EEF2F6] space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#64717D]">Digital Measurement:</span>
                    <span className="font-bold text-[#17212B]">{result}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64717D]">Officer Visual:</span>
                    <span className="font-bold text-[#1769AA]">{operatorChoice || 'Unrecorded'}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#EEF2F6]">
                    <span className="text-[#64717D]">Evidentiary Status:</span>
                    <span className={agreementState === 'AGREEMENT' ? 'text-[#16865B] font-bold' : 'text-[#D88A00] font-bold'}>
                      {agreementState === 'AGREEMENT'
                        ? 'Corroborated by Human Review'
                        : agreementState === 'DISAGREEMENT'
                        ? 'Review Recommended (Discrepancy)'
                        : 'Awaiting Operator Input'}
                    </span>
                  </div>
                </div>

                {/* Officer Notes */}
                <div>
                  <label className="text-[11px] font-semibold text-[#64717D] block mb-1">
                    Officer Field Observation Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={operatorNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Enter relevant physical reaction speed, vial fracture notes, or environmental observations..."
                    className="w-full text-xs p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1769AA] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: TEMPORAL REACTION FINGERPRINT & KINETICS (FLAGSHIP) */}
      {activeTab === 'temporal' && (
        <div className="space-y-4">
          {temporalSignature ? (
            <TemporalTrajectoryVisual signature={temporalSignature} />
          ) : (
            <div className="p-8 bg-white border border-[#CBD5E1] rounded-xl text-center space-y-2">
              <Clock className="w-8 h-8 text-[#8A96A3] mx-auto" />
              <h4 className="font-bold text-sm text-[#17212B]">Temporal Trajectory Not Captured for this Frame</h4>
              <p className="text-xs text-[#64717D] max-w-md mx-auto">
                This test was acquired in single-frame capture mode. Retake using "Temporal Reaction Fingerprint" mode to record full 20s kinetic progression.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: COLOUR-SPACE DECOMPOSITION */}
      {activeTab === 'decomposition' && (
        <ColorSpaceDecompositionVisual
          roi={roi}
          referenceTargetHex={matchedReaction.colorHex}
          referenceTargetLabel={matchedReaction.label}
          trajectoryPoints={temporalSignature?.trajectory?.map((p) => ({
            colorHex: p.colorHex,
            timestampSeconds: p.timestampSeconds,
          }))}
        />
      )}

      {/* TAB CONTENT 4: MATRIX / INTERFERENCE RESEARCH MODE */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {matrixInterference ? (
            <MatrixInterferenceVisual
              analysis={matrixInterference}
              targetSubstanceName={kit.targetSubstances[0]}
            />
          ) : (
            <div className="p-8 bg-white border border-[#CBD5E1] rounded-xl text-center space-y-2">
              <Beaker className="w-8 h-8 text-[#8A96A3] mx-auto" />
              <h4 className="font-bold text-sm text-[#17212B]">Matrix Analysis Initializing</h4>
              <p className="text-xs text-[#64717D]">
                Excipient vector analysis is configured for active reagent profiles.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 5: ADVERSARIAL EVIDENCE STRESS TEST */}
      {activeTab === 'stress' && (
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF2F6]">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                Adversarial Evidence Stress Testing Lab
              </h4>
              <p className="text-[10px] text-[#64717D]">
                Evaluating classification boundary stability across 12 physical optical perturbations without modifying original evidence.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#17212B] font-mono">
                {robustness.stabilityScore}% Stability
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  robustness.stabilityStatus === 'HIGH'
                    ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                    : 'bg-[#FFFBEB] text-[#D88A00] border border-[#FDE68A]'
                }`}
              >
                {robustness.stabilityStatus}
              </span>
            </div>
          </div>

          {/* Adversarial Variants Table */}
          <div className="border border-[#CBD5E1] rounded-xl overflow-hidden divide-y divide-[#EEF2F6] text-xs">
            <div className="bg-[#FAFBFD] p-3 grid grid-cols-12 font-bold text-[10px] uppercase text-[#64717D]">
              <span className="col-span-4">Adversarial Optical Scenario</span>
              <span className="col-span-2">Perturbation</span>
              <span className="col-span-2 text-center">Output</span>
              <span className="col-span-2 text-center">Confidence</span>
              <span className="col-span-2 text-right">Invariance</span>
            </div>

            {/* Original Baseline */}
            <div className="p-3 grid grid-cols-12 items-center bg-[#F0FDF4]/40 font-semibold">
              <span className="col-span-4 text-[#17212B]">Original Baseline Capture</span>
              <span className="col-span-2 font-mono text-[#64717D]">0.0% (Reference)</span>
              <span className="col-span-2 text-center font-bold text-[#17212B]">{result}</span>
              <span className="col-span-2 text-center font-mono">{confidence}%</span>
              <span className="col-span-2 text-right text-[#16865B] font-bold">BASELINE</span>
            </div>

            {/* Perturbation Variants */}
            {robustness.variants.map((v) => (
              <div key={v.id} className="p-3 grid grid-cols-12 items-center hover:bg-[#FAFBFD]">
                <div className="col-span-4 space-y-0.5">
                  <span className="font-medium text-[#17212B] block">{v.parameter}</span>
                  {v.details && <span className="text-[10px] text-[#8A96A3] block">{v.details}</span>}
                </div>
                <span className="col-span-2 font-mono text-[#64717D]">{v.deviation}</span>
                <span className="col-span-2 text-center font-bold font-mono text-[11px] text-[#17212B]">
                  {v.result}
                </span>
                <span className="col-span-2 text-center font-mono text-[11px] text-[#64717D]">
                  {v.confidence}%
                </span>
                <div className="col-span-2 text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      v.stable
                        ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                        : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                    }`}
                  >
                    {v.stable ? '✓ INVARIANT' : '⚠ SHIFT'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#64717D] leading-relaxed italic">
            {robustness.recommendationNote}
          </p>
        </div>
      )}

      {/* TAB CONTENT 6: MULTI-WITNESS SEALING */}
      {activeTab === 'witness' && (
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF2F6]">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                Cryptographic Multi-Witness Sealing
              </h4>
              <p className="text-[10px] text-[#64717D]">
                Co-signature chain linking secondary verifying officer credentials into the tamper-evident record seal.
              </p>
            </div>
            <button
              onClick={() => setWitnessModalOpen(true)}
              className="px-4 py-2 bg-[#1769AA] hover:bg-[#13568C] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{multiWitnessSeal?.secondaryWitness ? 'Update Witness Credentials' : 'Add Secondary Witness Seal'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Officer Card */}
            <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#8A96A3]">PRIMARY OFFICER</span>
                <span className="text-[#16865B] font-bold text-[10px] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#DCFCE7]">
                  ✓ SEALED
                </span>
              </div>
              <h5 className="font-bold text-sm text-[#17212B]">Insp. R. Sharma</h5>
              <div className="space-y-1 font-mono text-[11px] text-[#64717D]">
                <div>Badge: ND-418</div>
                <div>Division: Narcotics Control Division</div>
                <div>Role: Primary Testing Operator</div>
              </div>
            </div>

            {/* Secondary Witness Card */}
            <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#8A96A3]">SECONDARY CO-WITNESS</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    multiWitnessSeal?.secondaryWitness
                      ? 'bg-[#F0FDF4] text-[#16865B] border-[#DCFCE7]'
                      : 'bg-[#F8FAFC] text-[#8A96A3] border-[#CBD5E1]'
                  }`}
                >
                  {multiWitnessSeal?.secondaryWitness ? '✓ CO-WITNESS SEALED' : 'PENDING WITNESS'}
                </span>
              </div>
              {multiWitnessSeal?.secondaryWitness ? (
                <>
                  <h5 className="font-bold text-sm text-[#17212B]">{multiWitnessSeal.secondaryWitness.name}</h5>
                  <div className="space-y-1 font-mono text-[11px] text-[#64717D]">
                    <div>Badge: {multiWitnessSeal.secondaryWitness.badgeNumber}</div>
                    <div>Division: {multiWitnessSeal.secondaryWitness.division}</div>
                    <div>Role: {multiWitnessSeal.secondaryWitness.role}</div>
                  </div>
                </>
              ) : (
                <div className="py-3 text-center space-y-2">
                  <p className="text-xs text-[#64717D]">No secondary witness attached yet.</p>
                  <button
                    onClick={() => setWitnessModalOpen(true)}
                    className="text-xs font-semibold text-[#1769AA] hover:underline cursor-pointer"
                  >
                    Click to attach co-witness &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation & Action Bar for Mobile & Desktop Ergonomics */}
      <div className="bg-white border border-[#CBD5E1] p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 card-soft-shadow">
        <div className="flex items-center gap-2 text-xs text-[#64717D] w-full sm:w-auto">
          <span className={`w-2.5 h-2.5 rounded-full ${
            isPositive ? 'bg-[#1769AA]' : isNegative ? 'bg-[#16865B]' : 'bg-[#D88A00]'
          }`} />
          <span className="font-semibold text-[#17212B]">
            Presumptive {result} ({confidence}% Confidence • Reliability {reliability.score}/100)
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={onBackToCalibration}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Calibration</span>
          </button>
          <button
            onClick={onProceedToRecord}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#1769AA] hover:bg-[#13568C] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 min-h-[42px] touch-manipulation active:scale-98"
          >
            <span>Proceed to Record &amp; Seal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* WHY THIS RESULT MODAL */}
      <WhyThisResultModal
        isOpen={whyResultModalOpen}
        onClose={() => setWhyResultModalOpen(false)}
        result={result}
        confidence={confidence}
        reliability={reliability}
        robustness={robustness}
        roi={roi}
        kit={kit}
        imageQuality={imageQuality}
        calibration={calibration}
        humanInterpretation={humanInterpretation || undefined}
      />

      {/* SENSITIVITY MODAL */}
      <SensitivityReplayModal
        isOpen={sensitivityModalOpen}
        onClose={() => setSensitivityModalOpen(false)}
        baseColorHex={roi.calibratedColorHex}
        baseResult={result}
        robustness={robustness}
      />

      {/* MULTI-WITNESS SEAL MODAL */}
      <MultiWitnessSealModal
        isOpen={witnessModalOpen}
        onClose={() => setWitnessModalOpen(false)}
        currentSeal={multiWitnessSeal}
        onApplySeal={(seal) => {
          if (onUpdateMultiWitnessSeal) onUpdateMultiWitnessSeal(seal);
        }}
        recordHash={calibration.timestamp}
      />
    </div>
  );
};
