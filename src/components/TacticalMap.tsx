import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Building2,
  Navigation,
  Compass,
  Crosshair,
  Layers,
  Info,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { AssetCategory, GeoCoordinates, IncidentReport, IncidentStatus, PoliceStation } from '../types';

interface TacticalMapProps {
  stations: PoliceStation[];
  incidents: IncidentReport[];
  selectedIncident: IncidentReport | null;
  onSelectIncident: (incident: IncidentReport) => void;
  onDropPin: (coords: GeoCoordinates) => void;
  droppedPin: GeoCoordinates | null;
  activeFilterCategory?: string;
  activeFilterStatus?: string;
}

// Bounding box for mapping coordinates to SVG canvas
// San Francisco Metro coordinates range
const MAP_BOUNDS = {
  minLat: 37.715,
  maxLat: 37.825,
  minLng: -122.525,
  maxLng: -122.375,
};

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 700;

export const TacticalMap: React.FC<TacticalMapProps> = ({
  stations,
  incidents,
  selectedIncident,
  onSelectIncident,
  onDropPin,
  droppedPin,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showJurisdictions, setShowJurisdictions] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [hoveredStation, setHoveredStation] = useState<PoliceStation | null>(null);

  // Convert lat/lng to SVG pixel coordinates
  const projectCoords = (lat: number, lng: number): { x: number; y: number } => {
    const latSpan = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;
    const lngSpan = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;

    // Invert Y because latitude increases northward while SVG Y increases downward
    const x = ((lng - MAP_BOUNDS.minLng) / lngSpan) * SVG_WIDTH;
    const y = ((MAP_BOUNDS.maxLat - lat) / latSpan) * SVG_HEIGHT;

    return { x, y };
  };

  // Convert SVG pixel back to lat/lng on map click
  const unprojectPixels = (svgX: number, svgY: number): GeoCoordinates => {
    const latSpan = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;
    const lngSpan = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;

    const lng = MAP_BOUNDS.minLng + (svgX / SVG_WIDTH) * lngSpan;
    const lat = MAP_BOUNDS.maxLat - (svgY / SVG_HEIGHT) * latSpan;

    return {
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
    };
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Account for zoom and pan
    const svgX = (clientX / rect.width) * SVG_WIDTH;
    const svgY = (clientY / rect.height) * SVG_HEIGHT;

    const coords = unprojectPixels(svgX, svgY);
    onDropPin(coords);
  };

  const getCategoryColor = (category: AssetCategory) => {
    switch (category) {
      case AssetCategory.VEHICLE:
        return '#f59e0b'; // Amber
      case AssetCategory.ELECTRONICS:
        return '#06b6d4'; // Cyan
      case AssetCategory.PROPERTY:
        return '#10b981'; // Emerald
      default:
        return '#94a3b8'; // Slate
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.PENDING:
        return { label: 'Pending Triage', color: 'text-amber-400' };
      case IncidentStatus.INVESTIGATED:
        return { label: 'Under Investigation', color: 'text-sky-400' };
      case IncidentStatus.RECOVERED:
        return { label: 'Asset Recovered', color: 'text-emerald-400' };
    }
  };

  return (
    <div className="relative w-full rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[740px]">
      {/* Map Control Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 z-10 text-xs">
        <div className="flex items-center gap-4 text-slate-300">
          <div className="flex items-center gap-1.5 font-mono">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">GEO-GRID 37°N / 122°W</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">Tactical GIS Layer</span>
          </div>

          {droppedPin && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded text-emerald-300 font-mono text-[11px]">
              <Crosshair className="w-3 h-3 text-emerald-400 animate-spin" />
              <span>
                Target Pin: {droppedPin.lat.toFixed(4)}°N, {Math.abs(droppedPin.lng).toFixed(4)}°W
              </span>
            </div>
          )}
        </div>

        {/* Layer toggles & Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowJurisdictions(!showJurisdictions)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
              showJurisdictions
                ? 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Jurisdictions
          </button>

          <button
            type="button"
            onClick={() => setShowStations(!showStations)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
              showStations
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Precincts ({stations.length})
          </button>

          <button
            type="button"
            onClick={() => setShowIncidents(!showIncidents)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
              showIncidents
                ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Incidents ({incidents.length})
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setZoomLevel(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Reset Map View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="relative flex-1 cursor-crosshair overflow-hidden bg-[#0a0f1d]">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full select-none"
          onClick={handleSvgClick}
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="tacticalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.75" />
              <circle cx="0" cy="0" r="1" fill="#334155" />
            </pattern>

            {/* Radial glow for selected incident */}
            <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Grid */}
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#0a0f1d" />
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#tacticalGrid)" />

          {/* Shoreline / Metro Reference Outlines (Bay Area geometry approximation) */}
          <g opacity="0.3" stroke="#334155" strokeWidth="1.5" fill="none">
            {/* Coastal & Bay outline */}
            <path
              d="M 50 180 Q 200 120 450 110 T 680 160 Q 820 220 920 380 L 950 680 L 150 680 Q 80 500 50 180 Z"
              fill="#0f172a"
              opacity="0.6"
            />
            {/* Golden Gate / Bay Bridge vector lines */}
            <line x1="380" y1="110" x2="440" y2="30" stroke="#475569" strokeDasharray="3,3" />
            <line x1="780" y1="280" x2="980" y2="240" stroke="#475569" strokeDasharray="4,4" />
          </g>

          {/* Jurisdiction Sector Polygons */}
          {showJurisdictions && (
            <g id="jurisdiction-polygons">
              {stations.map((st) => {
                if (!st.jurisdiction_polygon) return null;
                const points = st.jurisdiction_polygon.coordinates[0]
                  .map(([lng, lat]) => {
                    const pt = projectCoords(lat, lng);
                    return `${pt.x},${pt.y}`;
                  })
                  .join(' ');

                return (
                  <polygon
                    key={`poly-${st.id}`}
                    points={points}
                    fill="#1e3a8a"
                    fillOpacity="0.12"
                    stroke="#3b82f6"
                    strokeWidth="1.2"
                    strokeDasharray="4,4"
                  />
                );
              })}
            </g>
          )}

          {/* Police Station Radar Nodes */}
          {showStations &&
            stations.map((st) => {
              const pt = projectCoords(st.lat, st.lng);
              const isHovered = hoveredStation?.id === st.id;

              return (
                <g
                  key={`station-${st.id}`}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredStation(st)}
                  onMouseLeave={() => setHoveredStation(null)}
                >
                  {/* Outer pulse wave */}
                  <circle r="22" fill="#3b82f6" fillOpacity="0.08" stroke="#3b82f6" strokeWidth="0.8" />
                  <circle r="12" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.5" />

                  {/* Precinct Badge Center */}
                  <rect x="-6" y="-6" width="12" height="12" rx="2" fill="#3b82f6" />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    P
                  </text>

                  {/* Label */}
                  <text
                    x="0"
                    y="24"
                    textAnchor="middle"
                    fill="#93c5fd"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="600"
                    letterSpacing="0.04em"
                  >
                    {st.code}
                  </text>
                </g>
              );
            })}

          {/* Incident Pins */}
          {showIncidents &&
            incidents.map((incident) => {
              const pt = projectCoords(incident.lat, incident.lng);
              const isSelected = selectedIncident?.id === incident.id;
              const catColor = getCategoryColor(incident.category);

              return (
                <g
                  key={`incident-${incident.id}`}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectIncident(incident);
                  }}
                >
                  {/* Selected target ring */}
                  {isSelected && (
                    <>
                      <circle r="24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,3" />
                      <circle r="32" fill="none" stroke="#10b981" strokeWidth="0.75" opacity="0.4" />
                    </>
                  )}

                  {/* Incident marker aura */}
                  <circle
                    r={incident.status === IncidentStatus.PENDING ? 14 : 10}
                    fill={catColor}
                    fillOpacity="0.25"
                    stroke={catColor}
                    strokeWidth="1"
                  />

                  {/* Core icon dot */}
                  <circle r="6" fill={catColor} stroke="#0f172a" strokeWidth="1.5" />

                  {/* Status Indicator Pip */}
                  {incident.status === IncidentStatus.RECOVERED && (
                    <circle cx="5" cy="-5" r="3" fill="#10b981" stroke="#0f172a" strokeWidth="1" />
                  )}

                  {/* Tooltip Label on selection or hover */}
                  {isSelected && (
                    <g transform="translate(0, -22)">
                      <rect
                        x="-60"
                        y="-16"
                        width="120"
                        height="18"
                        rx="3"
                        fill="#0f172a"
                        stroke="#334155"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="-4"
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="9"
                        fontWeight="600"
                        fontFamily="monospace"
                      >
                        {incident.id.toUpperCase()}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

          {/* User Dropped Pin (New Report Drafting Reticle) */}
          {droppedPin && (
            <g transform={`translate(${projectCoords(droppedPin.lat, droppedPin.lng).x}, ${projectCoords(droppedPin.lat, droppedPin.lng).y})`}>
              <circle r="18" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,2" />
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#10b981" strokeWidth="1.5" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#10b981" strokeWidth="1.5" />
              <circle r="4" fill="#10b981" />
              <rect x="-45" y="-30" width="90" height="18" rx="2" fill="#064e3b" stroke="#10b981" strokeWidth="0.8" />
              <text x="0" y="-18" textAnchor="middle" fill="#a7f3d0" fontSize="8" fontFamily="monospace" fontWeight="bold">
                INCIDENT PIN
              </text>
            </g>
          )}
        </svg>

        {/* Hovered Precinct Info Overlay Card */}
        {hoveredStation && (
          <div className="absolute bottom-4 left-4 p-3 bg-slate-900/95 border border-slate-700 rounded shadow-xl text-xs max-w-sm pointer-events-none">
            <div className="flex items-center gap-2 mb-1.5">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-slate-100">{hoveredStation.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 font-mono">
              <div>Address: {hoveredStation.address}</div>
              <div>Dispatch: {hoveredStation.dispatch_frequency}</div>
              <div>Contact: {hoveredStation.contact_phone}</div>
              <div>Active Tactical Units: {hoveredStation.active_officers_count || 12} deployed</div>
            </div>
          </div>
        )}

        {/* Map Legend & Click Instruction Box */}
        <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-800 rounded p-3 text-xs backdrop-blur max-w-xs pointer-events-auto">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">
            Map Legend & Actions
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-slate-300">Vehicle Thefts & Recovery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0" />
              <span className="text-slate-300">Electronics & High-Tech</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-300">Commercial & Personal Property</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <span className="text-slate-300">Police Precinct Command</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
            <p className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Crosshair className="w-3.5 h-3.5" />
              <span>Click anywhere on map to drop incident coordinates pin.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
