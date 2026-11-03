import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Shield,
  AlertCircle,
  FileText,
  MapPin,
  Barcode,
  Building2,
  Download,
  Users,
  CheckSquare,
  Square,
  Car,
  Laptop,
  Package,
  Phone,
  Mail,
  ExternalLink,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AssetCategory,
  IncidentReport,
  IncidentStatus,
  PoliceStation,
  UserProfile,
} from '../../types';
import { calculateDistanceKm } from '../../services/db';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveTriageTableProps {
  incidents: IncidentReport[];
  stations: PoliceStation[];
  currentOfficer: UserProfile;
  onSelectIncident: (incident: IncidentReport) => void;
  onUpdateStatus: (incidentId: string, status: IncidentStatus) => Promise<void>;
  onBatchUpdateStatus?: (incidentIds: string[], status: IncidentStatus) => Promise<void>;
  isUpdating: boolean;
}

export const ResponsiveTriageTable: React.FC<ResponsiveTriageTableProps> = ({
  incidents,
  stations,
  currentOfficer,
  onSelectIncident,
  onUpdateStatus,
  onBatchUpdateStatus,
  isUpdating,
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'all'>('all');
  const [stationFilter, setStationFilter] = useState<string | 'all'>('all');
  const [onlyMyJurisdiction, setOnlyMyJurisdiction] = useState(false);

  // View Mode: defaults to cards on mobile/tablet, table on desktop
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(isDesktop ? 'table' : 'cards');

  // Multi-select Batch Operations
  const [selectedIncidentIds, setSelectedIncidentIds] = useState<Set<string>>(new Set());

  // Expandable card state for mobile/tablet card view
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  const officerStation = useMemo(() => {
    return stations.find((s) => s.id === currentOfficer.station_id) || stations[0] || null;
  }, [stations, currentOfficer.station_id]);

  // Filtering Logic
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = incident.title.toLowerCase().includes(query);
        const matchesId = incident.id.toLowerCase().includes(query);
        const matchesSerial = incident.serial_number?.toLowerCase().includes(query);
        const matchesAddress = incident.address_approx?.toLowerCase().includes(query);
        const matchesReporter = incident.reporter_name?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesId && !matchesSerial && !matchesAddress && !matchesReporter) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'all' && incident.status !== statusFilter) {
        return false;
      }

      // 3. Category filter
      if (categoryFilter !== 'all' && incident.category !== categoryFilter) {
        return false;
      }

      // 4. Specific Station filter
      if (stationFilter !== 'all' && incident.assigned_station_id !== stationFilter) {
        return false;
      }

      // 5. My Jurisdiction toggle
      if (onlyMyJurisdiction && officerStation) {
        if (incident.assigned_station_id !== officerStation.id) {
          return false;
        }
      }

      return true;
    });
  }, [
    incidents,
    searchQuery,
    statusFilter,
    categoryFilter,
    stationFilter,
    onlyMyJurisdiction,
    officerStation,
  ]);

  // Batch toggle
  const toggleSelectAll = () => {
    if (selectedIncidentIds.size === filteredIncidents.length) {
      setSelectedIncidentIds(new Set());
    } else {
      setSelectedIncidentIds(new Set(filteredIncidents.map((i) => i.id)));
    }
  };

  const toggleSelectIncident = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIncidentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIncidentIds(next);
  };

  const toggleCardExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedCardIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCardIds(next);
  };

  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
      case AssetCategory.VEHICLE:
        return <Car className="w-3.5 h-3.5 text-blue-400" />;
      case AssetCategory.ELECTRONICS:
        return <Laptop className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Package className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-100">
      {/* 1. Filter, Search & View Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case ID, Title, Serial #, Street Address, or Victim..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[44px]"
            />
          </div>

          {/* View Mode Toggle & Batch Counter */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* View Switcher Button */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded flex items-center gap-1.5 text-xs font-mono min-h-[36px] cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table Grid View"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded flex items-center gap-1.5 text-xs font-mono min-h-[36px] cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Stacked Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>

            {/* Jurisdiction Toggle Pill */}
            {officerStation && (
              <button
                type="button"
                onClick={() => setOnlyMyJurisdiction(!onlyMyJurisdiction)}
                className={`px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-1.5 border min-h-[44px] cursor-pointer transition-colors ${
                  onlyMyJurisdiction
                    ? 'bg-blue-950/80 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>My Station Only</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills Grid */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
          <span className="text-slate-500 flex items-center gap-1 text-[11px]">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none min-h-[40px] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value={IncidentStatus.PENDING}>Pending Triage</option>
            <option value={IncidentStatus.INVESTIGATED}>Under Investigation</option>
            <option value={IncidentStatus.RECOVERED}>Recovered & Resolved</option>
          </select>

          {/* Category select */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none min-h-[40px] cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value={AssetCategory.VEHICLE}>Vehicles & E-Bikes</option>
            <option value={AssetCategory.ELECTRONICS}>Electronics & Laptops</option>
            <option value={AssetCategory.PROPERTY}>Tools & Personal Property</option>
          </select>

          {/* Station select */}
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none min-h-[40px] cursor-pointer"
          >
            <option value="all">All Municipal Stations</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Clear Filters Reset */}
          {(statusFilter !== 'all' || categoryFilter !== 'all' || stationFilter !== 'all' || searchQuery || onlyMyJurisdiction) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('all');
                setStationFilter('all');
                setSearchQuery('');
                setOnlyMyJurisdiction(false);
              }}
              className="text-xs text-rose-400 hover:text-rose-300 underline font-mono ml-auto py-1 min-h-[40px] flex items-center"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 2. ADAPTIVE VIEWPORT: CARDS VIEW (Mobile / Tablet default) */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 font-mono text-xs">
              No matching incident cases found for the active filter parameters.
            </div>
          ) : (
            filteredIncidents.map((incident) => {
              const isSelected = selectedIncidentIds.has(incident.id);
              const isExpanded = expandedCardIds.has(incident.id);

              return (
                <div
                  key={incident.id}
                  onClick={() => onSelectIncident(incident)}
                  className={`bg-slate-900 border rounded-xl p-4 space-y-3 transition-all cursor-pointer shadow-md ${
                    isSelected
                      ? 'border-emerald-500 bg-slate-900/90'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header: Checkbox, Case ID, Status */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => toggleSelectIncident(incident.id, e)}
                        className="text-slate-400 hover:text-emerald-400 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <span className="font-mono text-xs font-bold text-white tracking-wider">
                          {incident.id.toUpperCase()}
                        </span>
                        <div className="text-[10px] font-mono text-slate-500">
                          {new Date(incident.created_at).toLocaleDateString()} · {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
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
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      {getCategoryIcon(incident.category)}
                      <span>{incident.title}</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {incident.description}
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Serial / IMEI</span>
                      <span className="text-emerald-400 truncate block">
                        {incident.serial_number || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Est. Value</span>
                      <span className="text-slate-200">
                        {incident.estimated_value ? `$${incident.estimated_value.toLocaleString()}` : 'Unspecified'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 text-[10px] uppercase block">Assigned Station</span>
                      <span className="text-blue-300 truncate block">
                        {incident.assigned_station_name || 'Central Precinct'}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Details Toggle */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-800 text-xs font-mono space-y-2 text-slate-400 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>Address: {incident.address_approx || 'GPS coordinates logged'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Reporter: {incident.reporter_name || 'Anonymous'} ({incident.reporter_phone || 'No phone'})</span>
                      </div>
                      {incident.officer_notes && (
                        <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300 text-[11px]">
                          <strong>Officer Notes:</strong> {incident.officer_notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Bottom Actions: Quick Status & View */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
                    <button
                      type="button"
                      onClick={(e) => toggleCardExpanded(incident.id, e)}
                      className="text-xs text-slate-400 hover:text-white font-mono flex items-center gap-1 min-h-[44px] px-2"
                    >
                      <span>{isExpanded ? 'Less' : 'Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Quick Status Dropdown */}
                      <select
                        value={incident.status}
                        disabled={isUpdating}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdateStatus(incident.id, e.target.value as IncidentStatus)}
                        className="bg-slate-950 border border-slate-700 rounded text-xs font-mono px-2 py-1.5 text-slate-200 focus:outline-none min-h-[44px] cursor-pointer"
                      >
                        <option value={IncidentStatus.PENDING}>Pending</option>
                        <option value={IncidentStatus.INVESTIGATED}>Investigated</option>
                        <option value={IncidentStatus.RECOVERED}>Recovered</option>
                      </select>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIncident(incident);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono font-bold flex items-center gap-1 min-h-[44px] shadow-sm cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. ADAPTIVE VIEWPORT: TABLE GRID VIEW (Desktop default with horizontal scroll engine) */}
      {viewMode === 'table' && (
        <div className="relative rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
          {/* Horizontal scroll container with scrollbar styling */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="p-1 text-slate-400 hover:text-white min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                    >
                      {selectedIncidentIds.size === filteredIncidents.length && filteredIncidents.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">Case ID</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Asset Details</th>
                  <th className="py-3.5 px-4">Serial / VIN</th>
                  <th className="py-3.5 px-4">Jurisdiction</th>
                  <th className="py-3.5 px-4">Est. Value</th>
                  <th className="py-3.5 px-4">Filed At</th>
                  <th className="py-3.5 px-4 text-right">Quick Triage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                      No matching incident records found.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((incident) => {
                    const isSelected = selectedIncidentIds.has(incident.id);

                    return (
                      <tr
                        key={incident.id}
                        onClick={() => onSelectIncident(incident)}
                        className={`hover:bg-slate-800/60 transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-800/40' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={(e) => toggleSelectIncident(incident.id, e)}
                            className="p-1 text-slate-400 hover:text-emerald-400 min-h-[32px] min-w-[32px] flex items-center justify-center"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-white font-bold whitespace-nowrap">
                          {incident.id.toUpperCase()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              incident.status === IncidentStatus.PENDING
                                ? 'bg-amber-950/80 border-amber-600/60 text-amber-300'
                                : incident.status === IncidentStatus.INVESTIGATED
                                ? 'bg-sky-950/80 border-sky-600/60 text-sky-300'
                                : 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                            }`}
                          >
                            {incident.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-xs max-w-xs truncate">
                          <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                            {getCategoryIcon(incident.category)}
                            <span>{incident.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {incident.address_approx || 'GPS coordinates logged'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-emerald-400 text-xs whitespace-nowrap">
                          {incident.serial_number || <span className="text-slate-600">N/A</span>}
                        </td>
                        <td className="py-3 px-4 text-blue-300 text-xs whitespace-nowrap">
                          {incident.assigned_station_name || 'Central Precinct'}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs whitespace-nowrap">
                          {incident.estimated_value ? `$${incident.estimated_value.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(incident.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <select
                            value={incident.status}
                            disabled={isUpdating}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => onUpdateStatus(incident.id, e.target.value as IncidentStatus)}
                            className="bg-slate-950 border border-slate-700 rounded text-xs px-2 py-1 text-slate-200 focus:outline-none min-h-[36px] cursor-pointer"
                          >
                            <option value={IncidentStatus.PENDING}>Pending</option>
                            <option value={IncidentStatus.INVESTIGATED}>Investigated</option>
                            <option value={IncidentStatus.RECOVERED}>Recovered</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
