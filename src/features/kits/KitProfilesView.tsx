import React, { useState } from 'react';
import { getAllKitProfiles, saveCustomKitProfile, DEMO_KIT_PROFILES, STANDARD_6PATCH_CARD } from '../../services/data/kitProfiles';
import { TestKitProfile, ReactionProfile } from '../../types/evidence';
import {
  Clock,
  FlaskConical,
  Search,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Beaker,
  CheckCircle2,
  HelpCircle,
  FileText,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles
} from 'lucide-react';

interface KitProfilesViewProps {
  onLaunchWithKit?: (kit: TestKitProfile) => void;
}

export const KitProfilesView: React.FC<KitProfilesViewProps> = ({ onLaunchWithKit }) => {
  const [kits, setKits] = useState<TestKitProfile[]>(() => getAllKitProfiles());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubstanceFilter, setSelectedSubstanceFilter] = useState<string>('ALL');
  const [expandedReactionKitId, setExpandedReactionKitId] = useState<string | null>(null);

  // Custom kit registration modal state
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customManufacturer, setCustomManufacturer] = useState('Demonstration');
  const [customSubstances, setCustomSubstances] = useState('');
  const [customReagentType, setCustomReagentType] = useState('Aqueous Colorimetric Reagent');
  const [customReactionWindow, setCustomReactionWindow] = useState('20');
  const [customPosColor, setCustomPosColor] = useState('#2A6F97');
  const [customPosLabel, setCustomPosLabel] = useState('Deep Ocean Blue');
  const [customNegColor, setCustomNegColor] = useState('#E9C46A');
  const [customTolerance, setCustomTolerance] = useState('11.0');

  const allSubstances = Array.from(
    new Set(kits.flatMap((k) => k.targetSubstances))
  );

  const filteredKits = kits.filter((k) => {
    const matchesSearch =
      k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.targetSubstances.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      k.reagentType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedSubstanceFilter === 'ALL' ||
      k.targetSubstances.includes(selectedSubstanceFilter);

    return matchesSearch && matchesFilter;
  });

  const handleRegisterKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customCode.trim()) return;

    const substancesArray = customSubstances
      ? customSubstances.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Screening Target'];

    const newId = `kit-custom-${Date.now()}`;
    const reactionId = `rx-${newId}-primary`;

    const primaryReaction: ReactionProfile = {
      id: reactionId,
      name: `${customName} - Primary Reaction`,
      code: `${customCode.toUpperCase()}-RX-01`,
      reagentDescription: customReagentType,
      targetCategory: substancesArray[0],
      reactionWindowSeconds: parseInt(customReactionWindow, 10) || 20,
      chemicalMechanism: 'Colorimetric chromophoric complexation with target analyte producing characteristic spectral shift.',
      knownInterferents: [],
      profileVersion: 'v1.0-PROTOTYPE',
      status: 'PROTOTYPE',
      version: 'v1.0-PROTOTYPE',
      expectedColourRegions: [
        {
          result: 'POSITIVE',
          classification: 'POSITIVE',
          colorHex: customPosColor,
          label: customPosLabel || 'Positive Chromophore',
          meaning: `Presumptive indication for ${substancesArray.join(', ')}.`,
          deltaETolerance: parseFloat(customTolerance) || 11.0,
        },
        {
          result: 'NEGATIVE',
          classification: 'NEGATIVE',
          colorHex: customNegColor,
          label: 'Negative Unreacted Base',
          meaning: 'No chromophoric transition detected.',
          deltaETolerance: 9.0,
        },
      ],
      interpretationRules: {
        method: 'THRESHOLD',
        maxDeltaE: parseFloat(customTolerance) || 11.0,
        minConfidence: 65,
      },
      calibrationRequirements: {
        minCardPatches: 15,
        maxResidualDeltaE: 3.5,
      },
      temporalAnalysis: {
        enabled: true,
        observationDurationSeconds: parseInt(customReactionWindow, 10) || 20,
        samplingIntervalSeconds: 1,
        stabilizationThresholdDeltaEPerSec: 0.85,
      },
    };

    const newKit: TestKitProfile = {
      id: newId,
      name: customName,
      code: customCode.toUpperCase(),
      manufacturer: customManufacturer,
      testType: 'Aqueous Colorimetric Reagent',
      targetCategory: substancesArray[0],
      profileVersion: 'v1.0-PROTOTYPE',
      status: 'PROTOTYPE',
      version: 'v1.0-PROTOTYPE',
      referenceCard: STANDARD_6PATCH_CARD,
      calibrationMethod: 'AFFINE_PATCH_NORMALIZATION',
      handlingWarnings: ['Handle colorimetric reagents with caution in a well-ventilated area'],
      disposalProtocol: 'Neutralize with water before laboratory disposal stream',
      targetSubstances: substancesArray,
      reagentType: customReagentType,
      reactionWindowSeconds: parseInt(customReactionWindow, 10) || 20,
      reactionProfiles: [primaryReaction],
      chemicalMechanism: 'Organic chromophoric reaction with sample target producing characteristic optical absorbance shift.',
      referenceColors: [
        { name: 'White 90%', hex: '#E5E9EE', role: 'Upper calibration ceiling' },
        { name: 'Grey 18%', hex: '#7C8592', role: 'Neutral mid-tone baseline' },
        { name: 'Black 3%', hex: '#1E242C', role: 'Lower shadow floor' },
        { name: 'Ref Cyan', hex: '#00A3D9', role: 'Short wavelength registration' },
        { name: 'Ref Magenta', hex: '#D63384', role: 'Mid-long chromatic marker' },
        { name: 'Ref Yellow', hex: '#E6A817', role: 'Warm spectrum alignment' },
      ],
      colorResponseChart: [
        {
          result: 'POSITIVE',
          colorHex: customPosColor,
          label: customPosLabel,
          meaning: `Presumptive indication of ${substancesArray[0]}.`,
        },
        {
          result: 'NEGATIVE',
          colorHex: customNegColor,
          label: 'Negative Base',
          meaning: 'No chromophoric transition detected.',
        },
      ],
    };

    saveCustomKitProfile(newKit);
    setKits(getAllKitProfiles());
    setRegisterModalOpen(false);

    // Reset form
    setCustomName('');
    setCustomCode('');
    setCustomSubstances('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-4">
        <div>
          <span className="text-xs font-semibold text-[#1769AA] uppercase tracking-wide">
            Universal Reagent Specifications // Forensic Standard
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-[#17212B] mt-0.5">
            Test Kit Catalogue &amp; Universal Profile Engine
          </h2>
          <p className="text-xs text-[#64717D]">
            Kit-agnostic colorimetric field-test companion. Supports standard and custom reagent profiles, reaction kinetics, and CIE Lab calibration standards.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-[#16865B] bg-[#F0FDF4] px-3 py-1 rounded-full border border-[#DCFCE7] self-start md:self-auto">
            {kits.length} Reagent Profiles Active
          </span>
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1769AA] hover:bg-[#13568C] text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Custom Profile</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl card-soft-shadow space-y-3">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-[#8A96A3] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search profiles by reagent name, code, substance (e.g. Marquis, Scott, Cocaine, Heroin, Opiates)..."
            className="w-full text-xs text-[#17212B] bg-transparent focus:outline-none placeholder:text-[#8A96A3]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#8A96A3] hover:text-[#17212B] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Filter Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#EEF2F6] text-xs">
          <span className="text-[10px] font-bold text-[#8A96A3] uppercase mr-1">Filter by Target:</span>
          <button
            onClick={() => setSelectedSubstanceFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              selectedSubstanceFilter === 'ALL'
                ? 'bg-[#1769AA] text-white'
                : 'bg-[#F8FAFC] text-[#64717D] hover:bg-[#EEF2F6]'
            }`}
          >
            All Reagents ({kits.length})
          </button>
          {allSubstances.slice(0, 6).map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubstanceFilter(sub)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                selectedSubstanceFilter === sub
                  ? 'bg-[#1769AA] text-white'
                  : 'bg-[#F8FAFC] text-[#64717D] hover:bg-[#EEF2F6]'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Cards */}
      <div className="space-y-6">
        {filteredKits.map((profile) => {
          const isReactionsExpanded = expandedReactionKitId === profile.id;
          const reactions = profile.reactionProfiles || [];

          return (
            <div
              key={profile.id}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 md:p-8 space-y-6 card-soft-shadow"
            >
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EEF2F6] gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#1769AA]">{profile.code}</span>
                    <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
                    <span className="text-xs font-medium text-[#1769AA] bg-[#EBF3FB] px-2.5 py-0.5 rounded-full border border-[#BFDBFE]">
                      {profile.status || 'PROTOTYPE'} Specification
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#17212B] mt-1">{profile.name}</h3>
                  <p className="text-xs text-[#64717D] mt-0.5">
                    Manufacturer: {profile.manufacturer} • Specification Standard {profile.version}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#64717D] bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
                    <Clock className="w-4 h-4 text-[#1769AA]" />
                    <span>Reaction Window: <strong className="text-[#17212B]">{profile.reactionWindowSeconds}s</strong></span>
                  </div>

                  {onLaunchWithKit && (
                    <button
                      onClick={() => onLaunchWithKit(profile)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#1769AA] hover:bg-[#13568C] text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer min-h-[38px]"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>Run Test With Kit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Target Analytes & Chemistry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-[#FAFBFD] rounded-lg border border-[#E2E8F0] space-y-1.5">
                  <span className="text-[10px] font-bold text-[#8A96A3] uppercase block">Target Substance Classes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.targetSubstances.map((sub, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-[#EBF3FB] text-[#1769AA] rounded font-semibold text-xs border border-[#BFDBFE]"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-[#FAFBFD] rounded-lg border border-[#E2E8F0] space-y-1">
                  <span className="text-[10px] font-bold text-[#8A96A3] uppercase block">Reagent Chemistry Composition</span>
                  <span className="text-xs text-[#17212B] font-mono leading-relaxed block">
                    {profile.reagentType}
                  </span>
                </div>
              </div>

              {/* Chemical Mechanism */}
              {profile.chemicalMechanism && (
                <div className="p-4 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-[#1769AA] font-bold text-[11px] uppercase tracking-wider">
                    <Beaker className="w-3.5 h-3.5" />
                    <span>Chemical Reaction Mechanism</span>
                  </div>
                  <p className="text-xs text-[#64717D] leading-relaxed">
                    {profile.chemicalMechanism}
                  </p>
                </div>
              )}

              {/* FEATURE 4 & Universal Engine: Expandable Reaction Profiles Breakdown */}
              <div className="border border-[#CBD5E1] rounded-xl overflow-hidden bg-[#FAFBFD]">
                <button
                  onClick={() => setExpandedReactionKitId(isReactionsExpanded ? null : profile.id)}
                  className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-[#17212B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1769AA]" />
                    <span>Reaction Profiles &amp; Expected Color Regions ({reactions.length} defined)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#64717D]">
                    <span className="text-[11px] font-normal">{isReactionsExpanded ? 'Hide Details' : 'View Profiles'}</span>
                    {isReactionsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isReactionsExpanded && (
                  <div className="p-4 pt-1 space-y-4 border-t border-[#E2E8F0] bg-white">
                    {reactions.map((rx) => (
                      <div key={rx.id} className="p-4 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] space-y-3 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#EEF2F6]">
                          <div>
                            <span className="font-bold text-sm text-[#17212B]">{rx.name}</span>
                            <span className="text-[11px] text-[#64717D] block">{rx.reagentDescription}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#1769AA] bg-[#EBF3FB] px-2 py-0.5 rounded border border-[#BFDBFE] self-start sm:self-auto">
                            Window: {rx.reactionWindowSeconds}s • {rx.version}
                          </span>
                        </div>

                        {/* Expected colour regions */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-[#8A96A3] uppercase block">
                            Expected Colourimetric Response Regions:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {rx.expectedColourRegions.map((region, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-md bg-white border border-[#CBD5E1] flex items-center gap-2.5 text-xs"
                              >
                                <div
                                  className="w-7 h-7 rounded border border-[#CBD5E1] shrink-0"
                                  style={{ backgroundColor: region.colorHex }}
                                />
                                <div className="truncate">
                                  <span className={`text-[10px] font-bold ${
                                    region.classification === 'POSITIVE' ? 'text-[#1769AA]' :
                                    region.classification === 'NEGATIVE' ? 'text-[#16865B]' : 'text-[#D88A00]'
                                  }`}>
                                    {region.classification}
                                  </span>
                                  <p className="font-semibold text-[#17212B] truncate text-[11px]">{region.label}</p>
                                  <span className="text-[10px] text-[#8A96A3] font-mono">&Delta;E tol: {region.deltaETolerance}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Temporal Kinetics Specs */}
                        {rx.temporalAnalysis && (
                          <div className="pt-1 text-[11px] text-[#64717D] flex flex-wrap items-center gap-4 font-mono bg-white p-2 rounded border border-[#EEF2F6]">
                            <span>Obs Duration: <strong>{rx.temporalAnalysis.observationDurationSeconds}s</strong></span>
                            <span>Sampling: <strong>{rx.temporalAnalysis.samplingIntervalSeconds}s</strong></span>
                            <span>Stab Threshold: <strong>{rx.temporalAnalysis.stabilizationThresholdDeltaEPerSec} &Delta;E/sec</strong></span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reaction Response Matrix */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#17212B] mb-3">
                  Colorimetric Reaction Response Matrix
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {profile.colorResponseChart.map((resp, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] flex items-center gap-3 text-xs"
                    >
                      <div
                        className="w-10 h-10 rounded-lg border border-[#CBD5E1] shadow-xs shrink-0"
                        style={{ backgroundColor: resp.colorHex }}
                      />
                      <div className="truncate">
                        <span className={`text-xs font-bold ${
                          resp.result === 'POSITIVE' ? 'text-[#1769AA]' :
                          resp.result === 'NEGATIVE' ? 'text-[#16865B]' : 'text-[#D88A00]'
                        }`}>
                          {resp.result}
                        </span>
                        <p className="font-semibold text-[#17212B] truncate">{resp.label}</p>
                        <p className="text-[11px] text-[#64717D] truncate">{resp.meaning}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Register New Universal Reagent Profile */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-[#CBD5E1] rounded-2xl p-6 max-h-[90vh] overflow-y-auto relative card-elevated-shadow space-y-5">
            <button
              onClick={() => setRegisterModalOpen(false)}
              className="absolute top-4 right-4 text-[#64717D] hover:text-[#17212B] p-1.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-xs font-bold text-[#1769AA] uppercase tracking-wider">
                Universal Test Kit &amp; Reaction Engine
              </span>
              <h3 className="text-xl font-bold text-[#17212B]">Register Custom Reagent Profile</h3>
              <p className="text-xs text-[#64717D]">
                Define a new kit profile with expected colourimetry, reaction window, and CIE Lab tolerance for automated field testing.
              </p>
            </div>

            <form onSubmit={handleRegisterKit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#17212B] block">Kit Profile Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mandelin Reagent Field Kit"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#17212B] focus:outline-none focus:border-[#1769AA]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#17212B] block">Reagent Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MAN-2026"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-mono text-[#17212B] focus:outline-none focus:border-[#1769AA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#17212B] block">Manufacturer / Standard</label>
                  <input
                    type="text"
                    value={customManufacturer}
                    onChange={(e) => setCustomManufacturer(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#17212B] focus:outline-none focus:border-[#1769AA]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#17212B] block">Reaction Window (Seconds)</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={customReactionWindow}
                    onChange={(e) => setCustomReactionWindow(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-mono text-[#17212B] focus:outline-none focus:border-[#1769AA]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#17212B] block">Target Substance Classes (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Amphetamines, Methadone, Ketamine"
                  value={customSubstances}
                  onChange={(e) => setCustomSubstances(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#17212B] focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div className="p-3 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl space-y-3">
                <span className="font-bold text-[11px] text-[#1769AA] uppercase block">
                  Expected Positive Colour Region
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8A96A3] block">Target Hex</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customPosColor}
                        onChange={(e) => setCustomPosColor(e.target.value)}
                        className="w-8 h-8 rounded border border-[#CBD5E1] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customPosColor}
                        onChange={(e) => setCustomPosColor(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8A96A3] block">Description Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Deep Olive Green"
                      value={customPosLabel}
                      onChange={(e) => setCustomPosLabel(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8A96A3] block">&Delta;E Tolerance</label>
                    <input
                      type="number"
                      step="0.5"
                      min="3"
                      max="30"
                      value={customTolerance}
                      onChange={(e) => setCustomTolerance(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF2F6]">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#64717D] rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1769AA] hover:bg-[#13568C] text-white font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Register Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
