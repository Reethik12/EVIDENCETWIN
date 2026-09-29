import React from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  History,
  ShieldCheck,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { EvidenceTwinLogo } from '../common/EvidenceTwinLogo';

export type NavTab = 'dashboard' | 'new-test' | 'history' | 'verification' | 'kit-profiles' | 'settings';

interface NavigationRailProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
    { id: 'new-test' as NavTab, label: 'New Test', shortLabel: 'New Test', icon: FlaskConical },
    { id: 'history' as NavTab, label: 'Evidence Timeline', shortLabel: 'Timeline', icon: History },
    { id: 'verification' as NavTab, label: 'Verification', shortLabel: 'Verify', icon: ShieldCheck },
    { id: 'kit-profiles' as NavTab, label: 'Kit Profiles', shortLabel: 'Kits', icon: Layers },
    { id: 'settings' as NavTab, label: 'Settings', shortLabel: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* 1. DESKTOP & TABLET SIDEBAR RAIL (md:flex, hidden on mobile) */}
      <aside
        className={`hidden md:flex relative z-30 flex-col border-r border-[#E2E8F0] bg-white transition-all duration-200 select-none shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-3.5 border-b border-[#EEF2F6]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <EvidenceTwinLogo size={30} />
            {!collapsed && (
              <div className="truncate">
                <span className="text-sm font-bold text-[#17212B] tracking-tight">EvidenceTwin</span>
                <p className="text-[11px] text-[#64717D] leading-none">Digital Field Companion</p>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-7 w-7 items-center justify-center text-[#8A96A3] hover:text-[#17212B] hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav List */}
        <nav className="flex-1 space-y-1 p-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[42px] ${
                  isActive
                    ? 'bg-[#EBF3FB] text-[#1769AA] font-semibold'
                    : 'text-[#64717D] hover:bg-[#F8FAFC] hover:text-[#17212B]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#1769AA]' : 'text-[#8A96A3] group-hover:text-[#17212B]'
                  }`}
                />
                {!collapsed && (
                  <span className="flex-1 text-left truncate">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        {!collapsed && (
          <div className="p-3.5 border-t border-[#EEF2F6] text-[11px] text-[#8A96A3]">
            <div className="flex items-center justify-between text-[#64717D]">
              <span>System Status</span>
              <span className="text-[#16865B] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16865B]" /> Nominal
              </span>
            </div>
            <p className="mt-1 text-[10px] text-[#8A96A3]">EvidenceTwin // Field Edition</p>
          </div>
        )}
      </aside>

      {/* 2. MOBILE BOTTOM NAVIGATION BAR (md:hidden, ergonomic thumb zone) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#CBD5E1] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
      >
        <div className="flex items-center justify-around h-15 px-1.5 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isNewTest = item.id === 'new-test';

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 rounded-lg transition-all cursor-pointer relative touch-manipulation ${
                  isActive
                    ? 'text-[#1769AA] font-bold'
                    : 'text-[#64717D] hover:text-[#17212B]'
                }`}
              >
                {/* Active Indicator Background Pill */}
                {isActive && (
                  <span className="absolute inset-x-1.5 inset-y-1 bg-[#EBF3FB] rounded-lg -z-10 transition-all" />
                )}

                <div className="relative">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform ${
                      isActive ? 'text-[#1769AA] scale-110' : 'text-[#8A96A3]'
                    }`}
                  />
                  {isNewTest && !isActive && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#1769AA]" />
                  )}
                </div>

                <span
                  className={`text-[10px] tracking-tight leading-none mt-1 transition-colors ${
                    isActive ? 'text-[#1769AA] font-bold' : 'text-[#64717D]'
                  }`}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
