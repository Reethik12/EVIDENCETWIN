import React, { useState, useEffect } from 'react';
import { SystemInitialization } from './components/layout/SystemInitialization';
import { NavigationRail, NavTab } from './components/layout/NavigationRail';
import { TopConsoleHeader } from './components/layout/TopConsoleHeader';
import { EvidenceOverviewDashboard } from './features/dashboard/EvidenceOverviewDashboard';
import { NewTestWorkflow } from './features/new-test/NewTestWorkflow';
import { EvidenceTimelineHistory } from './features/history/EvidenceTimelineHistory';
import { IntegrityVerificationTool } from './features/verification/IntegrityVerificationTool';
import { KitProfilesView } from './features/kits/KitProfilesView';
import { SettingsView } from './features/settings/SettingsView';
import { DigitalEvidenceRecord, TestKitProfile } from './types/evidence';
import { DemoScenarioDefinition } from './services/data/demoScenarios';
import { evidenceDb } from './services/data/evidenceDatabase';

export default function App() {
  const [booted, setBooted] = useState(false);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);

  const [records, setRecords] = useState<DigitalEvidenceRecord[]>([]);
  const [stats, setStats] = useState({
    totalTests: 24,
    positive: 6,
    negative: 13,
    inconclusive: 5,
    manualReview: 3,
  });

  const [activeWorkflowScenario, setActiveWorkflowScenario] = useState<DemoScenarioDefinition | null>(null);
  const [activeWorkflowKit, setActiveWorkflowKit] = useState<TestKitProfile | null>(null);
  const [inspectingRecord, setInspectingRecord] = useState<DigitalEvidenceRecord | null>(null);

  // Load database records on boot
  const reloadData = async () => {
    await evidenceDb.init();
    const all = await evidenceDb.getAllRecords();
    setRecords(all);
    setStats(evidenceDb.getStats());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleLaunchNewTest = (scenario?: DemoScenarioDefinition, kit?: TestKitProfile) => {
    setActiveWorkflowScenario(scenario || null);
    setActiveWorkflowKit(kit || null);
    setCurrentTab('new-test');
    setInspectingRecord(null);
  };

  const handleFinishNewTest = async (savedRecord: DigitalEvidenceRecord) => {
    await reloadData();
    setInspectingRecord(savedRecord);
    setCurrentTab('history');
  };

  const getViewTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Evidence Overview';
      case 'new-test':
        return 'New Field Test';
      case 'history':
        return 'Evidence Timeline';
      case 'verification':
        return 'Integrity Verification';
      case 'kit-profiles':
        return 'Kit Profiles';
      case 'settings':
        return 'Console Settings';
      default:
        return 'EvidenceTwin';
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#17212B] flex flex-col antialiased selection:bg-[#1769AA]/15 selection:text-[#1769AA]">
      {/* 1. Initial Diagnostic Boot Sequence */}
      {!booted && (
        <SystemInitialization onComplete={() => setBooted(true)} />
      )}

      {/* 2. Main Instrument Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Rail */}
        <NavigationRail
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setInspectingRecord(null);
          }}
          collapsed={railCollapsed}
          onToggleCollapse={() => setRailCollapsed(!railCollapsed)}
        />

        {/* Console Workspace Stage */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Console Header */}
          <TopConsoleHeader
            currentViewTitle={getViewTitle()}
            isDemoMode={isDemoMode}
            onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
            onLaunchNewTest={() => handleLaunchNewTest()}
          />

          {/* Dynamic Active Workspace View */}
          <main className="flex-1 pb-28 md:pb-12 px-2.5 sm:px-5 md:px-8 py-3 md:py-6">
            {currentTab === 'dashboard' && (
              <EvidenceOverviewDashboard
                records={records}
                stats={stats}
                onLaunchNewTest={handleLaunchNewTest}
                onViewRecord={(rec) => {
                  setInspectingRecord(rec);
                  setCurrentTab('history');
                }}
                onNavigateToHistory={() => setCurrentTab('history')}
              />
            )}

            {currentTab === 'new-test' && (
              <NewTestWorkflow
                initialScenario={activeWorkflowScenario}
                initialKit={activeWorkflowKit}
                onFinishWorkflow={handleFinishNewTest}
                onCancel={() => setCurrentTab('dashboard')}
              />
            )}

            {currentTab === 'history' && (
              <EvidenceTimelineHistory
                records={records}
                onRecordUpdated={reloadData}
              />
            )}

            {currentTab === 'verification' && (
              <IntegrityVerificationTool
                records={records}
              />
            )}

            {currentTab === 'kit-profiles' && (
              <KitProfilesView
                onLaunchWithKit={(kit) => handleLaunchNewTest(undefined, kit)}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                isDemoMode={isDemoMode}
                onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
                onDataReset={reloadData}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
