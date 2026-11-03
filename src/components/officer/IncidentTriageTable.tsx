/**
 * CivicGuard High-Density Incident Triage Table (IncidentTriageTable.tsx)
 * Enterprise operational queue for police officers with multi-column filtering,
 * real-time search, jurisdiction toggles, and batch operations.
 */
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
} from 'lucide-react';
import {
  AssetCategory,
  IncidentReport,
  IncidentStatus,
  PoliceStation,
  UserProfile,
} from '../../types';
import { calculateDistanceKm } from '../../services/db';

interface IncidentTriageTableProps {
  incidents: IncidentReport[];
  stations: PoliceStation[];
  currentOfficer: UserProfile;
  onSelectIncident: (incident: IncidentReport) => void;
  onUpdateStatus: (incidentId: string, status: IncidentStatus) => Promise<void>;
  onBatchUpdateStatus?: (incidentIds: string[], status: IncidentStatus) => Promise<void>;
  isUpdating: boolean;
}

export const IncidentTriageTable: React.FC<IncidentTriageTableProps> = ({
  incidents,
  stations,
  currentOfficer,
  onSelectIncident,
  onUpdateStatus,
  onBatchUpdateStatus,
  isUpdating,
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'all'>('all');
  const [jurisdictionOnly, setJurisdictionOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Find officer's assigned station
  const officerStation = stations.find((s) => s.id === currentOfficer.station_id) || stations[0];

  // Filtered dataset
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // 1. Jurisdiction toggle
      if (jurisdictionOnly && officerStation) {
        if (incident.assigned_station_id && incident.assigned_station_id !== officerStation.id) {
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

      // 4. Full-text search
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchTitle = incident.title.toLowerCase().includes(query);
        const matchDesc = incident.description.toLowerCase().includes(query);
        const matchSerial = incident.serial_number?.toLowerCase().includes(query) ?? false;
        const matchId = incident.id.toLowerCase().includes(query);
        const matchReporter = incident.reporter_name?.toLowerCase().includes(query) ?? false;

        if (!matchTitle && !matchDesc && !matchSerial && !matchId && !matchReporter) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, jurisdictionOnly, officerStation, statusFilter, categoryFilter, searchQuery]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredIncidents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIncidents.map((i) => i.id)));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // CSV Export utility
  const handleExportCSV = () => {
    const targets =
      selectedIds.size > 0
        ? incidents.filter((i) => selectedIds.has(i.id))
        : filteredIncidents;

    const headers = [
      'Case ID',
      'Title',
      'Category',
      'Status',
      'Serial Number',
      'Est Value',
      'Latitude',
      'Longitude',
      'Address',
      'Reporter Name',
      'Reporter Contact',
      'Created At',
    ];

    const rows = targets.map((i) => [
      i.id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.status,
      i.serial_number || '',
      i.estimated_value || '',
      i.lat,
      i.lng,
      `"${(i.address_approx || '').replace(/"/g, '""')}"`,
      `"${(i.reporter_name || '').replace(/"/g, '""')}"`,
      i.reporter_phone || i.reporter_email || '',
      i.created_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CivicGuard_Incident_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDistance = (incident: IncidentReport) => {
    if (!officerStation) return '—';
    const dist = calculateDistanceKm(
      { lat: incident.lat, lng: incident.lng },
      { lat: officerStation.lat, lng: officerStation.lng }
    );
    return `${dist.toFixed(1)} km`;
  };

  return (
    <div className="space-y-4">
      {/* Triage Search & Filter Control Ribbon */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-mono text-slate-400 mr-2 uppercase">Queue:</span>
            {[
              { id: 'all', label: 'All Queue' },
              { id: IncidentStatus.PENDING, label: 'Pending Review', color: 'text-amber-400' },
              { id: IncidentStatus.INVESTIGATED, label: 'Active Investigation', color: 'text-sky-400' },
              { id: IncidentStatus.RECOVERED, label: 'Item Recovered', color: 'text-emerald-400' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStatusFilter(btn.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 border ${
                  statusFilter === btn.id
                    ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Jurisdiction Sector Toggle & Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setJurisdictionOnly(!jurisdictionOnly)}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors flex items-center gap-1.5 ${
                jurisdictionOnly
                  ? 'bg-blue-950/80 border-blue-500 text-blue-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Precinct Only ({officerStation?.code || 'Central'})</span>
            </button>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-600"
            >
              <option value="all">All Asset Categories</option>
              <option value={AssetCategory.VEHICLE}>Vehicles & Bikes</option>
              <option value={AssetCategory.ELECTRONICS}>Electronics</option>
              <option value={AssetCategory.PROPERTY}>Property & Valuables</option>
              <option value={AssetCategory.OTHER}>Other Public Safety</option>
            </select>
          </div>
        </div>

        {/* Search Bar & Batch Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search serial tags, victim names, case IDs, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-600 font-mono"
            />
          </div>

          {/* Batch Actions Bar */}
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-xs font-mono text-emerald-400 font-bold px-2">
                {selectedIds.size} Selected
              </span>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* High-Density Triage Grid */}
      <div className="border border-slate-800 rounded-lg bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3 py-3 w-8">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-slate-400 hover:text-white"
                  >
                    {selectedIds.size === filteredIncidents.length && filteredIncidents.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-3">Priority Status</th>
                <th className="px-3 py-3">Case ID</th>
                <th className="px-3 py-3">Timestamp</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Asset Title & Address</th>
                <th className="px-3 py-3">Serial / Hardware Tag</th>
                <th className="px-3 py-3">Station Node</th>
                <th className="px-3 py-3">Citizen Reporter</th>
                <th className="px-3 py-3 text-right">Triage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <AlertCircle className="w-6 h-6 mx-auto text-slate-600 mb-2" />
                    <div className="text-sm font-medium text-slate-400">No triage queue records match criteria</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Try resetting active jurisdiction or status filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => {
                  const isSelected = selectedIds.has(incident.id);

                  return (
                    <tr
                      key={incident.id}
                      onClick={() => onSelectIncident(incident)}
                      className={`hover:bg-slate-800/50 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-slate-800/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 w-8" onClick={(e) => handleToggleSelectRow(incident.id, e)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
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
                      </td>

                      {/* Case ID */}
                      <td className="px-3 py-3 whitespace-nowrap font-mono font-bold text-slate-200">
                        {incident.id.toUpperCase()}
                      </td>

                      {/* Timestamp */}
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-[11px] text-slate-400 tabular-nums">
                        {formatDate(incident.created_at)}
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-[11px] uppercase text-slate-400">
                        {incident.category}
                      </td>

                      {/* Title & Address */}
                      <td className="px-3 py-3 max-w-xs">
                        <div className="font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
                          {incident.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {incident.address_approx || 'GPS coordinates logged'}
                        </div>
                      </td>

                      {/* Serial / VIN Tag */}
                      <td className="px-3 py-3 whitespace-nowrap font-mono">
                        {incident.serial_number ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-300 text-[11px] font-semibold">
                            {incident.serial_number}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Station Node & Distance */}
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-[11px]">
                        <div className="text-slate-200">{incident.assigned_station_name || 'Central Command'}</div>
                        <div className="text-blue-400 text-[10px]">{formatDistance(incident)} away</div>
                      </td>

                      {/* Citizen Contact */}
                      <td className="px-3 py-3 whitespace-nowrap text-xs">
                        <div className="text-slate-200 font-medium">{incident.reporter_name || 'Verified Citizen'}</div>
                        <div className="text-[11px] font-mono text-slate-500">{incident.reporter_phone || incident.reporter_email}</div>
                      </td>

                      {/* Quick Triage Action Dropdown */}
                      <td
                        className="px-3 py-3 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={incident.status}
                          disabled={isUpdating}
                          onChange={(e) => onUpdateStatus(incident.id, e.target.value as IncidentStatus)}
                          className={`px-2 py-1 text-xs font-mono rounded border focus:outline-none cursor-pointer ${
                            incident.status === IncidentStatus.PENDING
                              ? 'bg-amber-950/70 border-amber-600 text-amber-300'
                              : incident.status === IncidentStatus.INVESTIGATED
                              ? 'bg-sky-950/70 border-sky-600 text-sky-300'
                              : 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                          }`}
                        >
                          <option value={IncidentStatus.PENDING} className="bg-slate-900 text-amber-300">
                            PENDING
                          </option>
                          <option value={IncidentStatus.INVESTIGATED} className="bg-slate-900 text-sky-300">
                            INVESTIGATING
                          </option>
                          <option value={IncidentStatus.RECOVERED} className="bg-slate-900 text-emerald-300">
                            RECOVERED
                          </option>
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
    </div>
  );
};
