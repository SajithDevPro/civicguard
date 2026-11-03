/**
 * CivicGuard Citizen Active Reports Tracker (MyReportsList.tsx)
 * Displays all active and historical incidents lodged by the authenticated citizen.
 * Features live status progress indicators, serial number tags, precinct contact info,
 * and quick-center actions onto the geospatial map engine.
 */
import React from 'react';
import {
  FileText,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Barcode,
  DollarSign,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { IncidentReport, IncidentStatus, UserProfile } from '../../types';

interface MyReportsListProps {
  incidents: IncidentReport[];
  currentUser: UserProfile;
  onSelectIncident: (incident: IncidentReport) => void;
  onCenterOnMap: (incident: IncidentReport) => void;
  onOpenReportModal: () => void;
}

export const MyReportsList: React.FC<MyReportsListProps> = ({
  incidents,
  currentUser,
  onSelectIncident,
  onCenterOnMap,
  onOpenReportModal,
}) => {
  // Filter incidents filed by the active citizen user
  const citizenIncidents = incidents.filter(
    (inc) => inc.user_id === currentUser.id || inc.reporter_email === currentUser.email
  );

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.PENDING:
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider bg-amber-950/80 border border-amber-600/60 text-amber-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending Review
          </span>
        );
      case IncidentStatus.INVESTIGATED:
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider bg-sky-950/80 border border-sky-600/60 text-sky-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            Under Investigation
          </span>
        );
      case IncidentStatus.RECOVERED:
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Asset Recovered
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              My Lodged Incident Reports & Asset Recoveries
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Live case tracking · Direct precinct dispatch updates
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenReportModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded border border-emerald-500 transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-950 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>File New Report</span>
        </button>
      </div>

      {/* Incident Cards List */}
      {citizenIncidents.length === 0 ? (
        /* Empty State */
        <div className="border border-slate-800 rounded-lg bg-slate-900/60 p-12 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
            <Shield className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200">
              No Incident Filings on Record
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't submitted any stolen property or public safety filings yet under this profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded border border-emerald-500 transition-colors inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>File Your First Report</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {citizenIncidents.map((incident) => {
            return (
              <div
                key={incident.id}
                className="p-5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-lg shadow transition-all space-y-4"
              >
                {/* Header row: Case ID, Title & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 uppercase">
                        {incident.id.toUpperCase()}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="font-mono text-[11px] text-slate-400 uppercase">
                        {incident.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer" onClick={() => onSelectIncident(incident)}>
                      {incident.title}
                    </h3>
                  </div>

                  <div className="self-start sm:self-auto">
                    {getStatusBadge(incident.status)}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                  {/* Serial Number */}
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block mb-0.5">
                      Serial Number
                    </span>
                    <span className="text-sky-300 font-semibold truncate block">
                      {incident.serial_number || 'None'}
                    </span>
                  </div>

                  {/* Estimated Value */}
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block mb-0.5">
                      Estimated Value
                    </span>
                    <span className="text-emerald-400 font-bold block">
                      {formatCurrency(incident.estimated_value) || 'Not declared'}
                    </span>
                  </div>

                  {/* Assigned Precinct */}
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block mb-0.5">
                      Assigned Precinct
                    </span>
                    <span className="text-slate-200 truncate block">
                      {incident.assigned_station_name || 'Central Command'}
                    </span>
                  </div>

                  {/* Logged Date */}
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block mb-0.5">
                      Lodged On
                    </span>
                    <span className="text-slate-300 block">
                      {formatDate(incident.created_at)}
                    </span>
                  </div>
                </div>

                {/* Description & Detective Notes */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {incident.description}
                </p>

                {incident.officer_notes && (
                  <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded text-xs space-y-1">
                    <div className="font-mono text-[10px] font-bold text-blue-300 uppercase">
                      Official Detective Update:
                    </div>
                    <p className="text-slate-200 font-mono text-[11px]">
                      {incident.officer_notes}
                    </p>
                  </div>
                )}

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{incident.address_approx || 'GPS coordinates locked'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onCenterOnMap(incident)}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 font-mono text-xs"
                    >
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>Locate on Map</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectIncident(incident)}
                      className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors flex items-center gap-1 text-xs"
                    >
                      <span>View Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
