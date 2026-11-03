import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AppShell } from './components/layout/AppShell';
import { LiveMap } from './components/map/LiveMap';
import { TacticalMap } from './components/TacticalMap';
import { OfficerDashboard } from './components/OfficerDashboard';
import { ReportIncidentModal } from './components/citizen/ReportIncidentModal';
import { MyReportsList } from './components/citizen/MyReportsList';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { SchemaViewer } from './components/SchemaViewer';
import { MetricsDashboard } from './components/MetricsDashboard';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { PublicSerialChecker } from './components/citizen/PublicSerialChecker';
import { AuthModal } from './components/auth/AuthModal';
import { RoleGuard } from './components/auth/ProtectedRoute';
import { LandingPage } from './components/landing/LandingPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { TechCaseStudyModal } from './components/common/TechCaseStudyModal';
import { LegalPages, LegalTab } from './pages/legal/LegalPages';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { NotificationProvider } from './providers/NotificationProvider';
import { SEED_USERS } from './data/seedData';
import {
  CreateIncidentInput,
  GeoCoordinates,
  IncidentFilterOptions,
  IncidentReport,
  IncidentStatus,
  PoliceStation,
  SystemMetrics,
  UserProfile,
  UserRole,
} from './types';
import {
  createIncidentReport,
  fetchActiveIncidents,
  fetchPoliceStations,
  fetchSystemMetrics,
  subscribeToIncidents,
  updateIncidentStatus,
} from './services/db';

