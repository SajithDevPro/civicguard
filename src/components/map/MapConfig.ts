/**
 * CivicGuard Geospatial Map Engine - Configuration & Custom Markers
 * Uses Leaflet.js with CartoDB Dark Matter vector tiles and custom SVG DivIcons.
 */
import L from 'leaflet';
import { AssetCategory, IncidentReport, IncidentStatus, PoliceStation } from '../../types';

export const CARTO_DARK_MATTER_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const DEFAULT_MAP_CENTER: [number, number] = [37.7749, -122.4194]; // San Francisco Metro
export const DEFAULT_ZOOM = 13;

/**
 * Custom SVG Marker: Police Command & Precinct Node
 * Blue shield badge with glowing pulse animation.
 */
export function createPoliceStationIcon(station: PoliceStation, isSelected = false): L.DivIcon {
  const size = isSelected ? 44 : 38;
  const pulseClass = 'police-pulse-ring';

  const html = `
    <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
      <!-- Glowing radar pulse wave -->
      <span class="${pulseClass} absolute inset-0 rounded-full bg-blue-500/30 animate-ping pointer-events-none"></span>
      <span class="absolute -inset-1 rounded-full bg-blue-500/20 blur-sm pointer-events-none"></span>

      <!-- Primary Shield Container -->
      <div class="relative z-10 flex flex-col items-center justify-center w-8 h-8 rounded-full bg-slate-950 border-2 border-blue-500 shadow-lg shadow-blue-500/40 text-blue-400 hover:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </div>

      <!-- Precinct Callout Code -->
      <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-1 py-0.2 bg-slate-950/90 border border-blue-500/50 rounded text-[9px] font-mono font-bold text-blue-300 shadow">
        ${station.code}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-police-marker',
    iconSize: [size, size + 16],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

/**
 * Custom SVG Marker: Stolen Asset / Incident Node
 * - Recovered: Green checkmark node with emerald aura (#10B981)
 * - Stolen / Pending / Investigated: Red warning beacon pin (#EF4444) color-accented by category
 */
export function createIncidentIcon(incident: IncidentReport, isSelected = false): L.DivIcon {
  const isRecovered = incident.status === IncidentStatus.RECOVERED;
  const isPending = incident.status === IncidentStatus.PENDING;
  const size = isSelected ? 42 : 34;

  let borderColor = '#EF4444'; // Red for stolen
  let glowColor = 'rgba(239, 68, 68, 0.4)';
  let bgGradient = 'from-red-950 to-slate-950';
  let badgeColor = 'text-red-400';

  if (isRecovered) {
    borderColor = '#10B981'; // Emerald for recovered
    glowColor = 'rgba(16, 185, 129, 0.4)';
    bgGradient = 'from-emerald-950 to-slate-950';
    badgeColor = 'text-emerald-400';
  } else if (incident.category === AssetCategory.VEHICLE) {
    borderColor = '#EF4444'; // Red/Orange
    glowColor = 'rgba(239, 68, 68, 0.45)';
  } else if (incident.category === AssetCategory.ELECTRONICS) {
    borderColor = '#F59E0B'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.4)';
  } else {
    borderColor = '#EC4899'; // Property / High Alert
    glowColor = 'rgba(236, 72, 153, 0.4)';
  }

  // Choose icon SVG path
  let iconSvg = '';
  if (isRecovered) {
    iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    `;
  } else if (incident.category === AssetCategory.VEHICLE) {
    iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
        <circle cx="7" cy="17" r="2"/>
        <path d="M9 17h6"/>
        <circle cx="17" cy="17" r="2"/>
      </svg>
    `;
  } else if (incident.category === AssetCategory.ELECTRONICS) {
    iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="12" x="3" y="4" rx="2"/>
        <line x1="2" x2="22" y1="20" y2="20"/>
      </svg>
    `;
  } else {
    iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    `;
  }

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer ${isSelected ? 'scale-125 z-30' : 'hover:scale-115'} transition-transform" style="width: ${size}px; height: ${size}px;">
      <!-- Active investigation beacon ring for pending cases -->
      ${
        isPending
          ? `<span class="absolute inset-0 rounded-full animate-ping opacity-60 pointer-events-none" style="background-color: ${borderColor};"></span>`
          : ''
      }
      <span class="absolute -inset-1 rounded-full blur-sm pointer-events-none" style="background-color: ${glowColor};"></span>

      <!-- Marker Core Disc -->
      <div class="relative z-10 flex items-center justify-center w-7 h-7 rounded-full bg-slate-950 border-2 shadow-lg" style="border-color: ${borderColor};">
        ${iconSvg}
      </div>

      <!-- Small Category Pip Indicator -->
      <div class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-slate-950" style="background-color: ${borderColor};"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-incident-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

/**
 * Custom SVG Marker: Citizen Location Pin Picker (Draggable & Reticle)
 */
export function createPinPickerIcon(): L.DivIcon {
  const html = `
    <div class="relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform">
      <!-- Target ring -->
      <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-400 shadow-xl shadow-emerald-500/40">
        <div class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
        <div class="absolute w-6 h-0.5 bg-emerald-400/80"></div>
        <div class="absolute h-6 w-0.5 bg-emerald-400/80"></div>
      </div>
      <!-- Pin stem / pointer needle -->
      <div class="w-0.5 h-3 bg-emerald-400"></div>
      <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5 shadow"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-picker-marker',
    iconSize: [40, 52],
    iconAnchor: [20, 52], // Anchored precisely at bottom tip
  });
}
