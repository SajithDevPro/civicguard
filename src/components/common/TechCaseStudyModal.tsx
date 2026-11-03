import React, { useState } from 'react';
import {
  X,
  Cpu,
  Layers,
  Radio,
  Shield,
  Zap,
  Database,
  Code2,
  Terminal,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  GitBranch,
  Activity,
  Lock,
  Search,
} from 'lucide-react';

interface TechCaseStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechCaseStudyModal: React.FC<TechCaseStudyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'challenges' | 'metrics'>('architecture');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-950 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 font-sans my-auto">
        {/* Header Telemetry Badge */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-xs font-mono text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Engineering Dossier · Recruiter & Architecture Showcase</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>CivicGuard: Micro-Service & Spatial GIS Architecture</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              A high-stakes, real-time public safety and asset recovery platform built with React, TypeScript, Leaflet, and Supabase PostGIS.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close Case Study"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[40px] ${
              activeTab === 'architecture'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Architecture Diagram</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('challenges')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[40px] ${
              activeTab === 'challenges'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Key Challenges Solved</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[40px] ${
              activeTab === 'metrics'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Performance Telemetry</span>
          </button>
        </div>

        {/* TAB 1: ARCHITECTURE DIAGRAM BREAKDOWN */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            {/* 4-Tier Interactive Architecture Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Tier 1 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400 pb-1 border-b border-slate-800">
                  <span className="font-bold">TIER 1</span>
                  <span>CLIENT</span>
                </div>
                <h4 className="font-bold text-white text-xs">Tactical Frontend</h4>
                <ul className="text-[11px] font-mono text-slate-400 space-y-1">
                  <li>• React 19 + TypeScript</li>
                  <li>• Leaflet.js Vector Engine</li>
                  <li>• CartoDB Dark Matter</li>
                  <li>• Tailwind CSS v4 + Responsive Shell</li>
                </ul>
              </div>

              {/* Tier 2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-blue-400 pb-1 border-b border-slate-800">
                  <span className="font-bold">TIER 2</span>
                  <span>REALTIME</span>
                </div>
                <h4 className="font-bold text-white text-xs">WebSocket Streaming</h4>
                <ul className="text-[11px] font-mono text-slate-400 space-y-1">
                  <li>• Supabase Realtime Channels</li>
                  <li>• Audio Dispatch Alarms</li>
                  <li>• Sub-second Status Push</li>
                  <li>• In-App Toast Telemetry</li>
                </ul>
              </div>

              {/* Tier 3 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-cyan-400 pb-1 border-b border-slate-800">
                  <span className="font-bold">TIER 3</span>
                  <span>MATCHING</span>
                </div>
                <h4 className="font-bold text-white text-xs">Algorithmic Cross-Ref</h4>
                <ul className="text-[11px] font-mono text-slate-400 space-y-1">
                  <li>• Levenshtein Distance (Fuzzy)</li>
                  <li>• Normalized Exact Indexing</li>
                  <li>• Confidence Scoring (0-100%)</li>
                  <li>• Anti-Fencing Verification</li>
                </ul>
              </div>

              {/* Tier 4 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-purple-400 pb-1 border-b border-slate-800">
                  <span className="font-bold">TIER 4</span>
                  <span>DATABASE</span>
                </div>
                <h4 className="font-bold text-white text-xs">PostgreSQL + PostGIS</h4>
                <ul className="text-[11px] font-mono text-slate-400 space-y-1">
                  <li>• Row-Level Security (RLS)</li>
                  <li>• Immutable Audit Triggers</li>
                  <li>• Haversine Spatial Routing</li>
                  <li>• CJIS-Aligned Data Models</li>
                </ul>
              </div>
            </div>

            {/* Pipeline Dataflow Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
              <span className="text-emerald-400 font-bold uppercase tracking-wider block text-[11px]">
                End-to-End Data Pipeline Flow:
              </span>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 space-y-1.5 leading-relaxed">
                <div>
                  <strong className="text-white">1. Ingestion:</strong> Citizen uploads image evidence (validated via cryptographic magic bytes) and drops map coordinate pin.
                </div>
                <div>
                  <strong className="text-white">2. Spatial Triage:</strong> PostGIS spatial query automatically computes nearest municipal police station and assigns jurisdiction polygon.
                </div>
                <div>
                  <strong className="text-white">3. Cross-Reference:</strong> Background matching triggers compare serial against impounded property locker and commercial pawn logs.
                </div>
                <div>
                  <strong className="text-white">4. Audited Resolution:</strong> Investigating officer updates case to <span className="text-emerald-400">RECOVERED</span>, triggering immutable audit logging and real-time push notice to citizen.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KEY TECHNICAL CHALLENGES SOLVED */}
        {activeTab === 'challenges' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Search className="w-4 h-4 shrink-0" />
                <h4>Algorithmic Fuzzy Serial Matching</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Solved serial number discrepancy issues (e.g. OCR typos, hyphens, O vs 0) using a dual-stage matching engine: exact hash lookup for 100% hits, falling back to Levenshtein edit-distance calculation with threshold weighting.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Radio className="w-4 h-4 shrink-0" />
                <h4>Sub-Second Geospatial Telemetry</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Eliminated map rendering bottleneck over thousands of coordinates by combining Leaflet vector tile caching, marker clustering (`react-leaflet-cluster`), and continuous canvas heatmaps.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Lock className="w-4 h-4 shrink-0" />
                <h4>PostgreSQL Row-Level Security (RLS)</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Engineered strict multi-tenant authorization rules preventing citizen PII disclosure. Public anti-fencing lookups expose only verification status without disclosing victim identities or addresses.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Shield className="w-4 h-4 shrink-0" />
                <h4>Zero-Trust Abuse Prevention</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Implemented sliding-window rate limiting (preventing automated scraping), header magic byte inspection (blocking polyglot malware uploads), and immutable database triggers that prohibit log tampering.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: PERFORMANCE TELEMETRY */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">&lt; 100ms</div>
                <div className="text-[11px] font-mono text-slate-400 uppercase">Vector Map Latency</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-400">&lt; 120ms</div>
                <div className="text-[11px] font-mono text-slate-400 uppercase">Cross-Ref Match Time</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-400">100%</div>
                <div className="text-[11px] font-mono text-slate-400 uppercase">TypeScript Strict</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-400">0 PII</div>
                <div className="text-[11px] font-mono text-slate-400 uppercase">Public Leak Risk</div>
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl font-mono text-xs space-y-2">
              <span className="text-slate-400 font-bold block">Developer Portfolio Highlights:</span>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Production-grade modular code architecture adhering to SOLID and Clean Code standards.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Fully testable and decoupled business logic across database, geospatial, and matching services.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>High-contrast, accessible GovTech dark-mode command center design system.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Built for high-stakes municipal resilience.</span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer min-h-[44px]"
          >
            Close Engineering Brief
          </button>
        </div>
      </div>
    </div>
  );
};
