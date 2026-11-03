import React from 'react';
import {
  Car,
  Laptop,
  Package,
  Building2,
  Crosshair,
  Flame,
  PlusCircle,
  CheckCircle,
  Clock,
  Layers,
  MapPin,
  BarChart3,
} from 'lucide-react';
import { AssetCategory, IncidentStatus } from '../../types';

export interface MapFilterState {
  category: AssetCategory | 'all';
  status: IncidentStatus | 'all';
  showPoliceStations: boolean;
  heatmapMode: boolean;
  clusterMode: boolean;
  showHotspotSidebar: boolean;
}

interface MapControlsProps {
  filterState: MapFilterState;
  onFilterChange: (newFilters: Partial<MapFilterState>) => void;
  onLocateUser: () => void;
  onReportHere: () => void;
  isLocating?: boolean;
  totalFilteredCount: number;
}

export const MapControls: React.FC<MapControlsProps> = ({
  filterState,
  onFilterChange,
  onLocateUser,
  onReportHere,
  isLocating = false,
  totalFilteredCount,
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-[400] pointer-events-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
      {/* Left Segment: Category & Layer Segmented Control */}
      <div className="pointer-events-auto flex items-center gap-1.5 p-1 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-lg shadow-xl overflow-x-auto max-w-full">
        {/* All Assets */}
        <button
          type="button"
          onClick={() => onFilterChange({ category: 'all' })}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 border ${
            filterState.category === 'all'
              ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
              : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          All Incidents
        </button>

        {/* Vehicles */}
        <button
          type="button"
          onClick={() => onFilterChange({ category: AssetCategory.VEHICLE })}
          className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
            filterState.category === AssetCategory.VEHICLE
              ? 'bg-red-950/80 text-red-200 border-red-700/60 shadow-sm'
              : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Car className="w-3.5 h-3.5 text-red-400" />
          <span>Vehicles</span>
        </button>

        {/* Electronics */}
        <button
          type="button"
          onClick={() => onFilterChange({ category: AssetCategory.ELECTRONICS })}
          className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
            filterState.category === AssetCategory.ELECTRONICS
              ? 'bg-amber-950/80 text-amber-200 border-amber-700/60 shadow-sm'
              : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Laptop className="w-3.5 h-3.5 text-amber-400" />
          <span>Electronics</span>
        </button>

        {/* Property */}
        <button
          type="button"
          onClick={() => onFilterChange({ category: AssetCategory.PROPERTY })}
          className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
            filterState.category === AssetCategory.PROPERTY
              ? 'bg-pink-950/80 text-pink-200 border-pink-700/60 shadow-sm'
              : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5 text-pink-400" />
          <span>Property</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-0.5" />

        {/* Police Station Layer Toggle */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({ showPoliceStations: !filterState.showPoliceStations })
          }
          className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
            filterState.showPoliceStations
              ? 'bg-blue-950/80 text-blue-200 border-blue-600/70 shadow-sm'
              : 'bg-transparent text-slate-500 border-transparent hover:text-slate-400'
          }`}
          title="Toggle Police Station Precinct Markers"
        >
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Precincts</span>
        </button>
      </div>

      {/* Right Segment: Status Filters & Spatial Engine Controls */}
      <div className="pointer-events-auto flex items-center gap-1.5 p-1 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-lg shadow-xl self-end md:self-auto overflow-x-auto max-w-full">
        {/* Status: All vs Pending vs Recovered */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onFilterChange({ status: 'all' })}
            className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              filterState.status === 'all'
                ? 'bg-slate-800 text-slate-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ status: IncidentStatus.PENDING })}
            className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
              filterState.status === IncidentStatus.PENDING
                ? 'bg-amber-950/80 text-amber-300 border border-amber-600/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Pending</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ status: IncidentStatus.RECOVERED })}
            className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
              filterState.status === IncidentStatus.RECOVERED
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>Recovered</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Clustering Mode Toggle */}
        <button
          type="button"
          onClick={() => onFilterChange({ clusterMode: !filterState.clusterMode })}
          className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
            filterState.clusterMode
              ? 'bg-sky-950/90 text-sky-200 border-sky-500 shadow-sm'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          title="Toggle Marker Density Clustering"
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Clusters</span>
        </button>

        {/* Heatmap Mode Toggle */}
        <button
          type="button"
          onClick={() => onFilterChange({ heatmapMode: !filterState.heatmapMode })}
          className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
            filterState.heatmapMode
              ? 'bg-orange-950/90 text-orange-200 border-orange-500 shadow-sm'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          title="Toggle Continuous Heatmap Density Gradient"
        >
          <Flame className={`w-3.5 h-3.5 ${filterState.heatmapMode ? 'text-orange-400 animate-pulse' : 'text-slate-400'}`} />
          <span>Heatmap</span>
        </button>

        {/* Hotspot Analytics Sidebar Toggle */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({ showHotspotSidebar: !filterState.showHotspotSidebar })
          }
          className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
            filterState.showHotspotSidebar
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500 shadow-sm'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          title="Open Hotspot Spatial Intelligence Sidebar"
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Analytics</span>
        </button>

        {/* Locate My Position */}
        <button
          type="button"
          onClick={onLocateUser}
          disabled={isLocating}
          className="p-1.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 transition-colors"
          title="Center on My Device GPS Location"
        >
          <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'text-emerald-400 animate-spin' : 'text-slate-300'}`} />
        </button>

        {/* Report Stolen Item Here */}
        <button
          type="button"
          onClick={onReportHere}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded border border-red-500 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-md shadow-red-950"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Report Here</span>
        </button>
      </div>
    </div>
  );
};
