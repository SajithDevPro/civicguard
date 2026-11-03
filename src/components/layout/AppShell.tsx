import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  MapPin,
  ClipboardList,
  Radio,
  Search,
  BarChart3,
  Database,
  Menu,
  X,
  UserCheck,
  KeyRound,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { Header } from '../Header';
import { useResponsive } from '../../hooks/useResponsive';

export type NavTab =
  | 'landing'
  | 'map'
  | 'operations'
  | 'my-reports'
  | 'anti-fencing'
  | 'schema'
  | 'metrics';

interface AppShellProps {
  currentRole: UserRole;
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenReportModal: () => void;
  unresolvedCount: number;
  onOpenCaseDossier?: (incidentId: string) => void;
  onOpenAuthModal?: () => void;
  onOpenTechCaseStudy?: () => void;
  onOpenLegal?: (tab: 'terms' | 'privacy' | 'disclaimer') => void;
  children: React.ReactNode;
  liveTelemetryMetrics?: {
    active_stations_count: number;
    pending_count: number;
    recovery_rate_percent: number;
  };
  onRefreshData?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRole,
  currentUser,
  availableUsers,
  onSelectUser,
  activeTab,
  onSelectTab,
  onOpenReportModal,
  unresolvedCount,
  onOpenCaseDossier,
  onOpenAuthModal,
  onOpenTechCaseStudy,
  onOpenLegal,
  children,
  liveTelemetryMetrics,
  onRefreshData,
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const navItems = [
    { id: 'landing' as NavTab, label: 'Overview', icon: Shield },
    { id: 'map' as NavTab, label: 'Tactical Map', icon: MapPin },
    { id: 'my-reports' as NavTab, label: 'My Filings', icon: ClipboardList },
    {
      id: 'operations' as NavTab,
      label: 'Operations Board',
      icon: Radio,
      badge: unresolvedCount > 0 ? unresolvedCount : undefined,
    },
    { id: 'anti-fencing' as NavTab, label: 'Anti-Fencing', icon: Search },
    { id: 'metrics' as NavTab, label: 'Analytics', icon: BarChart3 },
    { id: 'schema' as NavTab, label: 'Schema & RLS', icon: Database },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-x-hidden antialiased selection:bg-emerald-500 selection:text-black">
      {/* Top Header (Desktop & Tablet) */}
      <Header
        currentRole={currentRole}
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSelectUser={onSelectUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          onSelectTab(tab);
          setIsMobileDrawerOpen(false);
        }}
        onOpenReportModal={onOpenReportModal}
        unresolvedCount={unresolvedCount}
        onOpenCaseDossier={onOpenCaseDossier}
        onOpenAuthModal={onOpenAuthModal}
        onOpenTechCaseStudy={onOpenTechCaseStudy}
      />

      {/* Mobile Drawer Slide-out Sheet Trigger Bar (Visible on <768px) */}
      <div className="md:hidden sticky top-16 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono min-h-[44px] cursor-pointer"
        >
          <Menu className="w-4 h-4 text-emerald-400" />
          <span>Menu & Tools</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Mobile Persona Switcher Quick Tag */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentUser.role === UserRole.OFFICER
                  ? 'bg-blue-400'
                  : currentUser.role === UserRole.ADMIN
                  ? 'bg-purple-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="text-slate-300 uppercase">{currentUser.role}</span>
          </div>

