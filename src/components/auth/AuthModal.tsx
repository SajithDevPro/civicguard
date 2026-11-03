/**
 * CivicGuard Authentication & Onboarding Modal (AuthModal.tsx)
 * Enterprise GovTech authentication modal supporting Citizen and Officer roles,
 * municipal badge verification, assigned precinct station selection, and
 * 1-click persona testing shortcuts.
 */
import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  User,
  KeyRound,
  Building2,
  BadgeCheck,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Phone,
  Mail,
  Lock,
} from 'lucide-react';
import { useAuth, SignUpParams } from '../../providers/AuthProvider';
import { UserRole, UserProfile } from '../../types';
import { SEED_POLICE_STATIONS, SEED_USERS } from '../../data/seedData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const { signIn, signUp, switchPersona, profile, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up form state
  const [signUpRole, setSignUpRole] = useState<UserRole>(UserRole.CITIZEN);
  const [fullName, setFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [stationId, setStationId] = useState(SEED_POLICE_STATIONS[0].id);

  // Feedback state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signInEmail.trim()) {
      setErrorMessage('Please provide your registered email address.');
      return;
    }

    setSubmitting(true);
    const { error } = await signIn(signInEmail.trim(), signInPassword);
    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message || 'Authentication failed. Please verify credentials.');
    } else {
      setSuccessMessage('Authentication verified. Welcome to CivicGuard.');
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setErrorMessage('Please provide a valid official email address.');
      return;
    }

    if (signUpRole === UserRole.OFFICER) {
      if (!badgeNumber.trim() || badgeNumber.trim().length < 3) {
        setErrorMessage('Police officers must supply a valid municipal badge ID (e.g. CG-4081).');
        return;
      }
    }

    setSubmitting(true);
    const params: SignUpParams = {
      fullName: fullName.trim(),
      email: signUpEmail.trim(),
      password: signUpPassword || undefined,
      phone: phone.trim() || undefined,
      role: signUpRole,
      badgeNumber: signUpRole === UserRole.OFFICER ? badgeNumber.trim().toUpperCase() : undefined,
      stationId: signUpRole === UserRole.OFFICER ? stationId : undefined,
    };

    const { error } = await signUp(params);
    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message || 'Registration failed. Please try again.');
    } else {
      setSuccessMessage('Account provisioned successfully.');
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  const handleQuickPersonaSelect = (persona: UserProfile) => {
    switchPersona(persona);
    setSuccessMessage(`Switched active session to ${persona.full_name} (${persona.role.toUpperCase()})`);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                CivicGuard Security Access Gateway
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Identity & Access Management (IAM)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 pt-3">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              mode === 'signin'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              mode === 'signup'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Register / Onboard
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Banners */}
          {errorMessage && (
            <div className="p-3 bg-red-950/70 border border-red-800/80 rounded flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-800/80 rounded flex items-start gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SIGN IN TAB */}
          {mode === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="officer@police.gov or citizen@domain.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300">
                    Password / Token
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    (Optional in demo mode)
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded border border-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Authorize Session</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* REGISTER / ONBOARD TAB */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              {/* Role Toggle Selector */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Select Clearance Profile
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSignUpRole(UserRole.CITIZEN)}
                    className={`p-3 rounded border text-left transition-all ${
                      signUpRole === UserRole.CITIZEN
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Public Citizen</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Report lost or stolen property and monitor community safety zones.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignUpRole(UserRole.OFFICER)}
                    className={`p-3 rounded border text-left transition-all ${
                      signUpRole === UserRole.OFFICER
                        ? 'bg-blue-950/40 border-blue-500 text-blue-300 ring-1 ring-blue-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                      <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>Law Enforcement</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Triage incident queues, verify serial recoveries, and manage precincts.
                    </p>
                  </button>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="name@domain.gov"
                    className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Conditional Officer Fields */}
              {signUpRole === UserRole.OFFICER && (
                <div className="p-3.5 bg-blue-950/20 border border-blue-900/60 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                    <BadgeCheck className="w-4 h-4 text-blue-400" />
                    <span>Officer Municipal Verification</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-1">
                        Municipal Badge ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={badgeNumber}
                        onChange={(e) => setBadgeNumber(e.target.value)}
                        placeholder="e.g. CG-5420"
                        className="w-full bg-slate-950 border border-blue-800/80 rounded py-2 px-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-1">
                        Assigned Precinct Station
                      </label>
                      <select
                        value={stationId}
                        onChange={(e) => setStationId(e.target.value)}
                        className="w-full bg-slate-950 border border-blue-800/80 rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-400"
                      >
                        {SEED_POLICE_STATIONS.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.code} - {station.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (415) 555-0199"
                    className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded border border-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete Onboarding & Provision Profile</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick 1-Click Evaluation Personas */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Demo Personas (1-Click Instant Sign-In)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">No password required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SEED_USERS.map((persona) => {
                const isCurrent = profile?.id === persona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleQuickPersonaSelect(persona)}
                    className={`flex items-center justify-between p-2.5 rounded border text-left transition-all ${
                      isCurrent
                        ? 'bg-slate-900 border-emerald-500/80 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            persona.role === UserRole.OFFICER
                              ? 'bg-blue-400'
                              : persona.role === UserRole.ADMIN
                              ? 'bg-purple-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {persona.full_name}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        {persona.role.toUpperCase()}
                        {persona.badge_number ? ` · #${persona.badge_number}` : ''}
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                        Active
                      </span>
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-slate-900/40 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>RLS Protocol: STRICT_RBAC_v2</span>
          <span>Municipal Cloud GovTech</span>
        </div>
      </div>
    </div>
  );
};