function CivicGuardApp() {
  const {
    profile,
    availableUsers,
    switchPersona,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    authModalMode,
  } = useAuth();

  // Current authenticated profile (fallback to Detective Marcus Walker if not yet loaded)
  const currentUser: UserProfile = profile || SEED_USERS[0];

  // Core navigation & data state (defaults to Landing Overview)
  const [activeTab, setActiveTab] = useState<'landing' | 'map' | 'operations' | 'my-reports' | 'anti-fencing' | 'schema' | 'metrics'>('landing');
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    total_reports: 0,
    pending_count: 0,
    investigated_count: 0,
    recovered_count: 0,
    recovery_rate_percent: 0,
    total_recovered_value: 0,
    active_stations_count: 0,
    active_patrol_officers: 0,
  });

  // UI interaction state
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [droppedPin, setDroppedPin] = useState<GeoCoordinates | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterOptions, setFilterOptions] = useState<IncidentFilterOptions>({
    status: 'all',
    category: 'all',
    assigned_station_id: 'all',
  });
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [legalModalState, setLegalModalState] = useState<{ isOpen: boolean; tab: LegalTab }>({
    isOpen: false,
    tab: 'disclaimer',
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Load dataset respecting active persona's RLS permissions
  const loadData = useCallback(async () => {
    try {
      const [incidentList, stationList, metricData] = await Promise.all([
        fetchActiveIncidents(filterOptions, currentUser),
        fetchPoliceStations(),
        fetchSystemMetrics(),
      ]);
      setIncidents(incidentList);
      setStations(stationList);
      setMetrics(metricData);
    } catch (err: any) {
      console.error('Failed to load platform data:', err);
      showToast(err.message || 'Error loading incident records', 'error');
    }
  }, [filterOptions, currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to real-time incident broadcasts
  useEffect(() => {
    const unsubscribe = subscribeToIncidents(({ event, incident }) => {
      loadData();
      if (event === 'INSERT') {
        showToast(`🚨 New Incident Reported: ${incident.title.substring(0, 40)}...`, 'info');
      } else if (event === 'UPDATE') {
        showToast(`Status updated for Case ${incident.id.toUpperCase()}: ${incident.status}`, 'success');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Handle tactical map pin dropping
  const handleDropPin = (coords: GeoCoordinates) => {
    setDroppedPin(coords);
    showToast(`Target pin set at ${coords.lat.toFixed(4)}°N, ${Math.abs(coords.lng).toFixed(4)}°W`, 'info');
  };

  // Handle status update (restricted to officer role)
  const handleUpdateStatus = async (
    incidentId: string,
    newStatus: IncidentStatus,
    notes?: string
  ) => {
    try {
      setIsUpdating(true);
      const updated = await updateIncidentStatus(
        { incident_id: incidentId, status: newStatus, officer_notes: notes },
        currentUser
      );
      showToast(`Case ${incidentId.toUpperCase()} status updated to ${newStatus.toUpperCase()}`, 'success');
      await loadData();
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Permission denied or update failed', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const pendingCount = incidents.filter((i) => i.status === IncidentStatus.PENDING).length;

  return (
    <NotificationProvider currentUser={currentUser}>
      <AppShell
        currentRole={currentUser.role}
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSelectUser={(user) => {
          switchPersona(user);
          showToast(`Switched active persona to ${user.full_name} (${user.role.toUpperCase()})`, 'info');
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        unresolvedCount={pendingCount}
        onOpenCaseDossier={(incidentId) => {
          const found = incidents.find((i) => i.id === incidentId);
          if (found) {
            setSelectedIncident(found);
          }
        }}
        onOpenAuthModal={() => openAuthModal('signin')}
        onOpenTechCaseStudy={() => setIsTechModalOpen(true)}
        onOpenLegal={(tab) => setLegalModalState({ isOpen: true, tab })}
        liveTelemetryMetrics={{
          active_stations_count: metrics.active_stations_count,
          pending_count: metrics.pending_count,
          recovery_rate_percent: metrics.recovery_rate_percent,
        }}
        onRefreshData={loadData}
      >
        {/* View Switcher Tabs Content */}
        {activeTab === 'landing' && (
          <LandingPage
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onNavigateTab={setActiveTab}
            onOpenAuthModal={() => openAuthModal('signin')}
            metrics={metrics}
            currentUser={currentUser}
          />
        )}

          {activeTab === 'map' && (
            <div className="space-y-4">
              <LiveMap
                stations={stations}
                incidents={incidents}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
                onDropPin={handleDropPin}
                droppedPin={droppedPin}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                heightClass="h-[740px]"
              />

              {/* Quick Action bar underneath map */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">
                    {droppedPin ? (
                      <span className="text-emerald-400 font-mono">
                        Active Pin Target: {droppedPin.lat.toFixed(5)}° N, {Math.abs(droppedPin.lng).toFixed(5)}° W
                      </span>
                    ) : (
                      <span>Click anywhere on the map or use the control bar to drop coordinates for reporting.</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {droppedPin && (
                    <button
                      type="button"
                      onClick={() => setDroppedPin(null)}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      Clear Pin
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded border border-emerald-500 transition-colors shadow-sm"
                  >
                    File Report at {droppedPin ? 'Selected Pin' : 'Precinct Location'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'my-reports' && (
            <MyReportsList
              incidents={incidents}
              currentUser={currentUser}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onCenterOnMap={(inc) => {
                setSelectedIncident(inc);
                setActiveTab('map');
              }}
              onOpenReportModal={() => setIsReportModalOpen(true)}
            />
          )}

          {activeTab === 'operations' && (
            <RoleGuard allowedRoles={[UserRole.OFFICER, UserRole.ADMIN]}>
              <OfficerDashboard
                incidents={incidents}
                stations={stations}
                metrics={metrics}
                currentUser={currentUser}
                onUpdateStatus={handleUpdateStatus}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                isUpdating={isUpdating}
              />
            </RoleGuard>
          )}

          {activeTab === 'anti-fencing' && <PublicSerialChecker />}

          {activeTab === 'schema' && <SchemaViewer />}

          {activeTab === 'metrics' && (
            <AnalyticsDashboard
              incidents={incidents}
              stations={stations}
              metrics={metrics}
              currentUser={currentUser}
            />
          )}
        </AppShell>

        {/* Citizen Multi-Step Report Modal */}
        <ReportIncidentModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          currentUser={currentUser}
          initialCoords={droppedPin}
          stations={stations}
          onReportCreated={(newIncident) => {
            setSelectedIncident(newIncident);
            setDroppedPin(null);
            loadData();
          }}
        />

        {/* Case Dossier Detail Modal */}
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          currentUser={currentUser}
          onUpdateStatus={handleUpdateStatus}
          isUpdating={isUpdating}
        />

        {/* Identity & Access Management (IAM) Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
          initialMode={authModalMode}
        />

        {/* Technical Architecture & Recruiter Case Study Modal */}
        <TechCaseStudyModal
          isOpen={isTechModalOpen}
          onClose={() => setIsTechModalOpen(false)}
        />

        {/* Legal & Policy Compliance Suite Modal */}
        {legalModalState.isOpen && (
          <LegalPages
            isModal
            initialTab={legalModalState.tab}
            onClose={() => setLegalModalState({ isOpen: false, tab: 'disclaimer' })}
          />
        )}

        {/* Toast Notification */}
        {notification && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded border shadow-xl text-xs font-mono max-w-md flex items-center justify-between gap-3 ${
              notification.type === 'error'
                ? 'bg-rose-950/95 border-rose-700 text-rose-200'
                : notification.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-600 text-emerald-200'
                : 'bg-slate-900/95 border-slate-700 text-slate-200'
            }`}
          >
            <span>{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
      </NotificationProvider>
    );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CivicGuardApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
