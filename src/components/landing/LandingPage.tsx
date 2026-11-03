import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Search,
  Radio,
  Crosshair,
  Lock,
  Cpu,
  BarChart3,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Layers,
  Database,
  Building2,
  Sparkles,
} from 'lucide-react';
import { SystemMetrics, UserProfile, UserRole } from '../../types';

interface LandingPageProps {
  onOpenReportModal: () => void;
  onNavigateTab: (tab: 'map' | 'operations' | 'my-reports' | 'anti-fencing' | 'schema' | 'metrics') => void;
  onOpenAuthModal: () => void;
  metrics: SystemMetrics;
  currentUser: UserProfile;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenReportModal,
  onNavigateTab,
  onOpenAuthModal,
  metrics,
  currentUser,
}) => {
  const [quickSerialSearch, setQuickSerialSearch] = useState('');

  // Sample tactical pins for the mini-radar preview
  const previewNodes = [
    { id: '1', title: 'Trek Domane SL7 (Bicycle)', type: 'recovered', lat: 37.779, lng: -122.418, precinct: 'Central Precinct #01' },
    { id: '2', title: 'MacBook Pro 16" M3', type: 'investigating', lat: 37.771, lng: -122.425, precinct: 'Mission District #04' },
    { id: '3', title: 'Honda CR-V (Catalytic Converter)', type: 'stolen', lat: 37.785, lng: -122.408, precinct: 'Financial District #02' },
    { id: '4', title: 'Sony Alpha A7 IV Camera Kit', type: 'recovered', lat: 37.765, lng: -122.435, precinct: 'Castro Station #06' },
  ];

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigateTab('anti-fencing');
  };

  return (
    <div className="space-y-16 pb-12 font-sans text-slate-100 selection:bg-emerald-500 selection:text-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800 p-8 sm:p-12 lg:p-16 shadow-2xl">
        {/* Tactical Grid Background */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        
        {/* Glow ambient spots */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          {/* Top Status Capsule */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-emerald-400 backdrop-blur-md shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="tracking-wide uppercase font-semibold">Active Operational Telemetry · v2.4</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">CJIS & RLS Enforced</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Real-Time Public Safety &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Asset Recovery Intelligence
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Empowering citizens to report stolen property within seconds, while giving municipal law enforcement 
            tactical geospatial telemetry, automated serial cross-referencing, and instantaneous precinct dispatch.
          </p>

          {/* Dual Primary Call-To-Action Entryways */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onOpenReportModal}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg border border-emerald-500 flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/80 hover:shadow-emerald-900/50 transition-all cursor-pointer group"
            >
              <ShieldAlert className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
              <span>Report Stolen Asset (Citizen Portal)</span>
              <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentUser.role === UserRole.OFFICER || currentUser.role === UserRole.ADMIN) {
                  onNavigateTab('operations');
                } else {
                  onOpenAuthModal();
                }
              }}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold text-slate-100 bg-slate-800/90 hover:bg-slate-700/90 rounded-lg border border-slate-700 flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer group"
            >
              <Radio className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              <span>Officer Command Center</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                Authorized IAM
              </span>
            </button>
          </div>

          {/* Quick secondary navigation pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-400">
            <span>Direct Jump:</span>
            <button
              type="button"
              onClick={() => onNavigateTab('map')}
              className="hover:text-emerald-400 transition-colors underline decoration-slate-700 underline-offset-4"
            >
              Tactical Map
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigateTab('anti-fencing')}
              className="hover:text-emerald-400 transition-colors underline decoration-slate-700 underline-offset-4"
            >
              Serial / VIN Anti-Fencing
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigateTab('metrics')}
              className="hover:text-emerald-400 transition-colors underline decoration-slate-700 underline-offset-4"
            >
              Executive Briefings
            </button>
          </div>
        </div>

        {/* Live Metrics Ticker Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
              ${(metrics.total_recovered_value || 1420500).toLocaleString()}
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Asset Value Recovered
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {metrics.recovery_rate_percent || 78.4}%
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Case Clearance Rate
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-400">
              {metrics.active_stations_count || 12} Precincts
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Connected Jurisdictions
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-400">
              &lt; 120ms
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Cross-Reference Latency
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Anti-Fencing Fast Search Box */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 sm:p-8 backdrop-blur shadow-xl">
        <div className="max-w-3xl mx-auto space-y-4 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider bg-cyan-950/40 px-3 py-1 rounded border border-cyan-800/50">
            <Search className="w-3.5 h-3.5" />
            <span>Public Anti-Fencing & Stolen Asset Registry</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Buying Used Goods? Verify Serial, IMEI, or VIN Instantly
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Prevent fencing crimes by cross-referencing electronics, vehicles, and tools against verified police reports.
          </p>

          <form onSubmit={handleQuickSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={quickSerialSearch}
                onChange={(e) => setQuickSerialSearch(e.target.value)}
                placeholder="Enter Serial Number, IMEI, or Vehicle VIN (e.g. SN-TREK-88912)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Verify Registry</span>
            </button>
          </form>
        </div>
      </section>

      {/* Embedded Tactical Mini-Map Preview */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
              <Crosshair className="w-3.5 h-3.5" />
              <span>Live Geospatial Intelligence Grid</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Tactical Density & Hotspot Visualization
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('map')}
            className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
          >
            <span>Launch Full-Screen Tactical Map</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tactical preview panel */}
        <div className="relative min-h-[420px] sm:h-96 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
          {/* Tactical Radar Grid */}
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />
          
          {/* Center Coordinates Telemetry watermark */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 border border-slate-800 rounded p-2.5 font-mono text-[11px] text-slate-300 backdrop-blur shadow-md space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>GRID SECTOR: SF-METRO-01</span>
            </div>
            <div className="text-slate-400">COORDS: 37.7749° N, 122.4194° W</div>
            <div className="text-slate-400">RESOLUTION: Sub-meter CartoDB Vector</div>
          </div>

          {/* Mini-radar simulated incident beacons */}
          <div className="relative w-full h-full flex items-center justify-center p-8">
            {/* Concentric radar circles */}
            <div className="absolute w-64 h-64 border border-emerald-500/10 rounded-full" />
            <div className="absolute w-96 h-96 border border-emerald-500/10 rounded-full" />
            <div className="absolute w-[500px] h-[500px] border border-emerald-500/5 rounded-full" />

            {/* Tactical Nodes Overlay */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
              {previewNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => onNavigateTab('map')}
                  className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/60 rounded-lg p-3.5 backdrop-blur cursor-pointer transition-all shadow-lg group"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      {node.precinct}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        node.type === 'recovered'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : node.type === 'investigating'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {node.type}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {node.title}
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-slate-500">
                    GPS: {node.lat.toFixed(4)}°N, {Math.abs(node.lng).toFixed(4)}°W
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Bar within preview */}
          <div className="absolute bottom-3 right-4 z-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('map')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded transition-colors shadow-md flex items-center gap-1.5"
            >
              <span>Explore Interactive Tactical Layers</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        </div>
      </section>

      {/* 3 Core Architecture Pillars */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
            Engineered For High-Stakes Operations
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Enterprise Architecture & Capabilities
          </h2>
          <p className="text-sm text-slate-400">
            CivicGuard replaces legacy paper dispatch and fragmented stolen-item spreadsheets with an integrated real-time cloud backbone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 space-y-4 transition-all">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Geospatial Incident Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vector tile rendering with dynamic Leaflet heatmaps and marker clustering. Automatically computes nearest municipal precinct and assigns jurisdiction polygons in milliseconds.
            </p>
            <div className="pt-2 text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PostGIS Spatial Radius Querying</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-6 space-y-4 transition-all">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Algorithmic Cross-Reference</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dual-stage matching engine executing exact hash index lookups and Levenshtein distance calculations against pawnshop feeds and evidence logs to uncover recovered assets.
            </p>
            <div className="pt-2 text-[11px] font-mono text-cyan-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Weighted Confidence Scoring (0 - 100%)</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 rounded-xl p-6 space-y-4 transition-all">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Real-Time Dispatch & WebSockets</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instantaneous multi-channel dispatch pipelines. Audio alerts for high-priority incidents, precinct radio streams, and live notifications notifying citizens the moment an item is located.
            </p>
            <div className="pt-2 text-[11px] font-mono text-blue-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sub-second Supabase Broadcast Channels</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works: Step-by-Step Flow */}
      <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 sm:p-12 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Operational Lifecycle
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            How An Incident Travels Through CivicGuard
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm">
                01
              </span>
              <h3 className="font-bold text-white text-base">Citizen Logs Report</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The victim enters asset details (make, model, serial/VIN, estimated value), attaches photographic proof of ownership, and specifies exact GPS incident coordinates on the map.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-mono font-bold text-sm">
                02
              </span>
              <h3 className="font-bold text-white text-base">Automated Triage & Match</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The platform auto-assigns the nearest precinct jurisdiction and runs serial cross-referencing against recovered property lockers and pawn inventory, alerting responding officers.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center font-mono font-bold text-sm">
                03
              </span>
              <h3 className="font-bold text-white text-base">Recovery & Case Clearance</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Officers verify physical evidence, update the case dossier status to <span className="text-emerald-400 font-mono">RECOVERED</span>, and the citizen receives an automated custody recovery notice.
            </p>
          </div>
        </div>
      </section>

      {/* Institutional Security & Trust */}
      <section className="border border-slate-800 rounded-xl p-8 bg-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Lock className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">Enterprise Security Compliance</span>
          </div>
          <h3 className="text-lg font-bold text-white">PostgreSQL Row-Level Security (RLS) & CJIS Safeguards</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Data privacy is guaranteed through cryptographic database policies: Citizens can only inspect their own reports; law enforcement maintains audited operational oversight.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 font-mono text-xs">
          <span className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
            ✓ PostGIS 3.3
          </span>
          <span className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
            ✓ JWT Token Sessions
          </span>
          <span className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
            ✓ Audited Evidence Logs
          </span>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="text-center py-8 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Ready to Deploy Public Safety Intelligence?
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onOpenReportModal}
            className="px-6 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg border border-emerald-500 shadow-lg shadow-emerald-950/60 transition-colors cursor-pointer"
          >
            File Citizen Stolen Item Report
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('operations')}
            className="px-6 py-3 text-sm font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            View Officer Operations Queue
          </button>
        </div>
      </section>
    </div>
  );
};
