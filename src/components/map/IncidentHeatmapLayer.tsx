/**
 * CivicGuard Incident Heatmap & Marker Cluster Layer (IncidentHeatmapLayer.tsx)
 * High-performance Leaflet canvas heatmap and sector cluster overlay.
 * Uses leaflet.heat for continuous density gradients (Green -> Yellow -> Orange -> Red)
 * and spatial clustering with memory-leak free lifecycle cleanup.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { IncidentReport, AssetCategory, IncidentStatus } from '../../types';
import {
  computeSpatialClusters,
  formatHeatmapPoints,
  SpatialCluster,
} from '../../utils/spatial';
import { Flame, ShieldAlert, Car, Laptop, Package, ZoomIn } from 'lucide-react';

interface IncidentHeatmapLayerProps {
  incidents: IncidentReport[];
  showHeatmap: boolean;
  showClusters: boolean;
  heatmapRadius?: number;
  heatmapBlur?: number;
  onSelectCluster?: (cluster: SpatialCluster) => void;
  onSelectIncident?: (incident: IncidentReport) => void;
}

/**
 * Creates custom circular badge DivIcon for sector clusters
 * Color-coded by cluster risk score
 */
function createClusterIcon(cluster: SpatialCluster, zoom: number): L.DivIcon {
  const count = cluster.count;
  const isHighRisk = cluster.riskIndex >= 60;
  const isMediumRisk = cluster.riskIndex >= 35;

  let borderColor = '#10B981'; // Green (Low)
  let badgeBg = 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60';
  let pulseColor = 'bg-emerald-500/30';

  if (isHighRisk) {
    borderColor = '#EF4444'; // Red (High)
    badgeBg = 'bg-red-950/90 text-red-200 border-red-500/70';
    pulseColor = 'bg-red-500/40';
  } else if (isMediumRisk) {
    borderColor = '#F59E0B'; // Amber (Medium)
    badgeBg = 'bg-amber-950/90 text-amber-200 border-amber-500/70';
    pulseColor = 'bg-amber-500/30';
  }

  const size = Math.min(Math.max(36 + count * 2, 42), 64);

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group hover:scale-110 transition-transform select-none" style="width: ${size}px; height: ${size}px;">
      <!-- Glowing radar pulse aura -->
      <span class="absolute inset-0 rounded-full ${pulseColor} animate-ping pointer-events-none opacity-40"></span>
      <span class="absolute -inset-1 rounded-full blur-sm pointer-events-none" style="background-color: ${borderColor}33;"></span>

      <!-- Primary Cluster Node -->
      <div class="relative z-10 flex flex-col items-center justify-center w-full h-full rounded-full border-2 shadow-2xl ${badgeBg}">
        <span class="font-mono font-extrabold text-xs tracking-tight tabular-nums">${count}</span>
        <span class="text-[8px] font-mono uppercase tracking-widest -mt-0.5 opacity-80">SECTOR</span>
      </div>

      <!-- Risk Score Indicator Pip -->
      <div class="absolute -top-1 -right-1 px-1 py-0.2 bg-slate-950 border border-slate-700 rounded text-[8px] font-mono font-bold text-slate-200 shadow">
        R:${cluster.riskIndex}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-cluster-node',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

export const IncidentHeatmapLayer: React.FC<IncidentHeatmapLayerProps> = ({
  incidents,
  showHeatmap,
  showClusters,
  heatmapRadius = 28,
  heatmapBlur = 18,
  onSelectCluster,
  onSelectIncident,
}) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  // 1. Heatmap Layer Management (leaflet.heat)
  useEffect(() => {
    if (!showHeatmap || incidents.length === 0) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    const points = formatHeatmapPoints(incidents);

    // Color gradient: Green -> Yellow -> Orange -> Red
    const gradientStops = {
      0.15: '#10B981', // Emerald / Low
      0.40: '#EAB308', // Yellow
      0.65: '#F97316', // Orange
      0.90: '#EF4444', // Red / Extreme
    };

    if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(points);
      heatLayerRef.current.setOptions({
        radius: heatmapRadius,
        blur: heatmapBlur,
        gradient: gradientStops,
      });
    } else {
      const heat = (L as any).heatLayer(points, {
        radius: heatmapRadius,
        blur: heatmapBlur,
        maxZoom: 18,
        max: 1.0,
        gradient: gradientStops,
      });
      heat.addTo(map);
      heatLayerRef.current = heat;
    }

    // Proper cleanup to prevent memory leaks on unmount or re-render
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, showHeatmap, incidents, heatmapRadius, heatmapBlur]);

  // 2. Spatial Clusters Computation
  const clusters = useMemo(() => {
    if (!showClusters) return [];
    return computeSpatialClusters(incidents, 350);
  }, [incidents, showClusters]);

  // Handle clicking cluster to zoom in smoothly
  const handleClusterClick = (cluster: SpatialCluster) => {
    if (onSelectCluster) {
      onSelectCluster(cluster);
    }
    const currentZoom = map.getZoom();
    map.flyTo([cluster.centroid.lat, cluster.centroid.lng], Math.min(currentZoom + 2, 17), {
      animate: true,
      duration: 0.8,
    });
  };

  if (!showClusters) return null;

  return (
    <>
      {clusters.map((cluster) => {
        const clusterIcon = createClusterIcon(cluster, map.getZoom());

        return (
          <Marker
            key={cluster.id}
            position={[cluster.centroid.lat, cluster.centroid.lng]}
            icon={clusterIcon}
            eventHandlers={{
              click: () => handleClusterClick(cluster),
            }}
          >
            {/* Dark Mode Cluster Dossier Popup */}
            <Popup className="dark-leaflet-popup" minWidth={260}>
              <div className="p-3 bg-slate-950 text-slate-100 rounded space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white">
                    <ShieldAlert className="w-4 h-4 text-orange-400" />
                    <span>Sector Cluster Intake</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      cluster.riskIndex >= 60
                        ? 'bg-red-950 border border-red-500/60 text-red-200'
                        : 'bg-amber-950 border border-amber-500/60 text-amber-200'
                    }`}
                  >
                    Risk Score: {cluster.riskIndex}/100
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  <strong className="text-white">{cluster.count} incident reports</strong> grouped in this ~{cluster.radiusMeters}m sector.
                </div>

                {/* Category breakdown count */}
                <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono">
                  <div className="text-center">
                    <span className="text-red-400 block font-bold">{cluster.categoryCounts.vehicle || 0}</span>
                    <span className="text-slate-500 uppercase">Vehicles</span>
                  </div>
                  <div className="text-center">
                    <span className="text-amber-400 block font-bold">{cluster.categoryCounts.electronics || 0}</span>
                    <span className="text-slate-500 uppercase">Tech</span>
                  </div>
                  <div className="text-center">
                    <span className="text-pink-400 block font-bold">{cluster.categoryCounts.property || 0}</span>
                    <span className="text-slate-500 uppercase">Property</span>
                  </div>
                </div>

                {/* Inspect Cluster CTA */}
                <button
                  type="button"
                  onClick={() => handleClusterClick(cluster)}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zoom In & Inspect Sector</span>
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
