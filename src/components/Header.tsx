import React from 'react';
import { Shield, ShieldAlert, UserCheck, Radio, KeyRound, Sparkles } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { NotificationCenter } from './notifications/NotificationCenter';

interface HeaderProps {
  currentRole: UserRole;
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  activeTab: 'landing' | 'map' | 'operations' | 'my-reports' | 'anti-fencing' | 'schema' | 'metrics';
  onSelectTab: (tab: 'landing' | 'map' | 'operations' | 'my-reports' | 'anti-fencing' | 'schema' | 'metrics') => void;
  onOpenReportModal: () => void;
  unresolvedCount: number;
  onOpenCaseDossier?: (incidentId: string) => void;
  onOpenAuthModal?: () => void;
  onOpenTechCaseStudy?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
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
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark with domain mark */}
          <div
            onClick={() => onSelectTab('landing')}
            className="flex items-center gap-3 shrink-0 cursor-pointer group"
            title="Return to Public Overview"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400 group-hover:scale-105 transition-all">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap group-hover:text-emerald-300 transition-colors">
                CivicGuard
              </span>
              <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
                GovTech Security & Recovery
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <button
              type="button"
              onClick={() => onSelectTab('landing')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs uppercase tracking-wider font-semibold ${
                activeTab === 'landing'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('map')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs uppercase tracking-wider font-semibold ${
                activeTab === 'map'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Tactical Map
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('my-reports')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs uppercase tracking-wider font-semibold ${
                activeTab === 'my-reports'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              My Filings
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('operations')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs uppercase tracking-wider font-semibold flex items-center gap-2 ${
                activeTab === 'operations'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Operations Board</span>
              {unresolvedCount > 0 && (
                <span className="px-1.5 py-0.2 font-mono text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                  {unresolvedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('anti-fencing')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs uppercase tracking-wider font-semibold ${
                activeTab === 'anti-fencing'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Anti-Fencing
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('metrics')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs uppercase tracking-wider font-semibold ${
                activeTab === 'metrics'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Analytics
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('schema')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs uppercase tracking-wider font-semibold ${
                activeTab === 'schema'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Schema & RLS
            </button>
          </nav>

          {/* Zone 3: 1 primary action + RBAC Persona Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Persona Switcher for evaluating RLS in real time */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label htmlFor="persona-select" className="text-slate-400 text-[11px] uppercase tracking-wider">
                Persona:
              </label>
              <select
                id="persona-select"
                value={currentUser.id}
                onChange={(e) => {
                  const target = availableUsers.find((u) => u.id === e.target.value);
                  if (target) onSelectUser(target);
                }}
                className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer pr-1"
              >
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                    {u.full_name} ({u.role.toUpperCase()}{u.badge_number ? ` #${u.badge_number}` : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Role indicator tag & Badge */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentUser.role === UserRole.OFFICER
                    ? 'bg-blue-400'
                    : currentUser.role === UserRole.ADMIN
                    ? 'bg-purple-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-slate-300 uppercase tracking-wider">{currentUser.role}</span>
              {currentUser.badge_number && (
                <span className="text-blue-400 border-l border-slate-700 pl-1.5 font-bold">
                  #{currentUser.badge_number}
                </span>
              )}
            </div>

            {/* Engineering Dossier / Recruiter Architecture Button */}
            {onOpenTechCaseStudy && (
              <button
                type="button"
                onClick={onOpenTechCaseStudy}
                title="Engineering Architecture & Technical Case Study"
                className="px-2.5 py-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-white border border-emerald-500/40 transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer shadow-sm min-h-[36px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="hidden xl:inline text-[11px] font-bold">Tech Stack</span>
              </button>
            )}

            {/* Auth / IAM Gateway Button */}
            <button
              type="button"
              onClick={onOpenAuthModal}
              title="Identity & Access Management / Sign In"
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-mono"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-[11px]">IAM</span>
            </button>

            {/* Real-time Notification Center Bell & Dropdown Drawer */}
            <NotificationCenter onOpenCaseDossier={onOpenCaseDossier} />

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={onOpenReportModal}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded border border-emerald-500 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm shadow-emerald-950 min-h-[38px] cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report Stolen Asset</span>
              <span className="sm:hidden">Report</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

