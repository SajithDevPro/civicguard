import React, { useState } from 'react';
import {
  Layers,
  Sliders,
  Flame,
  MapPin,
  X,
  ChevronUp,
  ChevronDown,
  Building2,
  Barcode,
  ExternalLink,
  ShieldAlert,
  BarChart3,
  Crosshair,
} from 'lucide-react';
import { GeoCoordinates, IncidentReport, IncidentStatus, PoliceStation } from '../../types';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveMapWrapperProps {
  children: React.ReactNode;
  selectedIncident: IncidentReport | null;
  onClearSelectedIncident: () => void;
  onOpenCaseDossier?: (incident: IncidentReport) => void;
  droppedPin?: GeoCoordinates | null;
  onClearDroppedPin?: () => void;
  onOpenReportModal?: () => void;
  stations?: PoliceStation[];
  isHeatmapActive?: boolean;
  onToggleHeatmap?: () => void;
  isHotspotSidebarOpen?: boolean;
  onToggleHotspotSidebar?: () => void;
}

export const ResponsiveMapWrapper: React.FC<ResponsiveMapWrapperProps> = ({
  children,
  selectedIncident,
  onClearSelectedIncident,
  onOpenCaseDossier,
  droppedPin,
  onClearDroppedPin,
  onOpenReportModal,
  isHeatmapActive = false,
  onToggleHeatmap,
  isHotspotSidebarOpen = false,
  onToggleHotspotSidebar,
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Primary Map Canvas Container */}
      <div className="w-full h-full relative">
        {children}
      </div>

      {/* MOBILE FLOATING ACTION BUTTON (FAB) & EXPANDABLE DOCK (<768px) */}
      <div className="md:hidden absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          className={`min-w-[44px] min-h-[44px] rounded-full p-2.5 flex items-center justify-center shadow-2xl border transition-all cursor-pointer ${
            isFabMenuOpen
              ? 'bg-slate-800 text-white border-slate-600 rotate-90'
              : 'bg-slate-950/95 text-emerald-400 border-slate-700/80 backdrop-blur-md'
          }`}
          title="Toggle Tactical Layer Controls"
          aria-label="Map Controls Menu"
        >
          {isFabMenuOpen ? <X className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
        </button>

        {/* Collapsible Mobile Control Dock */}
        {isFabMenuOpen && (
          <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl p-2 shadow-2xl flex flex-col gap-2 min-w-[180px] animate-fadeIn text-xs font-mono">
            {onToggleHeatmap && (
              <button
                type="button"
                onClick={() => {
                  onToggleHeatmap();
                  setIsFabMenuOpen(false);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isHeatmapActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{isHeatmapActive ? 'Hide Heatmap' : 'Crime Heatmap'}</span>
              </button>
            )}

            {onToggleHotspotSidebar && (
              <button
                type="button"
                onClick={() => {
                  onToggleHotspotSidebar();
                  setIsFabMenuOpen(false);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isHotspotSidebarOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Hotspot Analytics</span>
              </button>
            )}

            {droppedPin && onClearDroppedPin && (
              <button
                type="button"
                onClick={() => {
                  onClearDroppedPin();
                  setIsFabMenuOpen(false);
                }}
                className="min-h-[44px] px-3 py-2 rounded-lg text-left text-rose-300 hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors"
              >
                <X className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Clear Pin</span>
              </button>
            )}

            {onOpenReportModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenReportModal();
                  setIsFabMenuOpen(false);
                }}
                className="min-h-[44px] px-3 py-2 rounded-lg text-left bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2.5 shadow-sm"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>File Report Here</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* MOBILE ADAPTIVE BOTTOM SHEET FOR SELECTED PIN/INCIDENT (<768px) */}
      {selectedIncident && (
        <div className="md:hidden absolute bottom-2 left-2 right-2 z-[1000] animate-slideUp">
          <div className="bg-slate-950/98 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-4 shadow-2xl space-y-3 font-sans">
            {/* Grab Bar & Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-400 uppercase font-semibold">
                  {selectedIncident.id.toUpperCase()}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                    selectedIncident.status === IncidentStatus.PENDING
                      ? 'bg-amber-950/80 border-amber-600/60 text-amber-300'
                      : selectedIncident.status === IncidentStatus.INVESTIGATED
                      ? 'bg-sky-950/80 border-sky-600/60 text-sky-300'
                      : 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                  }`}
                >
                  {selectedIncident.status}
                </span>
              </div>

              <button
                type="button"
                onClick={onClearSelectedIncident}
                className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-white rounded-lg flex items-center justify-center cursor-pointer"
                aria-label="Close Incident Sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title & Location */}
            <div>
              <h4 className="text-sm font-bold text-white line-clamp-1">
                {selectedIncident.title}
              </h4>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{selectedIncident.address_approx || 'Coordinates Logged'}</span>
              </p>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Category</span>
                <span className="text-slate-200 uppercase font-semibold">{selectedIncident.category}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Serial / VIN</span>
                <span className="text-emerald-400 truncate block">
                  {selectedIncident.serial_number || 'N/A'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              {onOpenCaseDossier && (
                <button
                  type="button"
                  onClick={() => onOpenCaseDossier(selectedIncident)}
                  className="flex-1 min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Case Dossier</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClearSelectedIncident}
                className="min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DROPPED PIN NOTIFICATION FOR MOBILE PIN DROPPING */}
      {droppedPin && (
        <div className="md:hidden absolute top-3 left-3 z-[1000] bg-slate-950/90 border border-emerald-500/50 rounded-lg p-2.5 backdrop-blur text-xs font-mono shadow-xl flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-emerald-400 animate-spin" />
          <div className="text-[11px] text-slate-200">
            Target: {droppedPin.lat.toFixed(4)}°N, {Math.abs(droppedPin.lng).toFixed(4)}°W
          </div>
        </div>
      )}
    </div>
  );
};
