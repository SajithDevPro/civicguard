/**
 * CivicGuard Law Enforcement Case Detail & Status Manager Modal (CaseDetailModal.tsx)
 * Deep-dive investigative dossier with evidence lightbox, embedded geospatial vector minimap,
 * lifecycle transition controls, and automated serial matcher widget.
 */
import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Send,
  Edit3,
  Maximize2,
  Search,
  ExternalLink,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { IncidentReport, IncidentStatus, PoliceStation, UserProfile, UserRole } from '../../types';
import {
  CARTO_ATTRIBUTION,
  CARTO_DARK_MATTER_URL,
  createIncidentIcon,
  createPoliceStationIcon,
} from '../map/MapConfig';
import { calculateDistanceKm, searchIncidentsBySerialNumber } from '../../services/db';

interface CaseDetailModalProps {
  incident: IncidentReport | null;
  stations: PoliceStation[];
  currentOfficer: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (incidentId: string, status: IncidentStatus, notes?: string) => Promise<void>;
  isUpdating: boolean;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  incident,
  stations,
  currentOfficer,
  isOpen,
  onClose,
  onUpdateStatus,
  isUpdating,
}) => {
  if (!isOpen || !incident) return null;

  const [notesInput, setNotesInput] = useState(incident.officer_notes || '');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(incident.status);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [matchedIncidents, setMatchedIncidents] = useState<IncidentReport[]>([]);
  const [isSearchingSerial, setIsSearchingSerial] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // Sync state on incident prop change
  useEffect(() => {
    setNotesInput(incident.officer_notes || '');
    setSelectedStatus(incident.status);
    setNotesError(null);
  }, [incident]);

  // Find nearest precinct / station for this incident
  const assignedStation =
    stations.find((s) => s.id === incident.assigned_station_id) || stations[0];

  const distanceKm = useMemo(() => {
    if (!assignedStation) return 0;
    return calculateDistanceKm(
      { lat: incident.lat, lng: incident.lng },
      { lat: assignedStation.lat, lng: assignedStation.lng }
    );
  }, [incident, assignedStation]);

  // Background Serial Matcher Query
  useEffect(() => {
    if (!incident.serial_number) {
      setMatchedIncidents([]);
      return;
    }

    let isMounted = true;
    setIsSearchingSerial(true);

    searchIncidentsBySerialNumber(incident.serial_number).then((results) => {
      if (isMounted) {
        // Exclude current incident
        const duplicates = results.filter((r) => r.id !== incident.id);
        setMatchedIncidents(duplicates);
        setIsSearchingSerial(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [incident.id, incident.serial_number]);

  // Handle Lifecycle State Change
  const handleSaveStatusTransition = async () => {
    if (selectedStatus !== incident.status && (!notesInput || notesInput.trim().length < 5)) {
      setNotesError('A formal investigative note (minimum 5 characters) is required when transitioning case status.');
      return;
    }

    setNotesError(null);
    await onUpdateStatus(incident.id, selectedStatus, notesInput.trim());
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return 'Not declared';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl text-slate-100 overflow-hidden my-4 flex flex-col max-h-[90vh]">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold font-mono tracking-tight text-white uppercase">
                  POLICE DOSSIER: {incident.id.toUpperCase()}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                    incident.status === IncidentStatus.PENDING
                      ? 'bg-amber-950/80 border-amber-600/60 text-amber-300'
                      : incident.status === IncidentStatus.INVESTIGATED
                      ? 'bg-sky-950/80 border-sky-600/60 text-sky-300'
                      : 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                  }`}
                >
                  {incident.status}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                  Citizen Identity Verified ✓
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Filed on {formatDate(incident.created_at)} · Assigned to {assignedStation.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Scroll View */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-950 border border-slate-800 rounded-lg">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Asset Title</span>
              <span className="text-xs font-bold text-white mt-0.5 block truncate">{incident.title}</span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Serial / VIN Tag</span>
              <span className="text-xs font-mono font-bold text-sky-300 mt-0.5 block truncate">
                {incident.serial_number || 'None Reported'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Estimated Value</span>
              <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 tabular-nums block">
                {formatCurrency(incident.estimated_value)}
              </span>
            </div>
          </div>

          {/* Serial Matcher Widget (Anti-Fencing Alert Box) */}
          {incident.serial_number && (
            <div
              className={`p-3.5 rounded-lg border text-xs font-mono transition-all ${
                matchedIncidents.length > 0
                  ? 'bg-red-950/40 border-red-700/60 text-red-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Barcode className="w-4 h-4 text-sky-400" />
                  <span>MUNICIPAL ANTI-FENCING SERIAL MATCHER</span>
                </div>
                {isSearchingSerial ? (
                  <span className="text-[10px] text-slate-400 animate-pulse">Scanning pawn records...</span>
                ) : matchedIncidents.length > 0 ? (
                  <span className="px-2 py-0.5 bg-red-900 border border-red-500 rounded text-[10px] font-bold text-red-100 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-300" />
                    {matchedIncidents.length} DUPLICATE MATCH DETECTED
                  </span>
                ) : (
                  <span className="text-emerald-400 text-[10px]">Registry Clear (Unique Hardware Tag)</span>
                )}
              </div>

              {matchedIncidents.length > 0 && (
                <div className="mt-2 space-y-1.5 pt-2 border-t border-red-900/60">
                  <p className="text-[11px] text-red-300 font-sans">
                    Warning: This serial number matches an existing case or impound registry record. Potential secondary fencing attempt.
                  </p>
                  {matchedIncidents.map((m) => (
                    <div key={m.id} className="p-2 bg-red-950/80 rounded border border-red-800 text-[11px] flex items-center justify-between">
                      <span>Case: {m.id.toUpperCase()} ({m.title})</span>
                      <span className="text-red-300 font-bold uppercase">{m.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2-Column Section: Geospatial Mini-Map & Citizen Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Geospatial Mini-Map with Distance Vector */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Geospatial Vector & Station Range
                </span>
                <span className="text-blue-400 font-bold">{distanceKm.toFixed(1)} km vector</span>
              </div>

              {/* Embedded Leaflet Map */}
              <div className="h-44 w-full rounded overflow-hidden border border-slate-800 relative z-0">
                <MapContainer
                  center={[incident.lat, incident.lng]}
                  zoom={13}
                  className="w-full h-full"
                  zoomControl={false}
                >
                  <TileLayer attribution={CARTO_ATTRIBUTION} url={CARTO_DARK_MATTER_URL} maxZoom={19} />
                  {/* Incident Marker */}
                  <Marker position={[incident.lat, incident.lng]} icon={createIncidentIcon(incident)} />
                  {/* Police Station Node */}
                  {assignedStation && (
                    <>
                      <Marker
                        position={[assignedStation.lat, assignedStation.lng]}
                        icon={createPoliceStationIcon(assignedStation)}
                      />
                      {/* Distance Vector Polyline */}
                      <Polyline
                        positions={[
                          [incident.lat, incident.lng],
                          [assignedStation.lat, assignedStation.lng],
                        ]}
                        pathOptions={{ color: '#3B82F6', weight: 2, dashArray: '4, 4' }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>

              <div className="text-[11px] font-mono text-slate-400 truncate">
                Address Landmark: {incident.address_approx || 'GPS coordinates locked'}
              </div>
            </div>

            {/* Citizen Reporter Profile & Contact */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-300 uppercase">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Verified Citizen Reporter Record</span>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-slate-300">
                <div>
                  <span className="text-slate-500">Name:</span> {incident.reporter_name || 'Verified Citizen'}
                </div>
                <div>
                  <span className="text-slate-500">Contact Email:</span>{' '}
                  <span className="text-slate-200">{incident.reporter_email || 'citizen@civicguard.gov'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Phone:</span>{' '}
                  <span className="text-slate-200">{incident.reporter_phone || 'Private'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Incident Category:</span>{' '}
                  <span className="text-sky-300 uppercase">{incident.category}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
                  Citizen Narrative Description
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-2.5 rounded border border-slate-800/60 line-clamp-4">
                  {incident.description}
                </p>
              </div>
            </div>
          </div>

          {/* Citizen Photo Evidence Gallery */}
          {incident.evidence_urls && incident.evidence_urls.length > 0 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-300 font-semibold">
                <span>Citizen Evidence Photo Attachments ({incident.evidence_urls.length})</span>
                <span className="text-[11px] text-slate-500">Click photo to inspect full resolution</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {incident.evidence_urls.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setLightboxImage(url)}
                    className="relative group rounded-lg overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer hover:border-emerald-500 transition-colors"
                  >
                    <img
                      src={url}
                      alt={`Evidence item ${idx + 1}`}
                      className="w-full h-28 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investigation Lifecycle Control Engine */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200 uppercase">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Officer Lifecycle State Management & Operational Log</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Logged By: {currentOfficer.full_name} ({currentOfficer.badge_number || 'OFFICER'})
              </span>
            </div>

            {/* Lifecycle Status Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus(IncidentStatus.PENDING)}
                className={`py-2 px-3 text-xs font-mono rounded-lg border transition-all text-center ${
                  selectedStatus === IncidentStatus.PENDING
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-950/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                1. Pending Review
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(IncidentStatus.INVESTIGATED)}
                className={`py-2 px-3 text-xs font-mono rounded-lg border transition-all text-center ${
                  selectedStatus === IncidentStatus.INVESTIGATED
                    ? 'bg-sky-950/80 border-sky-500 text-sky-300 font-bold shadow-md shadow-sky-950/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                2. Active Investigation
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(IncidentStatus.RECOVERED)}
                className={`py-2 px-3 text-xs font-mono rounded-lg border transition-all text-center ${
                  selectedStatus === IncidentStatus.RECOVERED
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-950/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                3. Asset Recovered & Closed
              </button>
            </div>

            {/* Mandatory Officer Log Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Official Law Enforcement Notes & Action Log *
              </label>
              <textarea
                rows={3}
                placeholder="Record surveillance footage review, suspect descriptions, pawn registry pings, or recovery dispatch actions..."
                value={notesInput}
                onChange={(e) => {
                  setNotesInput(e.target.value);
                  setNotesError(null);
                }}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              {notesError && <p className="text-[11px] text-red-400 font-mono">{notesError}</p>}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-slate-500">
                Audited State Transitions are recorded to PostgreSQL write-ahead logs.
              </span>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleSaveStatusTransition}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg border border-emerald-500 transition-colors flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isUpdating ? 'Recording Update...' : 'Commit Status & Log'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Case Chain-of-Custody: Secure Record</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
          >
            Close Dossier
          </button>
        </div>
      </div>

      {/* Lightbox for Evidence Images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white bg-slate-800 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Evidence full view"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded"
          />
        </div>
      )}
    </div>
  );
};
