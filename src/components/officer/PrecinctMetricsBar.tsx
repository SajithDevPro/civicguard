/**
 * CivicGuard Precinct Analytics Metrics Header
 * High-density command metric strip displaying active intake, recovery velocity,
 * pending review queue counts, and geospatial hotspot intelligence.
 */
import React from 'react';
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  Flame,
  Radio,
  Building2,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { IncidentReport, IncidentStatus, PoliceStation, SystemMetrics } from '../../types';

interface PrecinctMetricsBarProps {
  metrics: SystemMetrics;
  incidents: IncidentReport[];
  station: PoliceStation | null;
}

export const PrecinctMetricsBar: React.FC<PrecinctMetricsBarProps> = ({
  metrics,
  incidents,
  station,
}) => {
  // Determine top theft hotspot zone dynamically from incident address/sector tags
  const hotspotZone = React.useMemo(() => {
    if (incidents.length === 0) return 'Central District';
    const sectorCounts: Record<string, number> = {};

    incidents.forEach((inc) => {
      const loc = inc.address_approx || 'Downtown Sector';
      // Extract main district/corridor name
      const key = loc.split(',')[0].split('&')[0].trim() || 'Central Sector';
      sectorCounts[key] = (sectorCounts[key] || 0) + 1;
    });

    let topSector = 'Downtown Core';
    let maxCount = 0;
    Object.entries(sectorCounts).forEach(([sector, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topSector = sector;
      }
    });

    return `${topSector} (${maxCount} events)`;
  }, [incidents]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* 1. Total Active Incidents */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
          <span>Active Intake Queue</span>
          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> +12% WoW
          </span>
        </div>
        <div className="text-2xl font-bold font-mono text-white tabular-nums">
          {incidents.length}
        </div>
        <div className="text-[11px] text-slate-500 mt-1 truncate">
          {station ? `${station.code} Sector Jurisdiction` : 'Citywide Operations'}
        </div>
      </div>

      {/* 2. Pending Review Priority Queue */}
      <div className="p-3.5 bg-slate-900 border border-amber-500/30 rounded-lg shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 uppercase tracking-wider mb-1">
          <span>Pending Review Queue</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        </div>
        <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
          {metrics.pending_count}
        </div>
        <div className="text-[11px] text-amber-400/70 mt-1">
          Requires officer triage sign-off
        </div>
      </div>

      {/* 3. Average Recovery Rate & Secured Value */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
          <span>Asset Recovery Rate</span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
          {metrics.recovery_rate_percent}%
        </div>
        <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
          {formatCurrency(metrics.total_recovered_value)} secured
        </div>
      </div>

      {/* 4. Top Theft Hotspot Zone */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
          <span>Theft Hotspot Density</span>
          <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
        </div>
        <div className="text-sm font-bold font-mono text-orange-300 mt-1 truncate">
          {hotspotZone}
        </div>
        <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <span>Patrol Units Deployed: {station?.active_officers_count || 18}</span>
        </div>
      </div>
    </div>
  );
};
