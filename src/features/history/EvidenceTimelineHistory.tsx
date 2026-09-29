import React, { useState } from 'react';
import { DigitalEvidenceRecord, PresumptiveClassification } from '../../types/evidence';
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  X,
  Clock,
  Layers,
  Download,
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  Cpu,
  Eye,
  Scan,
  CheckCircle2,
} from 'lucide-react';
import { RecordVerificationScreen } from '../new-test/RecordVerificationScreen';
import { ExportPdfModal } from '../../components/modals/ExportPdfModal';

interface EvidenceTimelineHistoryProps {
  records: DigitalEvidenceRecord[];
  onRecordUpdated?: (updated: DigitalEvidenceRecord) => void;
}

export function getRecordCvStatus(rec: DigitalEvidenceRecord): {
  isProcessed: boolean;
  status: 'ANALYSIS_COMPLETE' | 'READY_FOR_ANALYSIS' | 'UNPROCESSED';
  label: string;
  badgeClass: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  icon: 'complete' | 'ready' | 'unprocessed';
  latency?: number;
  engine: string;
  hasRectifiedCard: boolean;
  hasDebugImage: boolean;
} {
  const hasCvArtifacts = !!(
    rec.cvProcessingTimeMs !== undefined ||
    rec.cvEngineVersion ||
    rec.engineVersion?.includes('OpenCV') ||
    rec.cvRectifiedCardUrl ||
    rec.cvDebugImageUrl ||
    rec.cvPipelineStatus
  );

  let status: 'ANALYSIS_COMPLETE' | 'READY_FOR_ANALYSIS' | 'UNPROCESSED' = 'UNPROCESSED';
  if (rec.cvPipelineStatus) {
    status = rec.cvPipelineStatus;
  } else if (hasCvArtifacts) {
    if (rec.presumptiveResult && rec.confidencePercentage > 0) {
      status = 'ANALYSIS_COMPLETE';
    } else {
      status = 'READY_FOR_ANALYSIS';
    }
  }

  const hasRectifiedCard = !!rec.cvRectifiedCardUrl;
  const hasDebugImage = !!rec.cvDebugImageUrl;

  if (status === 'ANALYSIS_COMPLETE') {
    return {
      isProcessed: true,
      status: 'ANALYSIS_COMPLETE',
      label: 'Analysis Complete',
      badgeClass: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
      textColor: '#15803D',
      borderColor: '#BBF7D0',
      bgColor: '#F0FDF4',
      icon: 'complete',
      latency: rec.cvProcessingTimeMs,
      engine: rec.cvEngineVersion || 'OpenCV 4.6.0 Pipeline',
      hasRectifiedCard,
      hasDebugImage,
    };
  }

  if (status === 'READY_FOR_ANALYSIS') {
    return {
      isProcessed: true,
      status: 'READY_FOR_ANALYSIS',
      label: 'Ready for Analysis',
      badgeClass: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
      textColor: '#1D4ED8',
      borderColor: '#BFDBFE',
      bgColor: '#EFF6FF',
      icon: 'ready',
      latency: rec.cvProcessingTimeMs,
      engine: rec.cvEngineVersion || 'OpenCV 4.6.0 Pipeline',
      hasRectifiedCard,
      hasDebugImage,
    };
  }

  return {
    isProcessed: false,
    status: 'UNPROCESSED',
    label: 'Unprocessed',
    badgeClass: 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]',
    textColor: '#64748B',
    borderColor: '#E2E8F0',
    bgColor: '#F8FAFC',
    icon: 'unprocessed',
    engine: 'Manual Optical',
    hasRectifiedCard,
    hasDebugImage,
  };
}

