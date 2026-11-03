/**
 * CivicGuard Primary Geospatial Map Component (LiveMap.tsx)
 * High-performance, full-screen responsive dark-mode vector map using Leaflet and React-Leaflet.
 * Features CartoDB Dark Matter tiles, custom SVG markers, interactive dark popups,
 * smooth auto-centering controller, incident density heatmap overlay, spatial clustering,
 * temporal timeline slider, and hotspot intelligence sidebar.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Shield,
  Building2,
  FileText,
  Flame,
  Layers,
  BarChart3,
} from 'lucide-react';
import {
  AssetCategory,
  GeoCoordinates,
  IncidentReport,
  IncidentStatus,
  PoliceStation,
} from '../../types';
import {
  CARTO_ATTRIBUTION,
  CARTO_DARK_MATTER_URL,
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  createIncidentIcon,
  createPinPickerIcon,
  createPoliceStationIcon,
} from './MapConfig';
import { MapControls, MapFilterState } from './MapControls';
import { IncidentHeatmapLayer } from './IncidentHeatmapLayer';
import { HeatmapTimeSlider, TimeWindowOption } from './HeatmapTimeSlider';
import { HotspotSidebar } from '../analytics/HotspotSidebar';
import { filterIncidentsByTimeWindow } from '../../utils/spatial';
import { ResponsiveMapWrapper } from './ResponsiveMapWrapper';

interface LiveMapProps {
  incidents: IncidentReport[];
  stations: PoliceStation[];
  selectedIncident: IncidentReport | null;
  onSelectIncident: (incident: IncidentReport) => void;
  onDropPin?: (coords: GeoCoordinates) => void;
  droppedPin?: GeoCoordinates | null;
  onOpenReportModal?: () => void;
  heightClass?: string;
}

/**
 * Sub-component to smoothly animate map viewport on selection or locate events
 */
function MapViewController({
  targetCoords,
  zoom,
}: {
  targetCoords: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, zoom || 15, {
        animate: true,
        duration: 0.9,
      });
    }
  }, [targetCoords, zoom, map]);

  return null;
}

/**
 * Click handler to drop new incident pins directly on the live map
 */
