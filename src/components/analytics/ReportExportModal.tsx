/**
 * CivicGuard Intelligence Report & Export Builder Modal (ReportExportModal.tsx)
 * Enterprise report generator allowing command staff to filter by temporal window,
 * jurisdiction precinct, asset class, and case lifecycle status, with real-time
 * preview and instant CSV/PDF export pipelines.
 */
import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Building2,
  Filter,
  Eye,
  CheckCircle2,
  Shield,
  Layers,
  Sparkles,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { IncidentReport, PoliceStation, AssetCategory, IncidentStatus, UserProfile } from '../../types';
import { exportIncidentsToCsv } from '../../utils/exportCsv';
import { generateIntelligenceBriefingPdf } from '../../utils/exportPdf';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: IncidentReport[];
  stations: PoliceStation[];
  currentUser: UserProfile;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  incidents,
  stations,
  currentUser,
}) => {
  // Preset dates
  const todayStr = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Filter state
  const [dateRangePreset, setDateRangePreset] = useState<'7d' | '30d' | 'ytd' | 'all'>('30d');
  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedStationId, setSelectedStationId] = useState<string>('all');
  const [selectedCategories, setSelectedCategories] = useState<AssetCategory[]>([
    AssetCategory.VEHICLE,
    AssetCategory.ELECTRONICS,
    AssetCategory.PROPERTY,
    AssetCategory.OTHER,
  ]);
  const [selectedStatuses, setSelectedStatuses] = useState<IncidentStatus[]>([
    IncidentStatus.PENDING,
    IncidentStatus.INVESTIGATED,
    IncidentStatus.RECOVERED,
  ]);
  const [includeOfficerNotes, setIncludeOfficerNotes] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  // Quick preset handler
  const handlePresetChange = (preset: '7d' | '30d' | 'ytd' | 'all') => {
    setDateRangePreset(preset);
    const now = new Date();
    setEndDate(now.toISOString().slice(0, 10));

    if (preset === '7d') {
      const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().slice(0, 10));
    } else if (preset === '30d') {
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().slice(0, 10));
    } else if (preset === 'ytd') {
      const past = new Date(now.getFullYear(), 0, 1);
      setStartDate(past.toISOString().slice(0, 10));
    } else {
      setStartDate('2020-01-01');
    }
  };

  const toggleCategory = (cat: AssetCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleStatus = (st: IncidentStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  // Filtered dataset computation
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Date filter
      const incDate = inc.created_at.slice(0, 10);
      if (startDate && incDate < startDate) return false;
      if (endDate && incDate > endDate) return false;

      // Station filter
      if (selectedStationId !== 'all' && inc.assigned_station_id !== selectedStationId) {
        return false;
      }

      // Category filter
      if (!selectedCategories.includes(inc.category)) {
        return false;
      }

      // Status filter
      if (!selectedStatuses.includes(inc.status)) {
        return false;
      }

      return true;
    });
  }, [incidents, startDate, endDate, selectedStationId, selectedCategories, selectedStatuses]);

  // Aggregated preview stats
  const totalCount = filteredIncidents.length;
  const recoveredCount = filteredIncidents.filter((i) => i.status === IncidentStatus.RECOVERED).length;
  const recoveryRate = totalCount > 0 ? ((recoveredCount / totalCount) * 100).toFixed(1) : '0.0';
  const totalStolenValue = filteredIncidents.reduce((sum, i) => sum + (i.estimated_value || 0), 0);
  const totalRecoveredValue = filteredIncidents
    .filter((i) => i.status === IncidentStatus.RECOVERED)
    .reduce((sum, i) => sum + (i.estimated_value || 0), 0);

  // Estimated file sizes
  const estimatedCsvSizeKb = (Math.max(1, totalCount * 0.28)).toFixed(1);
  const estimatedPdfSizeKb = (Math.max(45, 52 + totalCount * 1.8)).toFixed(1);

  const selectedStationObj = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId) || null;
  }, [stations, selectedStationId]);

  if (!isOpen) return null;

  const handleExportCsv = () => {
    setExporting('csv');
    setTimeout(() => {
      exportIncidentsToCsv(filteredIncidents, {
        stations,
        includeOfficerNotes,
        filename: `CivicGuard_Cases_${startDate}_to_${endDate}.csv`,
      });
      setExporting(null);
    }, 300);
  };

  const handleExportPdf = () => {
    setExporting('pdf');
    setTimeout(() => {
      generateIntelligenceBriefingPdf(filteredIncidents, stations, {
        author: currentUser,
        selectedStation: selectedStationObj,
        dateRangeLabel: `${startDate} to ${endDate}`,
        filename: `CivicGuard_Intelligence_Briefing_${startDate}_to_${endDate}.pdf`,
      });
      setExporting(null);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Executive Intelligence Briefing & Data Export Suite</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">
                  FOUO / Official
                </span>
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Filter incident telemetry, configure export parameters, and download institutional briefings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Filter Parameters */}
            <div className="lg:col-span-7 space-y-5">
              {/* Temporal Window Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Temporal Range</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => handlePresetChange('7d')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        dateRangePreset === '7d'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      7D
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetChange('30d')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        dateRangePreset === '30d'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      30D
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetChange('ytd')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        dateRangePreset === 'ytd'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      YTD
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetChange('all')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        dateRangePreset === 'all'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 mb-1">Start Date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded py-1.5 px-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 mb-1">End Date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded py-1.5 px-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Jurisdiction Precinct Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Precinct Jurisdiction</span>
                </label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Precincts & Mutual Aid Commands</option>
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.code} - {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Category Multiselect */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Asset Categories</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: AssetCategory.VEHICLE, label: 'Vehicle' },
                    { key: AssetCategory.ELECTRONICS, label: 'Electronics' },
                    { key: AssetCategory.PROPERTY, label: 'Property' },
                    { key: AssetCategory.OTHER, label: 'Other' },
                  ].map(({ key, label }) => {
                    const active = selectedCategories.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleCategory(key)}
                        className={`py-1.5 px-2.5 rounded border text-xs font-mono transition-colors text-center ${
                          active
                            ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lifecycle Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  <span>Case Status</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: IncidentStatus.PENDING, label: 'Pending', color: 'text-amber-300 border-amber-500/50 bg-amber-950/30' },
                    { key: IncidentStatus.INVESTIGATED, label: 'Investigated', color: 'text-blue-300 border-blue-500/50 bg-blue-950/30' },
                    { key: IncidentStatus.RECOVERED, label: 'Recovered', color: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/30' },
                  ].map(({ key, label, color }) => {
                    const active = selectedStatuses.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleStatus(key)}
                        className={`py-1.5 px-2 rounded border text-xs font-mono transition-colors text-center ${
                          active
                            ? color
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Additional Options */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeOfficerNotes}
                    onChange={(e) => setIncludeOfficerNotes(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                  />
                  <span>Include Law Enforcement Investigative Notes (Confidential)</span>
                </label>
              </div>
            </div>

            {/* Right Column: Live Data Preview & Summary Card */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-slate-200">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Real-Time Export Preview</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {totalCount} cases selected
                  </span>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block">Selected Cases</span>
                    <span className="text-base font-bold text-white">{totalCount}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {recoveredCount} recovered
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block">Recovery Ratio</span>
                    <span className="text-base font-bold text-emerald-400">{recoveryRate}%</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Resolution rate</span>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block">Stolen Valuation</span>
                    <span className="text-sm font-bold text-rose-400">
                      ${totalStolenValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block">Recovered Value</span>
                    <span className="text-sm font-bold text-emerald-400">
                      ${totalRecoveredValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* File size preview */}
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[11px] font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Target Format: CSV Dataset</span>
                    <span className="text-slate-200 font-bold">~{estimatedCsvSizeKb} KB</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Target Format: PDF Briefing</span>
                    <span className="text-slate-200 font-bold">~{estimatedPdfSizeKb} KB</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                    Includes coordinate geometry, serial registry hashes & jurisdiction tags.
                  </div>
                </div>

                {/* Sample items snippet */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Sample Queue Sample (Top 3)
                  </span>
                  <div className="space-y-1">
                    {filteredIncidents.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="p-1.5 bg-slate-950/80 border border-slate-800/80 rounded text-[11px] flex items-center justify-between font-mono"
                      >
                        <div className="truncate max-w-[190px]">
                          <span className="text-slate-300 font-semibold">{item.title}</span>
                        </div>
                        <span
                          className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold ${
                            item.status === 'recovered'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : item.status === 'investigated'
                              ? 'text-blue-400 bg-blue-500/10'
                              : 'text-amber-400 bg-amber-500/10'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                    {filteredIncidents.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-500 font-mono">
                        No incidents match the active filter criteria.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={totalCount === 0 || exporting !== null}
                  onClick={handleExportPdf}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs rounded border border-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
                >
                  {exporting === 'pdf' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      <span>Generate Official PDF Briefing ({totalCount} Cases)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={totalCount === 0 || exporting !== null}
                  onClick={handleExportCsv}
                  className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 hover:text-white font-semibold text-xs rounded border border-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  {exporting === 'csv' ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download Raw CSV Dataset (GIS / Excel)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>CLASSIFICATION: LAW ENFORCEMENT SENSITIVE (FOUO)</span>
          <span>CIVICGUARD EXPORT ENGINE v3.4</span>
        </div>
      </div>
    </div>
  );
};
