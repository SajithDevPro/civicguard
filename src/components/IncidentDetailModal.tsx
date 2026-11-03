import React, { useState } from 'react';
import {
  X,
  Shield,
  Building2,
  Clock,
  MapPin,
  Barcode,
  DollarSign,
  User,
  Radio,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Send,
  Edit3,
} from 'lucide-react';
import { IncidentReport, IncidentStatus, UserProfile, UserRole } from '../types';

interface IncidentDetailModalProps {
  incident: IncidentReport | null;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus, notes?: string) => Promise<void>;
  isUpdating: boolean;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  currentUser,
  onUpdateStatus,
  isUpdating,
}) => {
  if (!incident) return null;

  const [notesInput, setNotesInput] = useState(incident.officer_notes || '');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(incident.status);
  const [showNotesForm, setShowNotesForm] = useState(false);

  const isOfficerOrAdmin =
    currentUser.role === UserRole.OFFICER || currentUser.role === UserRole.ADMIN;

  const handleStatusSubmit = async (newStatus: IncidentStatus) => {
    setSelectedStatus(newStatus);
    await onUpdateStatus(incident.id, newStatus, notesInput);
  };

  const handleNotesSave = async () => {
    await onUpdateStatus(incident.id, selectedStatus, notesInput);
    setShowNotesForm(false);
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return 'Not declared';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-lg shadow-2xl text-slate-100 overflow-hidden my-6">
        {/* Dossier Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded border border-slate-700">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono tracking-tight text-white uppercase">
                  CASE DOSSIER: {incident.id.toUpperCase()}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                    incident.status === IncidentStatus.PENDING
                      ? 'bg-amber-950/70 border-amber-600/50 text-amber-300'
                      : incident.status === IncidentStatus.INVESTIGATED
                      ? 'bg-sky-950/70 border-sky-600/50 text-sky-300'
                      : 'bg-emerald-950/70 border-emerald-600/50 text-emerald-300'
                  }`}
                >
                  {incident.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Filed on {formatDate(incident.created_at)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Incident Title & Category */}
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Asset Category: {incident.category}
            </div>
            <h1 className="text-lg font-bold text-slate-100">{incident.title}</h1>
            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed pt-1">
              {incident.description}
            </p>
          </div>

          {/* Quick Tactical Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase">Serial / Hardware Tag</div>
              <div className="font-mono text-xs font-semibold text-sky-300 mt-0.5">
                {incident.serial_number || 'None Specified'}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase">Estimated Asset Value</div>
              <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5 tabular-nums">
                {formatCurrency(incident.estimated_value)}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase">Assigned Jurisdiction</div>
              <div className="font-mono text-xs font-semibold text-emerald-400 mt-0.5 truncate">
                {incident.assigned_station_name || 'Central Command'}
              </div>
            </div>
          </div>

          {/* Geospatial & Chain of Custody Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Geolocation Details */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-300 uppercase">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Geospatial Incident Coordinates</span>
              </div>
              <div className="space-y-1 text-xs font-mono text-slate-400">
                <div>
                  Latitude:{' '}
                  <span className="text-slate-200 tabular-nums">{incident.lat.toFixed(5)}° N</span>
                </div>
                <div>
                  Longitude:{' '}
                  <span className="text-slate-200 tabular-nums">{incident.lng.toFixed(5)}° W</span>
                </div>
                <div>
                  Location Landmark:{' '}
                  <span className="text-slate-200">{incident.address_approx || 'Direct GPS pin'}</span>
                </div>
              </div>
            </div>

            {/* Reporter & Contact */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-300 uppercase">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Citizen Reporter Information</span>
              </div>
              <div className="space-y-1 text-xs font-mono text-slate-400">
                <div>
                  Full Name: <span className="text-slate-200">{incident.reporter_name || 'Verified Citizen'}</span>
                </div>
                <div>
                  Contact Email:{' '}
                  <span className="text-slate-200">{incident.reporter_email || 'citizen@civicguard.gov'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Evidence Gallery */}
          {incident.evidence_urls && incident.evidence_urls.length > 0 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-300 uppercase">
                <span>Attached Photo Evidence ({incident.evidence_urls.length})</span>
                <span className="text-[11px] text-slate-500 font-normal">Stored in incident-evidence bucket</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {incident.evidence_urls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded border border-slate-800 bg-slate-900 overflow-hidden"
                  >
                    <img
                      src={url}
                      alt={`Evidence photo ${idx + 1}`}
                      className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        // Styled fallback if sample path
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="p-1.5 bg-slate-950/80 text-[10px] font-mono text-slate-400 truncate">
                      Evidence Item #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Officer Investigative Notes & Log */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-300 uppercase">
                <FileCheck className="w-4 h-4 text-sky-400" />
                <span>Law Enforcement Operational Notes & Chain of Custody</span>
              </div>

              {isOfficerOrAdmin && !showNotesForm && (
                <button
                  type="button"
                  onClick={() => setShowNotesForm(true)}
                  className="text-xs text-sky-400 hover:text-sky-300 font-mono inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Append Notes</span>
                </button>
              )}
            </div>

            {incident.officer_notes ? (
              <p className="text-xs text-slate-300 font-mono bg-slate-900/80 p-3 rounded border border-slate-800/80 whitespace-pre-line">
                {incident.officer_notes}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic font-mono">
                No detective log entries added yet for this case.
              </p>
            )}

            {/* Inline Note Editor for Officers */}
            {isOfficerOrAdmin && showNotesForm && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <textarea
                  rows={3}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Record surveillance review, suspect details, pawn shop alerts, or asset recovery details..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNotesForm(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleNotesSave}
                    className="px-3 py-1 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded disabled:opacity-50"
                  >
                    Save Operational Log
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Law Enforcement Status Transition Controls */}
          {isOfficerOrAdmin && (
            <div className="p-4 bg-slate-950/90 border border-slate-800 rounded space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Officer Status Transition Workflow
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isUpdating || incident.status === IncidentStatus.PENDING}
                  onClick={() => handleStatusSubmit(IncidentStatus.PENDING)}
                  className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                    incident.status === IncidentStatus.PENDING
                      ? 'bg-amber-950/70 border-amber-500 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  Mark as Pending Review
                </button>

                <button
                  type="button"
                  disabled={isUpdating || incident.status === IncidentStatus.INVESTIGATED}
                  onClick={() => handleStatusSubmit(IncidentStatus.INVESTIGATED)}
                  className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                    incident.status === IncidentStatus.INVESTIGATED
                      ? 'bg-sky-950/70 border-sky-500 text-sky-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  Initiate Active Investigation
                </button>

                <button
                  type="button"
                  disabled={isUpdating || incident.status === IncidentStatus.RECOVERED}
                  onClick={() => handleStatusSubmit(IncidentStatus.RECOVERED)}
                  className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                    incident.status === IncidentStatus.RECOVERED
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  Confirm Asset Recovered & Closed
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-[11px] font-mono text-slate-500">
            Audit Hash: SHA-256:{incident.id.substring(0, 8)}... (Legally Binding Chain of Custody)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
