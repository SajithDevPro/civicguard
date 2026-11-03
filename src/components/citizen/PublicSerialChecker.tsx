/**
 * CivicGuard Public Serial Number & Anti-Fencing Checker (PublicSerialChecker.tsx)
 * Public-facing verification portal enabling citizens, pawnshops, and second-hand buyers
 * to check whether electronics, vehicles, or gear are registered as active stolen property.
 * Strictly enforces privacy: exposes law enforcement case references and precincts without
 * disclosing victim PII (phone number, street address, or personal identity).
 */
import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
  FileCheck2,
  Copy,
  Check,
  Building2,
  Calendar,
  Tag,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { SerialCheckResult } from '../../types';
import { queryPublicSerialCheck } from '../../services/matching';
import { sanitizeSerialNumber } from '../../lib/security/sanitizer';
import { useRateLimiter, checkRateLimit } from '../../lib/security/rateLimiter';

export const PublicSerialChecker: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SerialCheckResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // Anti-harvesting rate limiter: max 20 queries / minute
  const {
    isThrottled,
    countdown,
    remaining,
    limit,
    refresh: refreshRateLimit,
  } = useRateLimiter('SERIAL_LOOKUP', 'public_registry');

  // Quick sample test cases
  const sampleSerials = [
    { label: 'Stolen E-Bike', serial: 'SPEC-VADO-88219-SF', expected: 'Stolen Flag' },
    { label: 'MacBook Pro M3', serial: 'APPLMBP16M3X9940', expected: 'Stolen Flag' },
    { label: 'Surveying GNSS', serial: 'TRIM-R12-88194', expected: 'Stolen Flag' },
    { label: 'Clean Asset Test', serial: 'SN-SONY-A7IV-00918', expected: 'Clean Record' },
  ];

  const handleSearch = async (targetSerial?: string) => {
    const rawToQuery = targetSerial !== undefined ? targetSerial : query;
    if (!rawToQuery.trim()) return;

    // 1. Enforce anti-scraping rate limit
    const rateCheck = checkRateLimit('SERIAL_LOOKUP', 'public_registry', { recordAttempt: true });
    refreshRateLimit();

    if (!rateCheck.allowed) {
      setRateLimitMessage(rateCheck.message || 'Rate limit reached: Max 20 lookups per minute.');
      return;
    }
    setRateLimitMessage(null);

    // 2. Strict Input Sanitization (strip XSS and SQL injection chars)
    const cleanedSerial = sanitizeSerialNumber(rawToQuery);

    try {
      setIsSearching(true);
      if (targetSerial !== undefined) {
        setQuery(cleanedSerial);
      }
      const res = await queryPublicSerialCheck(cleanedSerial);
      setResult(res);
    } catch (err) {
      console.error('Serial check failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const copyRefToClipboard = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-slate-100">
      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                Anti-Fencing & Property Verification Network
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
                Public Access
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Public Serial Number & VIN Search
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Cross-reference electronics, bicycles, tools, and vehicles against municipal police stolen property registers before purchasing second-hand items.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
            <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <div className="text-white font-bold">100% Privacy-Preserving</div>
              <div className="text-[11px] text-slate-500">Zero victim PII exposure</div>
            </div>
          </div>
        </div>

        {/* Search Bar Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative pt-2"
        >
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Serial Number, VIN, IMEI, or Frame Code (e.g. SPEC-VADO-88219-SF)..."
              className="w-full pl-12 pr-32 py-3.5 bg-slate-950 border-2 border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none transition-colors shadow-inner"
            />
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="absolute right-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm"
            >
              {isSearching ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify Serial</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Anti-Scraping Rate Limit Warning Banner */}
        {(isThrottled || rateLimitMessage) && (
          <div className="p-3 rounded-lg bg-amber-950/70 border border-amber-600/70 text-amber-200 text-xs font-mono flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {rateLimitMessage || `Anti-Scraping Protection: Rate limit reached. Cooldown active: ${countdown}s remaining.`}
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-900/60 border border-amber-700/60 text-amber-300">
              429 TOO_MANY_REQUESTS
            </span>
          </div>
        )}

        {/* Quick Demo Test Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-mono text-slate-500 text-[11px]">Quick Tests:</span>
          {sampleSerials.map((s) => (
            <button
              key={s.serial}
              type="button"
              onClick={() => handleSearch(s.serial)}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 font-mono text-[11px] text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <span className="text-slate-400 font-sans">{s.label}:</span>
              <strong className="text-white">{s.serial}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Search Result Display */}
      {result && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Flagged Stolen Property Banner */}
          {result.status === 'stolen_flagged' && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-red-950/90 via-slate-900 to-slate-950 border-2 border-red-500/90 shadow-2xl shadow-red-950/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-800/40 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-600/20 border border-red-500 rounded-xl text-red-400">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded bg-red-900/60 border border-red-500 text-red-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                      🚨 Law Enforcement Alert: Active Stolen Property
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      {result.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-red-300 font-bold bg-red-950 border border-red-600 px-3 py-1 rounded-lg">
                    100% Confirmed Match
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-red-200 leading-relaxed font-sans">
                {result.message}
              </p>

              {/* Verified Incident Telemetry */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/80 rounded-xl border border-red-900/40 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[11px]">Police Case Reference:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <strong className="text-white text-sm">{result.incident_ref}</strong>
                    <button
                      type="button"
                      onClick={() => copyRefToClipboard(result.incident_ref || '')}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                      title="Copy case reference"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Reporting Precinct:</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">
                    {result.precinct_name}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Date Reported Stolen:</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">
                    {result.reported_date}
                  </span>
                </div>
              </div>

              {/* Instructions for Buyer / Pawnshop */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>Mandatory Protocol for Citizens & Pawnshops</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Do not purchase or accept transfer of this property.</li>
                  <li>Securely note the seller's contact and marketplace listing URL.</li>
                  <li>
                    Contact the non-emergency dispatch desk of <strong>{result.precinct_name}</strong> and quote Reference ID <strong>{result.incident_ref}</strong>.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Potential Fuzzy Match Banner */}
          {result.status === 'potential_match' && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border-2 border-amber-500/80 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-600/20 border border-amber-500 rounded-xl text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-500 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                    Caution: Potential Serial Typo / Partial Match ({result.confidence}%)
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Related Stolen Case: {result.title}
                  </h3>
                </div>
              </div>

              <p className="text-xs text-amber-200">{result.message}</p>

              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-amber-900/40 text-xs font-mono flex items-center justify-between">
                <span>
                  Case Ref: <strong className="text-white">{result.incident_ref}</strong> ({result.precinct_name})
                </span>
                <span className="text-amber-400 font-bold">{result.confidence}% Match Similarity</span>
              </div>
            </div>
          )}

          {/* Clear Record Status */}
          {result.status === 'clear' && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/60 shadow-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 border border-emerald-500 rounded-xl text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    No Active Stolen Record Found
                  </h3>
                  <p className="text-xs font-mono text-emerald-400">
                    Normalized Serial: {result.normalized_query || result.query.toUpperCase()}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {result.message}
              </p>

              <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
                Notice: Records are maintained in real time by participating law enforcement agencies. Unregistered items or thefts occurring within the last 30 minutes may still be in intake triage.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Explanatory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Anti-Fencing Logic</span>
          </div>
          <p className="text-xs text-slate-400">
            Automated fuzzy normalization strips dashes, spaces, and resolves common OCR transcription mixups like '0' vs 'O'.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-bold uppercase">
            <Building2 className="w-4 h-4" />
            <span>Pawnshop Integration</span>
          </div>
          <p className="text-xs text-slate-400">
            Second-hand dealers and municipal recyclers check asset serials before intake to curb illegal fencing syndicates.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-bold uppercase">
            <Radio className="w-4 h-4" />
            <span>Real-Time Recovery Alerts</span>
          </div>
          <p className="text-xs text-slate-400">
            When a matching serial is entered by officers in the field, automated push notifications notify victims within seconds.
          </p>
        </div>
      </div>
    </div>
  );
};
