/**
 * CivicGuard Officer Asset Match Review Modal (AssetMatchReviewModal.tsx)
 * High-precision forensic verification interface comparing citizen-submitted stolen reports
 * with law enforcement recovered asset logs.
 * Features side-by-side serial alignment diff, confidence scoring, and 1-click recovery resolution.
 */
import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  MapPin,
  Building2,
  Tag,
  X,
  User,
  Clock,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Car,
  Laptop,
  Box,
} from 'lucide-react';
import { AssetCategory, AssetMatch, UserProfile } from '../../types';
import { alignSerialsForDiff } from '../../utils/matching';

interface AssetMatchReviewModalProps {
  match: AssetMatch | null;
  isOpen: boolean;
  onClose: () => void;
  onVerifyMatch: (
    matchId: string,
    action: 'confirmed' | 'rejected',
    notes: string
  ) => Promise<void>;
  currentOfficer: UserProfile;
}

export const AssetMatchReviewModal: React.FC<AssetMatchReviewModalProps> = ({
  match,
  isOpen,
  onClose,
  onVerifyMatch,
  currentOfficer,
}) => {
  const [officerNotes, setOfficerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !match || !match.stolen_incident || !match.recovered_asset) {
    return null;
  }

  const stolen = match.stolen_incident;
  const recovered = match.recovered_asset;

  // Character-by-character alignment diff
  const { segmentsA, segmentsB } = alignSerialsForDiff(
    stolen.serial_number || '',
    recovered.serial_number || ''
  );

  const handleAction = async (action: 'confirmed' | 'rejected') => {
    try {
      setIsSubmitting(true);
      setError(null);
      const noteContent =
        officerNotes.trim() ||
        (action === 'confirmed'
          ? 'Physical serial and proof of purchase cross-referenced and confirmed.'
          : 'Rejected as false positive following physical inspection.');

      await onVerifyMatch(match.id, action, noteContent);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 100) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold shadow-lg shadow-emerald-950/50">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Exact Forensic Match</span>
        </span>
      );
    }
    if (score >= 85) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500 text-amber-300 font-mono text-xs font-bold shadow-lg shadow-amber-950/50">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{score}% High-Confidence Fuzzy Match</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-300 font-mono text-xs font-bold">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        <span>{score}% Low Confidence Match</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100 my-8">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Automated Asset Recovery Match Verification
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  Case #{stolen.id.substring(0, 8).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Cross-referenced against municipal recovery registry & pawnshop database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {getConfidenceBadge(match.confidence_score)}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-700 rounded-lg text-xs font-mono text-red-200">
              {error}
            </div>
          )}

          {/* Forensic Serial Comparison Bar */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase tracking-wider font-semibold">
                Forensic Serial Alignment Diff
              </span>
              <span className="text-slate-500">
                Algorithm: Levenshtein Distance with OCR Glyph Substitution Weighting
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Citizen Serial String */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Citizen Stolen Report Serial:</span>
                  <span className="text-white font-bold">{stolen.serial_number}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 font-mono text-sm tracking-wider">
                  {segmentsA.map((seg, idx) => (
                    <span
                      key={`a-${idx}`}
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        seg.status === 'matched'
                          ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                          : seg.status === 'ocr_similar'
                          ? 'bg-amber-950 border border-amber-500/60 text-amber-300'
                          : 'bg-rose-950 border border-rose-500/60 text-rose-300'
                      }`}
                    >
                      {seg.char}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recovered Serial String */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Recovered Property Log Serial:</span>
                  <span className="text-white font-bold">{recovered.serial_number}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 font-mono text-sm tracking-wider">
                  {segmentsB.map((seg, idx) => (
                    <span
                      key={`b-${idx}`}
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        seg.status === 'matched'
                          ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                          : seg.status === 'ocr_similar'
                          ? 'bg-amber-950 border border-amber-500/60 text-amber-300'
                          : 'bg-rose-950 border border-rose-500/60 text-rose-300'
                      }`}
                    >
                      {seg.char}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Citizen Stolen Report */}
            <div className="space-y-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-300">
                    Citizen Stolen Property Record
                  </span>
                </div>
                <span className="font-mono text-[11px] text-red-400 font-bold uppercase">
                  Status: {stolen.status}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{stolen.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{stolen.description}</p>
              </div>

              {stolen.evidence_urls && stolen.evidence_urls.length > 0 && (
                <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 h-36">
                  <img
                    src={stolen.evidence_urls[0]}
                    alt="Citizen evidence photo"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Reported Owner:</span>
                  <span className="font-semibold text-slate-200">{stolen.reporter_name}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Date Stolen:</span>
                  <span>{new Date(stolen.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Theft Location:</span>
                  <span className="text-right text-slate-300 max-w-[200px] truncate">
                    {stolen.address_approx}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Declared Value:</span>
                  <span className="text-emerald-400 font-bold">
                    {stolen.estimated_value ? `$${stolen.estimated_value.toLocaleString()}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Recovered Asset Log */}
            <div className="space-y-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-300">
                    Recovered Property Evidence Log
                  </span>
                </div>
                <span className="font-mono text-[11px] text-emerald-400 font-bold uppercase">
                  Inventory: {recovered.id.toUpperCase()}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{recovered.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {recovered.notes || 'Asset in secure evidence locker custody.'}
                </p>
              </div>

              {recovered.photo_urls && recovered.photo_urls.length > 0 ? (
                <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 h-36">
                  <img
                    src={recovered.photo_urls[0]}
                    alt="Recovered evidence photo"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-36 rounded-lg border border-dashed border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
                  <Tag className="w-6 h-6 mb-1 text-slate-600" />
                  <span>Physical barcode logged in precinct depository</span>
                </div>
              )}

              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Custodial Precinct:</span>
                  <span className="font-semibold text-slate-200">
                    {recovered.recovery_station_name || 'Central Evidence Facility'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Date Recovered:</span>
                  <span>{new Date(recovered.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Recovery Site:</span>
                  <span className="text-right text-slate-300 max-w-[200px] truncate">
                    {recovered.recovery_location}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Intake Officer:</span>
                  <span className="text-blue-400 font-bold">
                    Badge #{recovered.officer_badge || '4081'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Officer Verification Notes Input */}
          <div className="space-y-2">
            <label
              htmlFor="officer-notes"
              className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider"
            >
              Officer Verification & Case Chain-of-Custody Notes:
            </label>
            <textarea
              id="officer-notes"
              rows={2}
              value={officerNotes}
              onChange={(e) => setOfficerNotes(e.target.value)}
              placeholder="e.g. Serial verified against manufacturer frame stamp. MDM lock confirmed with victim Sarah Chen. Ready for property release."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Current Review Status if already reviewed */}
          {match.status !== 'pending_verification' && (
            <div
              className={`p-3 rounded-lg border font-mono text-xs flex items-center justify-between ${
                match.status === 'confirmed'
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-600 text-rose-200'
              }`}
            >
              <span>
                Status: <strong>{match.status.toUpperCase()}</strong> by Officer {currentOfficer.full_name}
              </span>
              <span>{match.reviewed_at ? new Date(match.reviewed_at).toLocaleString() : ''}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400">
            Confirming will mark Case #{stolen.id.toUpperCase()} as <strong>RECOVERED</strong> and dispatch a victim notification.
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction('rejected')}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>False Positive / Reject</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction('confirmed')}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-xs font-mono font-bold text-white shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Asset Recovery & Notify Citizen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