          <button
            type="button"
            onClick={onOpenReportModal}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-1 shadow-sm min-h-[44px] cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* Tactical Telemetry Sub-Bar (Responsive scaling) */}
      {liveTelemetryMetrics && (
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4 font-mono text-[11px] sm:text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-200">LIVE FEED</span>
              </span>
              <span className="text-slate-600 hidden xs:inline">|</span>
              <span className="text-slate-300">
                Precincts: <strong className="text-white">{liveTelemetryMetrics.active_stations_count}</strong>
              </span>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <span className="text-slate-300">
                Pending: <strong className="text-amber-400">{liveTelemetryMetrics.pending_count}</strong>
              </span>
              <span className="text-slate-600 hidden md:inline">|</span>
              <span className="text-slate-300 hidden md:inline">
                Recovery Rate: <strong className="text-emerald-400">{liveTelemetryMetrics.recovery_rate_percent}%</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-[11px] min-h-[32px]"
              >
                <span>IAM:</span>
                <span className="text-emerald-400 font-bold uppercase">{currentUser.role}</span>
              </button>
              {onRefreshData && (
                <button
                  type="button"
                  onClick={onRefreshData}
                  className="text-slate-400 hover:text-slate-200 transition-colors text-[11px] min-h-[32px] hidden sm:flex items-center gap-1"
                  title="Sync with PostgreSQL"
                >
                  ↻ Sync
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport Content Area with mobile bottom padding for dock */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Slide-out Drawer Sheet */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Slide-out Drawer Panel */}
          <div className="relative w-4/5 max-w-xs bg-slate-950 border-r border-slate-800 h-full flex flex-col p-5 shadow-2xl z-10 animate-slideRight">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">CivicGuard</div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Command Navigation</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Persona Switcher Block */}
            <div className="py-4 border-b border-slate-800 space-y-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulate RBAC Persona</span>
              </div>
              <div className="space-y-1">
                {availableUsers.map((u) => {
                  const isSelected = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        onSelectUser(u);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors min-h-[44px] ${
                        isSelected
                          ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 font-bold'
                          : 'bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <div>{u.full_name}</div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase">
                          {u.role} {u.badge_number ? `#${u.badge_number}` : ''}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 py-4 space-y-1 overflow-y-auto">
              <div className="text-[11px] font-mono text-slate-400 uppercase px-2 mb-2">
                Operational Modules
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full p-3 rounded-lg text-xs font-medium flex items-center justify-between transition-colors min-h-[44px] cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white font-bold shadow-md'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/30 text-amber-200 border border-amber-500/40">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              {onOpenTechCaseStudy && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenTechCaseStudy();
                  }}
                  className="w-full py-2.5 px-3 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-lg text-xs font-mono text-emerald-300 flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Architecture & Tech Dossier</span>
                </button>
              )}

              {onOpenLegal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenLegal('disclaimer');
                  }}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex items-center justify-center gap-2 min-h-[40px] cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Legal & 911 Disclaimer</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  if (onOpenAuthModal) onOpenAuthModal();
                }}
                className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex items-center justify-center gap-2 min-h-[44px]"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>IAM Authentication Portal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onOpenReportModal();
                }}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 min-h-[44px] shadow-lg shadow-emerald-950"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>File Stolen Asset Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Navigation Bar (<768px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl"
      >
        <button
          type="button"
          onClick={() => onSelectTab('landing')}
          className={`flex flex-col items-center justify-center gap-1 p-1 rounded-lg min-h-[48px] min-w-[48px] text-[10px] font-mono transition-colors ${
            activeTab === 'landing' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('map')}
          className={`flex flex-col items-center justify-center gap-1 p-1 rounded-lg min-h-[48px] min-w-[48px] text-[10px] font-mono transition-colors ${
            activeTab === 'map' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span>Map</span>
        </button>

        {/* Highlighted Center Report Action Button */}
        <button
          type="button"
          onClick={onOpenReportModal}
          className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-slate-950 shadow-xl shadow-emerald-900/60 transition-transform active:scale-95 cursor-pointer"
          title="Report Stolen Asset"
        >
          <ShieldAlert className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('operations')}
          className={`relative flex flex-col items-center justify-center gap-1 p-1 rounded-lg min-h-[48px] min-w-[48px] text-[10px] font-mono transition-colors ${
            activeTab === 'operations' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-5 h-5" />
          <span>Ops</span>
          {unresolvedCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('anti-fencing')}
          className={`flex flex-col items-center justify-center gap-1 p-1 rounded-lg min-h-[48px] min-w-[48px] text-[10px] font-mono transition-colors ${
            activeTab === 'anti-fencing' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Serial</span>
        </button>
      </nav>

      {/* GovTech Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/90 px-4 sm:px-6 py-4 text-xs font-mono text-slate-500 pb-16 md:pb-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="space-y-0.5">
            <div className="text-slate-400 font-semibold flex items-center justify-center md:justify-start gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>CivicGuard Public Safety & Asset Recovery Platform</span>
            </div>
            <div className="text-[11px] text-slate-600">
              PostGIS / Supabase Enterprise Edition · Zero-Trust RBAC & Automated Anti-Fencing
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => onOpenLegal?.('disclaimer')}
              className="hover:text-rose-400 text-rose-300/80 transition-colors cursor-pointer flex items-center gap-1 font-bold"
            >
              <span>⚠️ 911 & Liability Disclaimer</span>
            </button>
            <span className="text-slate-800">·</span>
            <button
              type="button"
              onClick={() => onOpenLegal?.('terms')}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="text-slate-800">·</span>
            <button
              type="button"
              onClick={() => onOpenLegal?.('privacy')}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Privacy (GDPR/CCPA)
            </button>
            {onOpenTechCaseStudy && (
              <>
                <span className="text-slate-800">·</span>
                <button
                  type="button"
                  onClick={onOpenTechCaseStudy}
                  className="hover:text-emerald-300 text-emerald-400/90 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Architecture Dossier</span>
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
