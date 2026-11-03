import React from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Building,
  Radio,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { PoliceStation, SystemMetrics } from '../types';

interface MetricsDashboardProps {
  metrics: SystemMetrics;
  stations: PoliceStation[];
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ metrics, stations }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Asset Recovery Rate
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">+18.4% YoY</span>
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 mt-2 tabular-nums">
            {metrics.recovery_rate_percent}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {metrics.recovered_count} of {metrics.total_reports} cases resolved
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Secured Stolen Property
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-100 mt-2 tabular-nums">
            {formatCurrency(metrics.total_recovered_value)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Returned directly to citizen owners</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Active Precincts
            </span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-blue-400 mt-2 tabular-nums">
            {metrics.active_stations_count}
          </div>
          <div className="text-xs text-slate-500 mt-1">Connected command substations</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Deployed Tactical Units
            </span>
            <Radio className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-purple-400 mt-2 tabular-nums">
            {metrics.active_patrol_officers}
          </div>
          <div className="text-xs text-slate-500 mt-1">On active GIS patrol shift</div>
        </div>
      </div>

      {/* Precinct Operations Breakdown Grid */}
      <div className="border border-slate-800 rounded bg-slate-900/80 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
            Precinct Jurisdiction Response Telemetry
          </h3>
          <span className="text-xs font-mono text-slate-400">Live Department Feeds</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Precinct Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Radio Dispatch</th>
                <th className="px-4 py-3 text-right">Patrol Units</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {stations.map((station) => (
                <tr key={station.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-sky-400">{station.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{station.name}</td>
                  <td className="px-4 py-3 text-slate-400">{station.address}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{station.dispatch_frequency}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-100">
                    {station.active_officers_count || 12}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      OPERATIONAL
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
