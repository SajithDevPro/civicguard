/**
 * CivicGuard Authorized Officer Command Center (OfficerDashboard.tsx)
 * Enterprise operational dashboard integrating real-time incident streaming,
 * high-density triage table, precinct analytics bar, and deep-dive case manager.
 * Strictly enforces Role-Based Access Control (RBAC).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Lock,
  Volume2,
  VolumeX,
  Bell,
  RefreshCw,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  AssetMatch,
  IncidentReport,
  IncidentStatus,
  PoliceStation,
  SystemMetrics,
  UserProfile,
  UserRole,
} from '../types';
import { useIncidentStream } from '../hooks/useIncidentStream';
import { PrecinctMetricsBar } from './officer/PrecinctMetricsBar';
import { ResponsiveTriageTable } from './officer/ResponsiveTriageTable';
import { CaseDetailModal } from './officer/CaseDetailModal';
import { DispatchAlertBanner } from './officer/DispatchAlertBanner';
import { AssetMatchReviewModal } from './officer/AssetMatchReviewModal';
import { fetchAssetMatches, verifyAssetMatch } from '../services/matching';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OfficerDashboardProps {
  incidents: IncidentReport[];
  stations: PoliceStation[];
  metrics: SystemMetrics;
  currentUser: UserProfile;
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus, notes?: string) => Promise<void>;
  onSelectIncident: (incident: IncidentReport) => void;
  onOpenReportModal: () => void;
  isUpdating: boolean;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  stations,
  metrics,
  currentUser,
  onUpdateStatus,
  isUpdating,
}) => {
  // 1. Strict RBAC Authorization Check
  const isAuthorized =
    currentUser.role === UserRole.OFFICER || currentUser.role === UserRole.ADMIN;

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedCase, setSelectedCase] = useState<IncidentReport | null>(null);
  const [matches, setMatches] = useState<AssetMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<AssetMatch | null>(null);

  // Officer assigned station
  const officerStation =
    stations.find((s) => s.id === currentUser.station_id) || stations[0] || null;

  // 2. Real-Time WebSocket Incident Stream Hook
  const {
    incidents: streamedIncidents,
    loading: streamLoading,
    alertIncident,
    clearAlert,
    refetch,
  } = useIncidentStream({
    currentUser,
    stationIdFilter: 'all',
    enableAudioChime: audioEnabled,
  });

  const loadMatches = useCallback(async () => {
    try {
      const matchData = await fetchAssetMatches('all', currentUser);
      setMatches(matchData);
    } catch (err) {
      console.warn('Failed to load asset matches:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleVerifyMatch = async (
    matchId: string,
    action: 'confirmed' | 'rejected',
    notes: string
  ) => {
    await verifyAssetMatch(matchId, action, notes, currentUser);
    await loadMatches();
    await refetch();
  };

  // Unauthorized Access Guard View
  if (!isAuthorized) {
    return (
      <div className="border border-red-900/60 rounded-xl bg-slate-900 p-8 text-center space-y-4 my-8">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">
            Restricted Access: Authorized Law Enforcement Only
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The Incident Triage Command Center requires verified officer credentials and a valid municipal badge number under Row-Level Security policies.
          </p>
        </div>
        <div className="p-3 max-w-sm mx-auto bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-300">
          Current Persona: <strong className="text-white">{currentUser.full_name}</strong> (Role:{' '}
          <span className="text-amber-400 uppercase font-bold">{currentUser.role}</span>)
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Switch to <span className="text-emerald-400 font-bold">Detective Marcus Walker (OFFICER)</span> in the top-right persona bar to access this module.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Officer Command Bar & Tactical Stream Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">
                {officerStation ? officerStation.name : 'Central Police Command'}
              </h2>
              <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-500/50 text-blue-300 font-mono text-[10px] font-bold">
                {currentUser.badge_number ? `BADGE #${currentUser.badge_number}` : 'COMMAND HQ'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Live Intake Queue · Real-Time PostGIS / Supabase Synchronization
            </p>
          </div>
        </div>

        {/* Audio Alert Toggle & Stream Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors flex items-center gap-1.5 ${
              audioEnabled
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title="Toggle audible dispatch alert ping on incoming pending cases"
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{audioEnabled ? 'Chime Active' : 'Chime Muted'}</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
            title="Refresh stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Priority Tactical Dispatch Alert Banner */}
      <DispatchAlertBanner
        incident={alertIncident}
        station={officerStation}
        currentOfficer={currentUser}
        onAcknowledgeAndDispatch={async (id) => {
          await onUpdateStatus(
            id,
            IncidentStatus.INVESTIGATED,
            `Immediate unit dispatched by Officer ${currentUser.full_name} (Badge #${currentUser.badge_number || '4081'}). En route to scene.`
          );
          clearAlert();
        }}
        onOpenDossier={(inc) => {
          setSelectedCase(inc);
          clearAlert();
        }}
        onDismiss={clearAlert}
      />

      {/* Automated Forensic Serial Match Queue Banner */}
      {matches.filter((m) => m.status === 'pending_verification').length > 0 && (
        <div className="p-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/60 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase text-emerald-400 tracking-wider">
                  Automated Serial Matches Awaiting Verification
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-900 border border-emerald-500 text-emerald-300 font-mono text-[10px] font-bold">
                  {matches.filter((m) => m.status === 'pending_verification').length} Flagged
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Serial cross-referencing matched recovered inventory against citizen stolen property reports.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {matches
              .filter((m) => m.status === 'pending_verification')
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMatch(m)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold rounded-lg border border-emerald-500 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>Review {m.match_type.toUpperCase()} ({m.confidence_score}%)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Precinct Analytics Telemetry Header */}
      <PrecinctMetricsBar
        metrics={metrics}
        incidents={streamedIncidents}
        station={officerStation}
      />

      {/* Responsive Triage Table & Adaptive Card View */}
      <ResponsiveTriageTable
        incidents={streamedIncidents}
        stations={stations}
        currentOfficer={currentUser}
        onSelectIncident={(inc) => setSelectedCase(inc)}
        onUpdateStatus={async (id, status) => {
          await onUpdateStatus(id, status);
        }}
        isUpdating={isUpdating}
      />

      {/* Deep-Dive Case Inspection & Status Manager Modal */}
      <CaseDetailModal
        incident={selectedCase}
        stations={stations}
        currentOfficer={currentUser}
        isOpen={Boolean(selectedCase)}
        onClose={() => setSelectedCase(null)}
        onUpdateStatus={async (id, status, notes) => {
          await onUpdateStatus(id, status, notes);
          setSelectedCase((prev) => (prev ? { ...prev, status, officer_notes: notes || prev.officer_notes } : null));
        }}
        isUpdating={isUpdating}
      />

      {/* Forensic Asset Match Review Modal */}
      <AssetMatchReviewModal
        match={selectedMatch}
        isOpen={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
        onVerifyMatch={handleVerifyMatch}
        currentOfficer={currentUser}
      />
    </div>
  );
};
