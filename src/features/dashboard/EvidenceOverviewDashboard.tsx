import React from 'react';
import { ScientificEvidenceVisual } from '../../components/visuals/ScientificEvidenceVisual';
import { DigitalEvidenceRecord } from '../../types/evidence';
import { DEMO_SCENARIOS, DemoScenarioDefinition } from '../../services/data/demoScenarios';
import {
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
  Plus,
  Clock,
  Sparkles,
  AlertTriangle,
  FlaskConical,
  CheckCircle,
  FileCheck,
} from 'lucide-react';

interface EvidenceOverviewDashboardProps {
  records: DigitalEvidenceRecord[];
  stats: {
    totalTests: number;
    positive: number;
    negative: number;
    inconclusive: number;
    manualReview: number;
  };
  onLaunchNewTest: (scenario?: DemoScenarioDefinition) => void;
  onViewRecord: (record: DigitalEvidenceRecord) => void;
  onNavigateToHistory: () => void;
}

export const EvidenceOverviewDashboard: React.FC<EvidenceOverviewDashboardProps> = ({
  records,
  stats,
  onLaunchNewTest,
  onViewRecord,
  onNavigateToHistory,
}) => {
  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Welcoming Professional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#1769AA] uppercase tracking-wide">
              Station Terminal 01
            </span>
            <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
            <span className="text-xs text-[#64717D]">Forensic Field Companion // Standard Edition</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#17212B]">
            Evidence Overview
          </h2>
          <p className="text-sm text-[#64717D] mt-1">
            Good morning, Operator. Field evidence, analysis status, and cryptographic integrity at a glance.
          </p>
        </div>

        {/* Prominent Blue CTA Button */}
        <button
          onClick={() => onLaunchNewTest()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1769AA] hover:bg-[#13568C] text-white font-semibold text-xs rounded-lg shadow-sm transition-all whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Field Test</span>
        </button>
      </div>

      {/* Metric Cards (White, Subtle Border, Soft Shadow, Small Icon, Large Number) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Tests */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 card-soft-shadow">
          <div className="flex items-center justify-between text-[#64717D] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tests</span>
            <FlaskConical className="w-4 h-4 text-[#1769AA]" />
          </div>
          <p className="text-3xl font-bold text-[#17212B] tracking-tight">{stats.totalTests}</p>
          <p className="text-xs text-[#8A96A3] mt-1">All field screenings</p>
        </div>

        {/* Positive */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 card-soft-shadow">
          <div className="flex items-center justify-between text-[#64717D] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1769AA]">Positive</span>
            <span className="w-2 h-2 rounded-full bg-[#1769AA]" />
          </div>
          <p className="text-3xl font-bold text-[#1769AA] tracking-tight">{stats.positive}</p>
          <p className="text-xs text-[#8A96A3] mt-1">Presumptive reactive</p>
        </div>

        {/* Negative */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 card-soft-shadow">
          <div className="flex items-center justify-between text-[#64717D] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#16865B]">Negative</span>
            <span className="w-2 h-2 rounded-full bg-[#16865B]" />
          </div>
          <p className="text-3xl font-bold text-[#16865B] tracking-tight">{stats.negative}</p>
          <p className="text-xs text-[#8A96A3] mt-1">Non-reactive clear</p>
        </div>

        {/* Inconclusive */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 card-soft-shadow">
          <div className="flex items-center justify-between text-[#64717D] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D88A00]">Inconclusive</span>
            <span className="w-2 h-2 rounded-full bg-[#D88A00]" />
          </div>
          <p className="text-3xl font-bold text-[#D88A00] tracking-tight">{stats.inconclusive}</p>
          <p className="text-xs text-[#8A96A3] mt-1">Outside envelope</p>
        </div>

        {/* Manual Review */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 card-soft-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#64717D] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D64550]">Manual Review</span>
            <AlertTriangle className="w-4 h-4 text-[#D64550]" />
          </div>
          <p className="text-3xl font-bold text-[#D64550] tracking-tight">{stats.manualReview}</p>
          <p className="text-xs text-[#8A96A3] mt-1">Supervisor review</p>
        </div>
      </div>

      {/* Hero Visual Area: Scientific Evidence Visual + System Pipeline Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Scientific Visual (Col 7) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] card-soft-shadow p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
              <h3 className="text-sm font-bold text-[#17212B]">
                Evidence Reconstruction Model
              </h3>
              <span className="text-xs font-medium text-[#16865B] bg-[#F0FDF4] px-2.5 py-0.5 rounded-full border border-[#DCFCE7]">
                Live Calibrated
              </span>
            </div>
            <p className="text-xs text-[#64717D] mt-2 mb-4">
              Real-time optical mapping aligning raw field camera sensors to standard reference tiles and reaction regions.
            </p>
          </div>

          <ScientificEvidenceVisual reactionColor="#3D1C52" />
        </div>

        {/* Right: Scientific Colour Visualization (Col 5) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E8F0] card-soft-shadow p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
              <h3 className="text-sm font-bold text-[#17212B]">
                Colour Calibration Standard
              </h3>
              <span className="text-xs font-mono text-[#1769AA]">15-Patch CIE</span>
            </div>
            <p className="text-xs text-[#64717D] mt-2 leading-relaxed">
              Standard 15-patch EvidenceTwin calibration card strips chromatic casting caused by uneven roadside and incandescent lighting.
            </p>
          </div>

          {/* Dedicated Scientific Colour Rows */}
          <div className="space-y-3 font-mono text-xs bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
            <div>
              <div className="flex justify-between items-center text-[#64717D] text-[11px] mb-1.5 font-sans">
                <span className="font-semibold text-[#17212B]">REFERENCE TILES</span>
                <span>Expected CIE Standard</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {['#E5E9EE', '#7C8592', '#1E242C', '#00A3D9', '#D63384', '#E6A817'].map((hex, i) => (
                  <div key={i} className="flex-1 h-7 rounded border border-[#CBD5E1]" style={{ backgroundColor: hex }} title={hex} />
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-[#64717D] text-[11px] mb-1.5 font-sans">
                <span className="font-semibold text-[#17212B]">CAPTURED RAW</span>
                <span className="text-[#D88A00]">Sensor Tint (+140K)</span>
              </div>
              <div className="flex items-center justify-between gap-1.5 opacity-90">
                {['#ECE4DE', '#85808B', '#222226', '#029BCF', '#CD3380', '#DEA31D'].map((hex, i) => (
                  <div key={i} className="flex-1 h-7 rounded border border-[#CBD5E1]" style={{ backgroundColor: hex }} title={hex} />
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-[#64717D] text-[11px] mb-1.5 font-sans">
                <span className="font-semibold text-[#16865B]">CALIBRATED MATRIX</span>
                <span className="text-[#16865B] font-medium">ΔE 1.8 // Passed</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {['#E5E9EE', '#7C8592', '#1E242C', '#00A3D9', '#D63384', '#E6A817'].map((hex, i) => (
                  <div key={i} className="flex-1 h-7 rounded border border-[#16865B]/40 shadow-xs" style={{ backgroundColor: hex }} title={hex} />
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#64717D] pt-2 border-t border-[#EEF2F6] flex justify-between items-center">
            <span>Transformation: 3x3 Affine</span>
            <span className="text-[#1769AA] font-semibold">Standard D65</span>
          </div>
        </div>
      </div>

      {/* Preset Benchmark Scenarios for Judges */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] card-soft-shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EEF2F6] gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#17212B]">
              Benchmark Evaluation Scenarios
            </h3>
            <p className="text-xs text-[#64717D] mt-0.5">
              Launch pre-calibrated test cases to inspect system behaviors across different field conditions.
            </p>
          </div>
          <span className="text-xs font-medium text-[#1769AA] bg-[#EBF3FB] px-2.5 py-1 rounded-full border border-[#BFDBFE] self-start sm:self-auto">
            {DEMO_SCENARIOS.length} Benchmark Scenarios Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {DEMO_SCENARIOS.map((sc) => (
            <div
              key={sc.id}
              className="bg-[#FAFBFD] border border-[#E2E8F0] hover:border-[#1769AA]/40 rounded-xl p-4 transition-all hover:shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#64717D]">{sc.caseId}</span>
                  <span className={`font-semibold ${
                    sc.expectedResult === 'POSITIVE' ? 'text-[#1769AA]' :
                    sc.expectedResult === 'NEGATIVE' ? 'text-[#16865B]' : 'text-[#D88A00]'
                  }`}>
                    {sc.expectedResult}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#17212B] mt-1.5">
                  {sc.name.split(':')[0]}
                </h4>
                <p className="text-xs text-[#64717D] mt-1 line-clamp-2">
                  {sc.description}
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs text-[#8A96A3]">
                  <span>Reliability ~{sc.expectedReliability}/100</span>
                  <span>•</span>
                  <span>{sc.isUnstable ? 'Unstable' : 'Invariant'}</span>
                </div>
              </div>

              <button
                onClick={() => onLaunchNewTest(sc)}
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-[#EBF3FB] border border-[#CBD5E1] text-[#1769AA] text-xs font-semibold rounded-lg transition-colors"
              >
                <span>Run This Scenario</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Evidence Timeline Rail */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1769AA]" />
            <h3 className="text-sm font-bold text-[#17212B]">
              Recent Evidence
            </h3>
          </div>
          <button
            onClick={onNavigateToHistory}
            className="flex items-center gap-1 text-xs font-medium text-[#1769AA] hover:underline"
          >
            <span>View Full Timeline</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* 4 Clean Evidence Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {records.slice(0, 4).map((rec) => {
            const isPos = rec.presumptiveResult === 'POSITIVE';
            const isNeg = rec.presumptiveResult === 'NEGATIVE';

            return (
              <div
                key={rec.id}
                onClick={() => onViewRecord(rec)}
                className="bg-white border border-[#E2E8F0] hover:border-[#1769AA]/50 rounded-xl p-4 cursor-pointer card-soft-shadow hover:card-elevated-shadow transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#17212B] group-hover:text-[#1769AA] transition-colors">
                      {rec.testId}
                    </span>
                    <span className="text-[#8A96A3] font-mono text-[11px]">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="my-3 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-md border border-[#E2E8F0] shadow-xs shrink-0"
                      style={{ backgroundColor: rec.roi.calibratedColorHex }}
                    />
                    <div className="truncate">
                      <p className={`text-xs font-bold ${isPos ? 'text-[#1769AA]' : isNeg ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                        PRESUMPTIVE {rec.presumptiveResult}
                      </p>
                      <p className="text-[11px] text-[#64717D] truncate">{rec.caseId}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs border-t border-[#EEF2F6] pt-2 text-[#64717D]">
                    <div className="flex justify-between">
                      <span>Reliability</span>
                      <span className="font-bold text-[#17212B]">{rec.reliability.score}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Integrity</span>
                      <span className={rec.verificationStatus === 'VERIFIED' ? 'text-[#16865B] font-medium flex items-center gap-1' : 'text-[#D64550] font-medium flex items-center gap-1'}>
                        {rec.verificationStatus === 'VERIFIED' ? '✓ Verified' : '⚠ Mismatch'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#EEF2F6] flex items-center justify-between text-[11px] text-[#8A96A3]">
                  <span>Block #{rec.hashes.blockHeight}</span>
                  <span className="text-[#1769AA] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Inspect <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