export const EvidenceTimelineHistory: React.FC<EvidenceTimelineHistoryProps> = ({ records }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | PresumptiveClassification>('ALL');
  const [cvFilter, setCvFilter] = useState<'ALL' | 'ANALYSIS_COMPLETE' | 'READY_FOR_ANALYSIS' | 'UNPROCESSED'>('ALL');
  const [reviewFilterOnly, setReviewFilterOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'reliability-desc' | 'reliability-asc'>('newest');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<DigitalEvidenceRecord | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [pdfRecordToExport, setPdfRecordToExport] = useState<DigitalEvidenceRecord | null>(null);

  // Filter & Sort records
  const filteredRecords = records
    .filter((r) => {
      const matchesSearch =
        r.testId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.targetAnalyte.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesResult = resultFilter === 'ALL' || r.presumptiveResult === resultFilter;
      const cvStatus = getRecordCvStatus(r).status;
      const matchesCv = cvFilter === 'ALL' || cvStatus === cvFilter;
      const matchesReview = !reviewFilterOnly || r.reliability.status !== 'ACCEPTABLE_FOR_FIELD_ANALYSIS' || r.manualReviewFlags.length > 0;

      return matchesSearch && matchesResult && matchesCv && matchesReview;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      if (sortBy === 'reliability-desc') {
        return b.reliability.score - a.reliability.score;
      }
      if (sortBy === 'reliability-asc') {
        return a.reliability.score - b.reliability.score;
      }
      return 0;
    });

  const cvProcessedCount = records.filter((r) => getRecordCvStatus(r).isProcessed).length;

  const handleExportCsv = () => {
    const headers = [
      'Test ID',
      'Case ID',
      'Timestamp (UTC)',
      'Operator',
      'Kit Profile',
      'Target Substance',
      'Presumptive Result',
      'Confidence (%)',
      'CV Engine Status',
      'CV Latency (ms)',
      'Reliability (100)',
      'Block Height',
      'Record SHA-256 Seal'
    ];
    const rows = filteredRecords.map((r) => {
      const cv = getRecordCvStatus(r);
      return [
        `"${r.testId}"`,
        `"${r.caseId}"`,
        `"${r.timestamp}"`,
        `"${r.operatorName}"`,
        `"${r.kitName}"`,
        `"${r.targetAnalyte}"`,
        `"${r.presumptiveResult}"`,
        r.confidencePercentage,
        `"${cv.label}"`,
        cv.latency || 'N/A',
        r.reliability.score,
        r.hashes.blockHeight,
        `"${r.hashes.recordHash}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EvidenceTwin_CustodyTimeline_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const countAnalysisComplete = records.filter(r => getRecordCvStatus(r).status === 'ANALYSIS_COMPLETE').length;
  const countReadyForAnalysis = records.filter(r => getRecordCvStatus(r).status === 'READY_FOR_ANALYSIS').length;
  const countUnprocessed = records.filter(r => getRecordCvStatus(r).status === 'UNPROCESSED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-4">
        <div>
          <span className="text-xs font-semibold text-[#1769AA] uppercase tracking-wide">
            Chain of Custody // Forensic Records
          </span>
          <h2 className="text-2xl font-bold text-[#17212B] mt-0.5">
            Evidence Timeline
          </h2>
          <p className="text-xs text-[#64717D]">
            Chronological cryptographic chain of custody for all colorimetric field drug test records.
          </p>

          {/* CV Engine Pipeline Status Summary Banner */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16865B] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16865B]"></span>
              </span>
              <span className="font-semibold text-[#17212B]">Computer Vision Engine:</span>
              <span className="text-[#15803D] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {countAnalysisComplete} Analysis Complete
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="text-[#1D4ED8] font-medium flex items-center gap-1">
                <Scan className="w-3 h-3" /> {countReadyForAnalysis} Ready for Analysis
              </span>
              {countUnprocessed > 0 && (
                <>
                  <span className="text-[#CBD5E1]">•</span>
                  <span className="text-[#64748B] font-medium flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> {countUnprocessed} Unprocessed
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* View Switcher & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#17212B] text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Export filtered records as forensic custody CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#16865B]" />
            <span>Export CSV</span>
          </button>

          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === 'timeline' ? 'bg-white text-[#1769AA] font-semibold shadow-xs' : 'text-[#64717D]'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#1769AA] font-semibold shadow-xs' : 'text-[#64717D]'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl card-soft-shadow flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8A96A3] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Test ID, Case File, Officer, or Substance..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#17212B] focus:outline-none focus:border-[#1769AA]"
            />
          </div>

          {/* Filters and Sorting */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Result Segmented Filter */}
            <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#CBD5E1] text-xs">
              {(['ALL', 'POSITIVE', 'NEGATIVE', 'INCONCLUSIVE'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setResultFilter(opt)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    resultFilter === opt
                      ? 'bg-white text-[#1769AA] font-semibold shadow-xs'
                      : 'text-[#64717D] hover:text-[#17212B]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#8A96A3]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-[#17212B] focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="reliability-desc">Highest Reliability</option>
                <option value="reliability-asc">Lowest Reliability</option>
              </select>
            </div>

            {/* Review Filter Button */}
            <button
              onClick={() => setReviewFilterOnly(!reviewFilterOnly)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                reviewFilterOnly
                  ? 'bg-[#FFFBEB] text-[#D88A00] border-[#FDE68A] font-semibold'
                  : 'bg-white text-[#64717D] border-[#CBD5E1] hover:text-[#17212B]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Review Flags Only</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Row: Computer Vision Status Selector */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EEF2F6]">
          <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#CBD5E1] text-xs">
            <span className="text-[11px] font-semibold text-[#475569] px-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#1769AA]" />
              <span>CV Engine Filter:</span>
            </span>
            {(
              [
                { id: 'ALL', label: 'All Records', count: records.length },
                { id: 'ANALYSIS_COMPLETE', label: 'Analysis Complete', count: countAnalysisComplete, color: 'text-[#15803D]' },
                { id: 'READY_FOR_ANALYSIS', label: 'Ready for Analysis', count: countReadyForAnalysis, color: 'text-[#1D4ED8]' },
                { id: 'UNPROCESSED', label: 'Unprocessed', count: countUnprocessed, color: 'text-[#64748B]' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setCvFilter(opt.id)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  cvFilter === opt.id
                    ? 'bg-white text-[#1769AA] font-bold shadow-xs border border-[#CBD5E1]'
                    : 'text-[#64717D] hover:text-[#17212B]'
                }`}
              >
                <span>{opt.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  cvFilter === opt.id ? 'bg-[#EFF6FF] text-[#1769AA] font-bold' : 'bg-[#E2E8F0] text-[#64717D]'
                }`}>
                  {opt.count}
                </span>
              </button>
            ))}
          </div>

          {cvFilter !== 'ALL' && (
            <button
              onClick={() => setCvFilter('ALL')}
              className="text-[11px] text-[#64717D] hover:text-[#D64550] underline cursor-pointer px-1"
            >
              Reset CV filter
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Timeline vs Table */}
      {viewMode === 'timeline' ? (
        <div className="relative border-l-2 border-[#CBD5E1] ml-4 md:ml-8 pl-6 md:pl-8 space-y-6">
          {filteredRecords.map((rec) => {
            const isPos = rec.presumptiveResult === 'POSITIVE';
            const isNeg = rec.presumptiveResult === 'NEGATIVE';
            const cv = getRecordCvStatus(rec);

            return (
              <div key={rec.id} className="relative group">
                {/* Timeline node dot */}
                <div
                  className={`absolute -left-[31px] md:-left-[39px] top-4 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-transform group-hover:scale-125 ${
                    isPos ? 'border-[#1769AA]' : isNeg ? 'border-[#16865B]' : 'border-[#D88A00]'
                  }`}
                />

                {/* Clean Event Card */}
                <div
                  onClick={() => setSelectedRecordForDetail(rec)}
                  className="bg-white border border-[#E2E8F0] hover:border-[#1769AA]/40 rounded-xl p-5 transition-all cursor-pointer card-soft-shadow hover:card-elevated-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-[#17212B] font-mono group-hover:text-[#1769AA] transition-colors">
                        {rec.testId}
                      </span>
                      <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
                      <span className="text-[#64717D] font-mono">{rec.caseId}</span>
                      <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
                      <span className="text-[#8A96A3] font-mono">
                        {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-md border border-[#E2E8F0] shadow-xs shrink-0"
                        style={{ backgroundColor: rec.roi.calibratedColorHex }}
                      />
                      <div>
                        <span className={`text-xs font-bold ${
                          isPos ? 'text-[#1769AA]' : isNeg ? 'text-[#16865B]' : 'text-[#D88A00]'
                        }`}>
                          PRESUMPTIVE {rec.presumptiveResult}
                        </span>
                        <p className="text-xs text-[#64717D]">
                          {rec.kitName} ({rec.targetAnalyte})
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#8A96A3]">
                      Officer: {rec.operatorName} • {rec.locationTag}
                    </p>

                    {/* Computer Vision Processing Visual Indicator */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#F1F5F9]">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${cv.badgeClass}`}
                        title={`Computer Vision Pipeline Status: ${cv.label} (${cv.engine})`}
                      >
                        {cv.status === 'ANALYSIS_COMPLETE' && <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />}
                        {cv.status === 'READY_FOR_ANALYSIS' && <Scan className="w-3.5 h-3.5 text-[#1D4ED8]" />}
                        {cv.status === 'UNPROCESSED' && <Cpu className="w-3.5 h-3.5 text-[#64748B]" />}
                        <span>CV: {cv.label}</span>
                        {cv.latency !== undefined && (
                          <span className="font-mono text-[10px] opacity-80 pl-1 border-l border-current/25">
                            {cv.latency}ms
                          </span>
                        )}
                      </div>

                      {cv.status === 'READY_FOR_ANALYSIS' && (
                        <span className="text-[10px] text-[#1D4ED8] font-medium bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                          Card Detected • Ready for Presumptive Analysis
                        </span>
                      )}

                      {cv.hasRectifiedCard && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1]">
                          <Scan className="w-3 h-3 text-[#1769AA]" />
                          <span>15-Patch Card Rectified</span>
                        </span>
                      )}

                      <span className="text-[10px] text-[#8A96A3] font-mono ml-auto">
                        {cv.engine}
                      </span>
                    </div>
                  </div>

                  {/* Right Metrics & Hash Status */}
                  <div className="flex flex-wrap md:flex-col items-end gap-2 md:gap-1 text-xs shrink-0 border-t md:border-t-0 md:border-l border-[#EEF2F6] pt-3 md:pt-0 md:pl-5">
                    <div className="text-right">
                      <span className="text-[11px] text-[#8A96A3] block">Reliability</span>
                      <span className="font-bold text-[#17212B]">{rec.reliability.score} / 100</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      {rec.verificationStatus === 'VERIFIED' ? (
                        <span className="text-[#16865B] text-xs font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-[#D64550] text-xs font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPdfRecordToExport(rec);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#1769AA] hover:text-[#13568C] bg-[#EBF3FB] hover:bg-[#DCEBF9] px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                        title="Export official signed PDF report"
                      >
                        <FileText className="w-3 h-3" />
                        <span>PDF Report</span>
                      </button>
                      <span className="text-xs font-semibold text-[#1769AA] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Inspect <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto card-soft-shadow">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBFD] text-[#64717D] border-b border-[#E2E8F0] font-semibold">
              <tr>
                <th className="p-3.5">Test ID</th>
                <th className="p-3.5">Case File</th>
                <th className="p-3.5">Time</th>
                <th className="p-3.5">Kit Profile</th>
                <th className="p-3.5">Result</th>
                <th className="p-3.5">CV Engine Status</th>
                <th className="p-3.5">Reliability</th>
                <th className="p-3.5">Integrity</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F6]">
              {filteredRecords.map((rec) => {
                const cv = getRecordCvStatus(rec);
                return (
                  <tr
                    key={rec.id}
                    onClick={() => setSelectedRecordForDetail(rec)}
                    className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 font-bold font-mono text-[#17212B]">{rec.testId}</td>
                    <td className="p-3.5 font-mono text-[#64717D]">{rec.caseId}</td>
                    <td className="p-3.5 text-[#8A96A3]">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3.5 text-[#17212B]">{rec.kitName}</td>
                    <td className="p-3.5">
                      <span className={`font-bold ${
                        rec.presumptiveResult === 'POSITIVE' ? 'text-[#1769AA]' :
                        rec.presumptiveResult === 'NEGATIVE' ? 'text-[#16865B]' : 'text-[#D88A00]'
                      }`}>
                        {rec.presumptiveResult}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${cv.badgeClass}`}>
                        {cv.status === 'ANALYSIS_COMPLETE' && <CheckCircle2 className="w-3 h-3 text-[#15803D]" />}
                        {cv.status === 'READY_FOR_ANALYSIS' && <Scan className="w-3 h-3 text-[#1D4ED8]" />}
                        {cv.status === 'UNPROCESSED' && <Cpu className="w-3 h-3 text-[#64748B]" />}
                        <span>{cv.label}</span>
                        {cv.latency !== undefined && (
                          <span className="font-mono text-[10px] opacity-75">({cv.latency}ms)</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-[#17212B]">{rec.reliability.score}/100</td>
                    <td className="p-3.5">
                      <span className={rec.verificationStatus === 'VERIFIED' ? 'text-[#16865B] font-medium' : 'text-[#D64550] font-medium'}>
                        {rec.verificationStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPdfRecordToExport(rec);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1769AA] hover:text-[#13568C] bg-[#EBF3FB] hover:bg-[#DCEBF9] px-2 py-0.5 rounded mr-2"
                        title="Export Signed PDF"
                      >
                        <FileText className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                      <span className="text-[#1769AA] font-semibold hover:underline">
                        View
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Inspection Modal */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#F5F7FA] border border-[#CBD5E1] rounded-xl sm:rounded-2xl p-3 sm:p-6 max-h-[94vh] overflow-y-auto relative card-elevated-shadow">
            <button
              onClick={() => setSelectedRecordForDetail(null)}
              aria-label="Close modal"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 text-[#64717D] hover:text-[#17212B] p-1.5 rounded-lg bg-white border border-[#CBD5E1] card-soft-shadow cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <RecordVerificationScreen
              record={selectedRecordForDetail}
              onSaveAndFinish={() => setSelectedRecordForDetail(null)}
              onBackToAnalysis={() => setSelectedRecordForDetail(null)}
            />
          </div>
        </div>
      )}

      {/* PDF Export Modal */}
      {pdfRecordToExport && (
        <ExportPdfModal
          isOpen={true}
          onClose={() => setPdfRecordToExport(null)}
          record={pdfRecordToExport}
        />
      )}
    </div>
  );
};
