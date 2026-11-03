import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  Lock,
  AlertTriangle,
  Scale,
  Printer,
  X,
  ExternalLink,
  CheckCircle2,
  PhoneCall,
  Mail,
  Building2,
  Calendar,
} from 'lucide-react';

export type LegalTab = 'terms' | 'privacy' | 'disclaimer';

interface LegalPagesProps {
  initialTab?: LegalTab;
  onClose?: () => void;
  isModal?: boolean;
}

export const LegalPages: React.FC<LegalPagesProps> = ({
  initialTab = 'disclaimer',
  onClose,
  isModal = false,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  const handlePrint = () => {
    window.print();
  };

  const content = (
    <div className="space-y-6 font-sans text-slate-100 selection:bg-emerald-500 selection:text-black">
      {/* ⚠️ EMERGENCY BANNER - HIGHEST VISUAL PRIORITY */}
      <div className="p-4 sm:p-5 rounded-xl bg-rose-950/80 border-2 border-rose-600/80 text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-900/60 text-rose-300 border border-rose-500/50 shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse text-rose-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-extrabold uppercase font-mono tracking-wider text-white">
              Emergency & Life-Safety Directive
            </h3>
            <p className="text-xs sm:text-sm text-rose-200/90 leading-relaxed max-w-3xl">
              CivicGuard is an independent municipal intelligence & asset recovery platform. 
              <strong> IT IS NOT A 911 EMERGENCY DISPATCH SYSTEM.</strong> If you are witnessing a crime in progress, burglary with suspects on site, or face an immediate physical threat, <strong>call 911 or your local emergency number immediately.</strong>
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <a
            href="tel:911"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg cursor-pointer min-h-[44px]"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Emergency: 911</span>
          </a>
        </div>
      </div>

      {/* Nav Tabs & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl overflow-x-auto text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('disclaimer')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
              activeTab === 'disclaimer'
                ? 'bg-rose-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>911 & Liability Disclaimer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
              activeTab === 'terms'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Terms of Service (ToS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy (GDPR/CCPA)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors min-h-[40px] cursor-pointer"
            title="Print Legal Documentation"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Document</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              aria-label="Close Legal Modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENT BODY CONTAINER */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-8 backdrop-blur-md shadow-2xl">
        {/* TAB 1: 911 & LAW ENFORCEMENT DISCLAIMER */}
        {activeTab === 'disclaimer' && (
          <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-rose-400 uppercase tracking-wider bg-rose-950/40 px-3 py-1 rounded border border-rose-800/50">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Statutory Compliance & Legal Notice</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                Law Enforcement Status & Limitation of Liability Disclaimer
              </h2>
              <div className="text-xs font-mono text-slate-500">
                Effective Date: November 1, 2026 · Document Reference: CG-LEGAL-DISC-V2.4
              </div>
            </div>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-rose-400">1.</span> Non-Governmental Agency Declaration
              </h3>
              <p>
                CivicGuard is an independently engineered civic safety utility and software framework. Unless expressly governed by an active municipal Memorandum of Understanding (MOU) or inter-agency service contract, CivicGuard is <strong>NOT a direct branch of any city police department, state patrol, or federal law enforcement agency.</strong>
              </p>
              <p>
                Use of the CivicGuard platform does not establish an official police report for statutory filing requirements in jurisdictions requiring in-person desk filing or direct sworn officer interviews. Users filing insurance claims must verify whether their local carrier requires an official municipal police case incident number.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-rose-400">2.</span> Emergency Response & Life-Safety Warning
              </h3>
              <p>
                Under no circumstances should CivicGuard be used to report active violent felonies, medical emergencies, fires, kidnappings, or situations where human safety is threatened. CivicGuard does not guarantee real-time response times by law enforcement personnel. <strong>ALWAYS CALL 911 FOR ACTIVE EMERGENCIES.</strong>
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-rose-400">3.</span> Limitation of Platform & Creator Liability
              </h3>
              <p>
                CivicGuard, its creators, maintainers, contributors, and municipal partners provide this platform on an <strong>"AS-IS" and "AS-AVAILABLE" basis</strong> without warranty of any kind, whether express, implied, or statutory. Specifically:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-400 text-xs font-mono">
                <li>No guarantee is made that reported stolen assets will be located, recovered, or returned.</li>
                <li>No liability is assumed for physical confrontations, injuries, or civil disputes arising from citizens attempting self-recovery or confrontation with alleged possessors of stolen property. Citizens are strictly instructed NEVER to attempt vigilante recovery.</li>
                <li>No liability is assumed for third-party transactions, commercial pawnshop transactions, or private marketplace purchases.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-rose-400">4.</span> Public Anti-Fencing Registry Notice
              </h3>
              <p>
                The CivicGuard Anti-Fencing registry compiles publicly flagged stolen property identifiers (VINs, serial numbers, IMEIs) to assist second-hand buyers and pawn brokers. A "Clean Record" result indicates that the specified serial number has not been logged in this database; it <strong>does not constitute a legal certification of clean title</strong> or merchantability under the Uniform Commercial Code (UCC).
              </p>
            </section>
          </div>
        )}

        {/* TAB 2: TERMS OF SERVICE (ToS) */}
        {activeTab === 'terms' && (
          <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider bg-emerald-950/40 px-3 py-1 rounded border border-emerald-800/50">
                <Scale className="w-3.5 h-3.5" />
                <span>Binding User Agreement</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                Terms of Service & Acceptable Use Policy
              </h2>
              <div className="text-xs font-mono text-slate-500">
                Last Updated: November 1, 2026 · Document Reference: CG-TOS-V2.4
              </div>
            </div>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-emerald-400">1.</span> Acceptance of Terms & Eligibility
              </h3>
              <p>
                By creating an account, dropping a coordinate pin, querying the serial registry, or submitting an incident report, you agree to be bound by these Terms of Service. You must be at least 18 years of age or possess legal capacity to enter into binding agreements.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-emerald-400">2.</span> Prohibition of False Reporting & Criminal Penalties
              </h3>
              <p className="bg-rose-950/40 border border-rose-900/60 p-4 rounded-xl text-rose-200 text-xs font-mono">
                <strong>CRIMINAL STATUTE WARNING:</strong> Submitting a false, fictitious, or fraudulent crime report is a severe misdemeanor or felony under federal and state statutes (e.g., California Penal Code § 148.5; 18 U.S.C. § 1001). CivicGuard cryptographically logs IP addresses, device user agents, and cryptographic hashes for all report filings. Suspected fraudulent filings will be referred directly to state and municipal prosecutors.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-emerald-400">3.</span> Prohibition of Law Enforcement Impersonation
              </h3>
              <p>
                The "Officer Command Center" is restricted strictly to authorized municipal law enforcement personnel with verified credentials. Attempting to bypass Role-Based Access Control (RBAC), forging municipal badge numbers, or accessing officer dispatch queues without authorization is a direct violation of the Computer Fraud and Abuse Act (CFAA, 18 U.S.C. § 1030) and state computer trespass laws.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-emerald-400">4.</span> Ownership Warranty & Intellectual Property
              </h3>
              <p>
                When uploading evidence (serial numbers, photos, purchase receipts), you warrant that you are the lawful owner or authorized agent of the stolen property. You grant CivicGuard a non-exclusive, royalty-free license to index the provided serial number and technical details solely for cross-referencing and law enforcement recovery purposes.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-emerald-400">5.</span> Account Termination & Abuse Prevention
              </h3>
              <p>
                CivicGuard enforces sliding-window rate limiting to prevent automated scraping and DDoS attacks. We reserve the absolute right to suspend or terminate any account that violates rate limits, attempts SQL injection, or uploads polyglot exploit files.
              </p>
            </section>
          </div>
        )}

        {/* TAB 3: PRIVACY POLICY (GDPR & CCPA COMPLIANT) */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-wider bg-blue-950/40 px-3 py-1 rounded border border-blue-800/50">
                <Lock className="w-3.5 h-3.5" />
                <span>Data Privacy & Security Standards</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                Comprehensive Privacy Policy (GDPR / CCPA / CJIS Aligned)
              </h2>
              <div className="text-xs font-mono text-slate-500">
                Effective Date: November 1, 2026 · Document Reference: CG-PRIV-V2.4
              </div>
            </div>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-blue-400">1.</span> Information We Collect
              </h3>
              <p>
                To provide geospatial incident mapping and algorithmic asset recovery, CivicGuard processes the following categories of data:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-blue-300 font-bold block">Geospatial Telemetry</span>
                  <span className="text-slate-400">GPS coordinates (lat/lng) of incident locations and polygon jurisdictions.</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-blue-300 font-bold block">Asset Identifiers</span>
                  <span className="text-slate-400">Normalized Serial Numbers, VINs, IMEIs, brand names, and estimated values.</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-blue-300 font-bold block">Evidence Files</span>
                  <span className="text-slate-400">Photographic proof of ownership, receipt scans, and serial tags (magic-byte verified).</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-blue-300 font-bold block">Audited Telemetry</span>
                  <span className="text-slate-400">Immutable audit logs containing actor UUID, timestamp, and IP addresses.</span>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-blue-400">2.</span> Row-Level Security (RLS) & Zero Public PII Leaks
              </h3>
              <p>
                CivicGuard enforces cryptographic Row-Level Security (RLS) at the PostgreSQL database engine layer:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-400 text-xs">
                <li><strong>Public Anti-Fencing Queries:</strong> Completely scrubbed of citizen PII. Searches expose only confirmation of theft status and municipal contact precinct. Victim names, email addresses, phone numbers, and physical residential addresses are never returned.</li>
                <li><strong>Citizen Reports:</strong> Citizens can only query their own private dossiers unless an item is cleared by officers as an investigated public community safety alert.</li>
                <li><strong>Law Enforcement Oversight:</strong> Verified officers operate under audited session logging.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-blue-400">3.</span> Citizen Rights (CCPA / CPRA / GDPR Compliance)
              </h3>
              <p>
                Under the California Consumer Privacy Act (CCPA) and the General Data Protection Regulation (GDPR), citizens retain the following inalienable rights:
              </p>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Right to Know: Request a complete export of all incident records associated with your account.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Right to Deletion: Request permanent erasure of private records once an incident is resolved.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>We NEVER sell or monetize personal data to third-party data brokers or marketing registries.</span>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="text-blue-400">4.</span> Privacy Officer & Data Requests
              </h3>
              <p>
                To submit a verified data subject access request (DSAR) or inquire regarding CJIS safeguards, contact the CivicGuard Data Protection Officer at:
              </p>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                Email: <span className="text-emerald-400 font-bold">privacy@civicguard.govtech.internal</span> · Direct: (415) 555-0199
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Municipal Trust Footer */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>CivicGuard Municipal Architecture · Open-Source GovTech Standard</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Immutable Cryptographic Audit Logging Enabled
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl my-auto">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