function MapInteractionHandler({
  onMapClick,
}: {
  onMapClick: (coords: GeoCoordinates) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });
    },
  });
  return null;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  incidents,
  stations,
  selectedIncident,
  onSelectIncident,
  onDropPin,
  droppedPin,
  onOpenReportModal,
  heightClass = 'h-[740px]',
}) => {
  const [filterState, setFilterState] = useState<MapFilterState>({
    category: 'all',
    status: 'all',
    showPoliceStations: true,
    heatmapMode: false,
    clusterMode: false,
    showHotspotSidebar: false,
  });

  const [timeWindow, setTimeWindow] = useState<TimeWindowOption>('all');
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null);
  const [flyZoom, setFlyZoom] = useState<number>(15);
  const [isLocating, setIsLocating] = useState(false);

  // Sync flyTo when an incident is selected externally (e.g. from table or sidebar)
  useEffect(() => {
    if (selectedIncident) {
      setFlyToTarget([selectedIncident.lat, selectedIncident.lng]);
      setFlyZoom(16);
    }
  }, [selectedIncident]);

  // 1. Filter incidents by temporal window first
  const temporallyFiltered = useMemo(() => {
    return filterIncidentsByTimeWindow(incidents, timeWindow);
  }, [incidents, timeWindow]);

  // 2. Filter incidents by active category & status
  const filteredIncidents = useMemo(() => {
    return temporallyFiltered.filter((inc) => {
      if (filterState.category !== 'all' && inc.category !== filterState.category) {
        return false;
      }
      if (filterState.status !== 'all' && inc.status !== filterState.status) {
        return false;
      }
      return true;
    });
  }, [temporallyFiltered, filterState.category, filterState.status]);

  // Handle locate my device GPS
  const handleLocateUser = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const target: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setFlyToTarget(target);
        setFlyZoom(15);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation failed, defaulting to Metro Central:', err);
        setFlyToTarget(DEFAULT_MAP_CENTER);
        setIsLocating(false);
      },
      { timeout: 7000 }
    );
  };

  const handleMapClick = (coords: GeoCoordinates) => {
    if (onDropPin) {
      onDropPin(coords);
    }
  };

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ResponsiveMapWrapper
      selectedIncident={selectedIncident}
      onClearSelectedIncident={() => onSelectIncident(null as any)}
      onOpenCaseDossier={onSelectIncident}
      droppedPin={droppedPin}
      onClearDroppedPin={() => {}}
      onOpenReportModal={onOpenReportModal}
      stations={stations}
      isHeatmapActive={filterState.heatmapMode}
      onToggleHeatmap={() => setFilterState((prev) => ({ ...prev, heatmapMode: !prev.heatmapMode }))}
      isHotspotSidebarOpen={filterState.showHotspotSidebar}
      onToggleHotspotSidebar={() => setFilterState((prev) => ({ ...prev, showHotspotSidebar: !prev.showHotspotSidebar }))}
    >
      <div className={`relative w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex ${heightClass || 'h-[60vh] sm:h-[70vh] lg:h-[740px] min-h-[420px]'}`}>
        {/* Primary Map Frame */}
        <div className="relative flex-1 h-full flex flex-col overflow-hidden">
          {/* Floating Interactive Map Control Bar */}
          <MapControls
          filterState={filterState}
          onFilterChange={(newFilters) =>
            setFilterState((prev) => ({ ...prev, ...newFilters }))
          }
          onLocateUser={handleLocateUser}
          onReportHere={() => {
            if (onOpenReportModal) onOpenReportModal();
          }}
          isLocating={isLocating}
          totalFilteredCount={filteredIncidents.length}
        />

        {/* Primary Leaflet Map Container */}
        <MapContainer
          center={DEFAULT_MAP_CENTER}
          zoom={DEFAULT_ZOOM}
          className="w-full h-full z-0"
          zoomControl={false}
        >
          {/* Custom Zoom Control Placed on Bottom-Left */}
          <ZoomControl position="bottomleft" />

          {/* CartoDB Dark Matter High-Contrast Vector Tiles */}
          <TileLayer
            attribution={CARTO_ATTRIBUTION}
            url={CARTO_DARK_MATTER_URL}
            maxZoom={19}
          />

          {/* Smooth Auto-centering View Controller */}
          <MapViewController targetCoords={flyToTarget} zoom={flyZoom} />

          {/* Click-to-Pin Canvas Interaction */}
          <MapInteractionHandler onMapClick={handleMapClick} />

          {/* Continuous Canvas Heatmap & Spatial Clustering Layer */}
          <IncidentHeatmapLayer
            incidents={filteredIncidents}
            showHeatmap={filterState.heatmapMode}
            showClusters={filterState.clusterMode}
            heatmapRadius={30}
            heatmapBlur={20}
            onSelectIncident={onSelectIncident}
          />

          {/* Jurisdiction Sector Polygons */}
          {stations.map((st) => {
            if (!st.jurisdiction_polygon) return null;
            const latLngs = st.jurisdiction_polygon.coordinates[0].map(([lng, lat]) => [
              lat,
              lng,
            ]) as [number, number][];

            return (
              <Polygon
                key={`poly-${st.id}`}
                positions={latLngs}
                pathOptions={{
                  color: '#3B82F6',
                  weight: 1.5,
                  fillColor: '#1E3A8A',
                  fillOpacity: 0.1,
                  dashArray: '4, 4',
                }}
              />
            );
          })}

          {/* Police Station Precinct Markers */}
          {filterState.showPoliceStations &&
            stations.map((station) => {
              const isSelected = selectedIncident?.assigned_station_id === station.id;
              const stationIcon = createPoliceStationIcon(station, isSelected);

              return (
                <Marker
                  key={`station-${station.id}`}
                  position={[station.lat, station.lng]}
                  icon={stationIcon}
                >
                  <Popup className="dark-leaflet-popup">
                    <div className="p-3 bg-slate-950 text-slate-100 rounded-md space-y-2 min-w-[220px]">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <div className="p-1 rounded bg-blue-500/20 text-blue-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold font-mono text-blue-300">
                            {station.code}
                          </div>
                          <div className="text-xs font-semibold text-white">
                            {station.name}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] font-mono text-slate-400">
                        <div>Address: <span className="text-slate-200">{station.address}</span></div>
                        <div>Dispatch Radio: <span className="text-slate-200">{station.dispatch_frequency}</span></div>
                        <div>Direct Phone: <span className="text-slate-200">{station.contact_phone}</span></div>
                        <div>Active Patrols: <span className="text-emerald-400 font-bold">{station.active_officers_count || 12} units</span></div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Individual Stolen Asset & Incident Markers (Rendered when cluster mode is OFF) */}
          {!filterState.clusterMode &&
            filteredIncidents.map((incident) => {
              const isSelected = selectedIncident?.id === incident.id;
              const incidentIcon = createIncidentIcon(incident, isSelected);

              return (
                <Marker
                  key={`inc-${incident.id}`}
                  position={[incident.lat, incident.lng]}
                  icon={incidentIcon}
                  eventHandlers={{
                    click: () => onSelectIncident(incident),
                  }}
                >
                  {/* Sleek GovTech Dark-Mode Popup Card */}
                  <Popup className="dark-leaflet-popup" minWidth={280}>
                    <div className="p-4 bg-slate-950 text-slate-100 rounded-lg space-y-3 font-sans">
                      {/* Header: Status badge & Case ID */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          {incident.id.toUpperCase()}
                        </span>

                        {/* Case Status Pill */}
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
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white leading-snug">
                          {incident.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {incident.address_approx || 'GPS coordinates logged'}
                        </p>
                      </div>

                      {/* Metadata Specs Grid */}
                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono">
                        <div>
                          <span className="text-slate-500 uppercase block">Category</span>
                          <span className="text-slate-200 capitalize font-medium">
                            {incident.category}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 uppercase block">Serial / Tag</span>
                          <span className="text-sky-300 font-semibold truncate block">
                            {incident.serial_number || 'N/A'}
                          </span>
                        </div>

                        {incident.estimated_value && (
                          <div>
                            <span className="text-slate-500 uppercase block">Est. Value</span>
                            <span className="text-emerald-400 font-bold">
                              {formatCurrency(incident.estimated_value)}
                            </span>
                          </div>
                        )}

                        <div>
                          <span className="text-slate-500 uppercase block">Logged Date</span>
                          <span className="text-slate-300">
                            {formatDate(incident.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Action CTA Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIncident(incident);
                        }}
                        className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded border border-emerald-500 transition-colors flex items-center justify-center gap-1.5 shadow"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Full Case Details</span>
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* User Dropped Pin Marker */}
          {droppedPin && (
            <Marker
              position={[droppedPin.lat, droppedPin.lng]}
              icon={createPinPickerIcon()}
            >
              <Popup className="dark-leaflet-popup">
                <div className="p-3 bg-slate-950 text-slate-100 rounded space-y-2">
                  <div className="font-mono text-xs font-bold text-emerald-400">
                    COORDINATE TARGET PIN
                  </div>
                  <div className="text-[11px] font-mono text-slate-300">
                    {droppedPin.lat.toFixed(5)}° N, {Math.abs(droppedPin.lng).toFixed(5)}° W
                  </div>
                  {onOpenReportModal && (
                    <button
                      type="button"
                      onClick={onOpenReportModal}
                      className="w-full py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded"
                    >
                      File Incident Here
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Bottom Temporal Density Timeline Slider */}
        <HeatmapTimeSlider
          selectedWindow={timeWindow}
          onChangeWindow={setTimeWindow}
          filteredCount={filteredIncidents.length}
          totalCount={incidents.length}
        />

        {/* Bottom Bar Telemetry Readout */}
        <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 z-10 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-semibold">CARTO DARK MATTER VECTOR ENGINE</span>
            </div>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="hidden sm:inline">
              Active Layer: {filteredIncidents.length} Incidents Displayed
            </span>
            {filterState.heatmapMode && (
              <span className="text-orange-400 font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> Continuous Canvas Heatmap
              </span>
            )}
            {filterState.clusterMode && (
              <span className="text-sky-400 font-bold flex items-center gap-1">
                <Layers className="w-3 h-3" /> Sector Clusters
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">Projection: EPSG:3857 (WGS 84 / Pseudo-Mercator)</span>
          </div>
        </div>
      </div>

      {/* Dockable Hotspot Analytics Sidebar */}
      <HotspotSidebar
        incidents={filteredIncidents}
        stations={stations}
        isOpen={filterState.showHotspotSidebar}
        onClose={() => setFilterState((prev) => ({ ...prev, showHotspotSidebar: false }))}
        onFlyToCoordinates={(coords, zoom) => {
          setFlyToTarget([coords.lat, coords.lng]);
          setFlyZoom(zoom || 16);
        }}
      />
    </div>
  </ResponsiveMapWrapper>
);
};
