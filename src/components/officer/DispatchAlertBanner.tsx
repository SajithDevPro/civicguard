/**
 * CivicGuard High-Priority Dispatch Alert Banner (DispatchAlertBanner.tsx)
 * Renders an urgent, command-center broadcast banner for high-severity incidents
 * (e.g., active vehicle thefts, high-value electronics) within the officer's precinct jurisdiction.
 * Provides immediate telemetry (distance, address, elapsed time) and 1-click "Acknowledge & Dispatch".
 */
import React, { useState } from 'react';
import {
  Radio,
  Car,
  Laptop,
  Box,
  MapPin,
  Clock,
  ShieldCheck,
  ExternalLink,
  X,
  AlertTriangle,
  Send,
  Navigation,
} from 'lucide-react';
import { AssetCategory, IncidentReport, PoliceStation, UserProfile } from '../../types';
import { calculateDistanceKm } from '../../utils/spatial';

interface DispatchAlertBannerProps {
  incident: IncidentReport | null;
  station: PoliceStation | null;
  currentOfficer: UserProfile;
  onAcknowledgeAndDispatch: (incidentId: string) => Promise<void> | void;
  onOpenDossier: (incident: IncidentReport) => void;
  onDismiss: () => void;
}

export const DispatchAlertBanner: React.FC<DispatchAlertBannerProps> = ({
  incident,
  station,
  currentOfficer,
  onAcknowledgeAndDispatch,
  onOpenDossier,
  onDismiss,
}) => {
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  if (!incident) return null;

  // Calculate distance from officer's assigned station if coordinates available
  const distanceKm = station
    ? calculateDistanceKm(
        { lat: incident.lat, lng: incident.lng },
        { lat: station.lat, lng: station.lng }
      )
    : null;

  // Category Icon Resolver
  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
      case AssetCategory.VEHICLE:
        return <Car className="w-4 h-4 text-red-400" />;
      case AssetCategory.ELECTRONICS:
        return <Laptop className="w-4 h-4 text-amber-400" />;
      default:
        return <Box className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleDispatch = async () => {
    try {
      setIsDispatching(true);
      await onAcknowledgeAndDispatch(incident.id);
      setDispatched(true);
      setTimeout(() => {
        onDismiss();
      }, 2500);
    } catch (err) {
      console.error('Failed to dispatch unit:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-red-500/80 bg-gradient-to-r from-red-950/90 via-slate-900/95 to-slate-950 p-4 sm:p-5 shadow-2xl shadow-red-950/60 font-sans text-slate-100">
      {/* Background radar sweep glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Priority Dispatch Header & Telemetry */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/30 border border-red-500 text-red-300 font-mono text-[10px] font-bold uppercase tracking-wider animate-pulse">
              <Radio className="w-3.5 h-3.5 text-red-400" />
              <span>Priority Tactical Dispatch</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px] uppercase">
              {getCategoryIcon(incident.category)}
              <span>{incident.category}</span>
            </span>

            <span className="font-mono text-[11px] text-slate-400">
              Ref: <strong className="text-white">#{incident.id.substring(0, 8).toUpperCase()}</strong>
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white tracking-tight truncate">
              {incident.title}
            </h3>
            <p className="text-xs text-slate-300 line-clamp-1">
              {incident.description}
            </p>
          </div>

          {/* Telemetry Strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-slate-200">
                {incident.address_approx || `${incident.lat.toFixed(4)}°N, ${Math.abs(incident.lng).toFixed(4)}°W`}
              </span>
            </div>

            {distanceKm !== null && (
              <div className="flex items-center gap-1.5 text-amber-300">
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span className="tabular-nums font-bold">
                  {distanceKm < 1
                    ? `${Math.round(distanceKm * 1000)} m`
                    : `${distanceKm.toFixed(2)} km`}{' '}
                  from {station?.name.replace('Police Station', 'Precinct') || 'Station'}
                </span>
              </div>
            )}

            {incident.serial_number && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">S/N:</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-1 rounded">
                  {incident.serial_number}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
          <button
            type="button"
            onClick={() => onOpenDossier(incident)}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Inspect Dossier</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            type="button"
            disabled={isDispatching || dispatched}
            onClick={handleDispatch}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg ${
              dispatched
                ? 'bg-emerald-600 border border-emerald-500 text-white'
                : 'bg-red-600 hover:bg-red-500 border border-red-500 text-white shadow-red-950'
            }`}
          >
            {dispatched ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>Unit Dispatched (#{currentOfficer.badge_number || '4081'})</span>
              </>
            ) : isDispatching ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Dispatching Unit...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Acknowledge & Dispatch</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-lg transition-colors"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
