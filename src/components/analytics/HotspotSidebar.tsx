/**
 * CivicGuard Hotspot Analytics & Spatial Intelligence Widget (HotspotSidebar.tsx)
 * Displays spatial intelligence metrics, ranked risk zones, category breakdown progress bars,
 * and one-click GeoJSON / CSV intelligence export for law enforcement briefings.
 */
import React, { useMemo } from 'react';
import {
  Flame,
  ShieldAlert,
  Car,
  Laptop,
  Package,
  Download,
  Crosshair,
  TrendingUp,
  MapPin,
  ChevronRight,
  FileCode,
  FileSpreadsheet,
  X,
  Layers,
} from 'lucide-react';
import { AssetCategory, GeoCoordinates, IncidentReport, PoliceStation } from '../../types';
import {
  computeSpatialClusters,
  exportIncidentsToGeoJSON,
  SpatialCluster,
} from '../../utils/spatial';

interface HotspotSidebarProps {
  incidents: IncidentReport[];
  stations: PoliceStation[];
  isOpen: boolean;
  onClose: () => void;
  onFlyToCoordinates: (coords: GeoCoordinates, zoom?: number) => void;
}

export const HotspotSidebar: React.FC<HotspotSidebarProps> = ({
  incidents,
  stations,
  isOpen,
  onClose,
  onFlyToCoordinates,
}) => {
  // Compute top risk clusters
  const clusters = useMemo(() => {
    return computeSpatialClusters(incidents, 400);
  }, [incidents]);

  // Aggregate category counts across current dataset
  const categoryStats = useMemo(() => {
    const total = incidents.length || 1;
    const vehicles = incidents.filter((i) => i.category === AssetCategory.VEHICLE).length;
    const electronics = incidents.filter((i) => i.category === AssetCategory.ELECTRONICS).length;
    const property = incidents.filter((i) => i.category === AssetCategory.PROPERTY).length;
    const other = incidents.filter((i) => i.category === AssetCategory.OTHER).length;

    return {
      vehicles,
      vehiclesPercent: Math.round((vehicles / total) * 100),
      electronics,
      electronicsPercent: Math.round((electronics / total) * 100),
      property,
      propertyPercent: Math.round((property / total) * 100),
      other,
      otherPercent: Math.round((other / total) * 100),
      total: incidents.length,
    };
  }, [incidents]);

  // Citywide average risk score
  const citywideRiskIndex = useMemo(() => {
    if (clusters.length === 0) return 20;
    const topSum = clusters.slice(0, 5).reduce((sum, c) => sum + c.riskIndex, 0);
    return Math.round(topSum / Math.min(clusters.length, 5));
  }, [clusters]);

  // Export as GeoJSON
  const handleExportGeoJSON = () => {
    const jsonStr = exportIncidentsToGeoJSON(incidents);
    const blob = new Blob([jsonStr], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CivicGuard_Spatial_Intelligence_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export as CSV
  const handleExportCSV = () => {
    const headers = ['Cluster_ID', 'Latitude', 'Longitude', 'Incident_Count', 'Risk_Index', 'Dominant_Category', 'Top_Landmark'];
    const rows = clusters.map((c) => [
      c.id,
      c.centroid.lat,
      c.centroid.lng,
      c.count,
      c.riskIndex,
      c.topCategory,
      `"${c.incidents[0]?.address_approx?.replace(/"/g, '""') || 'Metro Sector'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = `CivicGuard_Clusters_Summary_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 md:w-96 bg-slate-950/95 border-l border-slate-800 shadow-2xl flex flex-col h-full z-20 overflow-hidden font-sans">
      {/* Sidebar Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono tracking-tight text-white uppercase">
              Spatial Hotspot Analytics
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Density Clustering & Intelligence
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-5 text-xs">
        {/* Metropolitan Risk Level Index */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-400 uppercase">Composite Threat Index</span>
            <span
              className={`font-bold ${
                citywideRiskIndex >= 60
                  ? 'text-red-400'
                  : citywideRiskIndex >= 35
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {citywideRiskIndex >= 60 ? 'ELEVATED SECTOR RISK' : 'MODERATE PATROL INDEX'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {citywideRiskIndex}
            </span>
            <span className="text-slate-500 text-[11px] font-mono">/ 100 Risk Score</span>
          </div>

          {/* Meter progress bar */}
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-300 ${
                citywideRiskIndex >= 60
                  ? 'bg-gradient-to-r from-amber-500 to-red-500'
                  : 'bg-gradient-to-r from-emerald-500 to-amber-500'
              }`}
              style={{ width: `${citywideRiskIndex}%` }}
            />
          </div>
        </div>

        {/* Category Breakdown Progress Bars */}
        <div className="space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Theft Category Proportions</span>
            <span>{categoryStats.total} total</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {/* Vehicles */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-red-400" />
                  Vehicles & Transit
                </span>
                <span className="text-red-400 font-bold tabular-nums">
                  {categoryStats.vehicles} ({categoryStats.vehiclesPercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${categoryStats.vehiclesPercent}%` }}
                />
              </div>
            </div>

            {/* Electronics */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-amber-400" />
                  Electronics & Tech
                </span>
                <span className="text-amber-400 font-bold tabular-nums">
                  {categoryStats.electronics} ({categoryStats.electronicsPercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${categoryStats.electronicsPercent}%` }}
                />
              </div>
            </div>

            {/* Property */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-pink-400" />
                  Property & Valuables
                </span>
                <span className="text-pink-400 font-bold tabular-nums">
                  {categoryStats.property} ({categoryStats.propertyPercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500"
                  style={{ width: `${categoryStats.propertyPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Risk Zones Ranked List */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Ranked High-Density Zones</span>
            <span>{clusters.length} Sectors</span>
          </div>

          <div className="space-y-2">
            {clusters.slice(0, 5).map((cluster, idx) => {
              const landmark =
                cluster.incidents[0]?.address_approx?.split(',')[0] || 'Metro Core Sector';

              return (
                <div
                  key={cluster.id}
                  onClick={() => onFlyToCoordinates(cluster.centroid, 16)}
                  className="p-3 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer transition-all hover:bg-slate-800/60 group space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-950 border border-slate-800 flex items-center justify-center font-mono text-[10px] font-bold text-slate-400 group-hover:text-emerald-400">
                        0{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200 group-hover:text-white truncate max-w-[140px]">
                        {landmark}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        cluster.riskIndex >= 60
                          ? 'bg-red-950 text-red-300 border border-red-500/50'
                          : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                      }`}
                    >
                      Risk {cluster.riskIndex}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      {cluster.count} cases ({cluster.topCategory.toUpperCase()} primary)
                    </span>
                    <span className="text-emerald-400 flex items-center gap-0.5 text-[10px] group-hover:translate-x-0.5 transition-transform">
                      Inspect <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Intelligence Briefing Export Actions */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Export Intelligence Dossier
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportGeoJSON}
              className="px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-center gap-1.5 font-mono text-xs"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>GeoJSON</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-center gap-1.5 font-mono text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV Clusters</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
