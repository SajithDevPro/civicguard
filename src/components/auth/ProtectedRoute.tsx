/**
 * CivicGuard Route & Access Protection Components
 * ProtectedRoute: Enforces general authentication
 * RoleGuard: Enforces GovTech Row-Level & View-Level Role-Based Access Control (RBAC)
 */
import React from 'react';
import { ShieldAlert, Lock, UserCheck, KeyRound, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { UserRole, UserProfile } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, fallback }) => {
  const { profile, loading, openAuthModal } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3 bg-slate-950/80 p-8 rounded-xl border border-slate-800">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          Verifying Cryptographic Credentials...
        </span>
      </div>
    );
  }

  if (!profile) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
          <KeyRound className="w-7 h-7 text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white tracking-tight">Authentication Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Please sign in with your citizen account or municipal officer credentials to view this tactical module.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAuthModal('signin')}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded border border-emerald-500 transition-colors shadow-lg shadow-emerald-950/50"
        >
          Sign In / Access Terminal
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children, fallback }) => {
  const { profile, availableUsers, switchPersona, openAuthModal } = useAuth();

  // If not authenticated, let ProtectedRoute handle it or show denied
  if (!profile) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
  }

  const isAuthorized = allowedRoles.includes(profile.role);

  if (isAuthorized) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Find demo officers or admins for quick testing elevation
  const officerPersona = availableUsers.find(
    (u) => u.role === UserRole.OFFICER || u.role === UserRole.ADMIN
  );

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 md:p-8 bg-slate-900/95 border border-red-900/50 rounded-xl shadow-2xl space-y-6">
      {/* GovTech Header Banner */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400 shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold tracking-wider rounded bg-red-500/20 text-red-400 border border-red-500/30">
              Clearance 403 Forbidden
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              POLICE_CODE_SEC_704.2
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Restricted Operational Dispatch Command Center
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Pursuant to the CivicGuard Law Enforcement Operational Protocol and database Row-Level Security (RLS) policies, this dispatch triage console is strictly restricted to sworn officers and precinct commanders.
          </p>
        </div>
      </div>

      {/* Clearance Comparison Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded font-mono text-xs">
        <div className="space-y-1">
          <span className="text-[10px] uppercase text-slate-500 tracking-wider">
            Current Active Identity
          </span>
          <div className="flex items-center gap-2 text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold">{profile.full_name}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Role: <span className="uppercase text-amber-300 font-bold">{profile.role}</span>
          </div>
        </div>

        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-[10px] uppercase text-slate-500 tracking-wider">
            Required Clearance Level
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {allowedRoles.map((role) => (
              <span
                key={role}
                className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-500/10 text-blue-400 border border-blue-500/30"
              >
                {role}
              </span>
            ))}
          </div>
          <div className="text-[11px] text-slate-400">
            Enforced by PostgreSQL RLS trigger
          </div>
        </div>
      </div>

      {/* GovTech Persona Quick Elevation Switcher for Sandbox Testing */}
      <div className="p-4 bg-slate-950/70 border border-slate-800 rounded space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Interactive Evaluation Mode (1-Click Switch)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Select verified personnel:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableUsers
            .filter((u) => allowedRoles.includes(u.role))
            .map((officer) => (
              <button
                key={officer.id}
                type="button"
                onClick={() => switchPersona(officer)}
                className="flex items-center justify-between p-2.5 rounded bg-slate-900 hover:bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/50 text-left transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 truncate">
                    {officer.full_name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {officer.badge_number ? `Badge #${officer.badge_number}` : officer.role.toUpperCase()}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                  Elevate →
                </span>
              </button>
            ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        <span className="text-[11px] text-slate-500 font-mono">
          Audit Reference: ERR_RBAC_UNAUTHORIZED_DISPATCH
        </span>
        <button
          type="button"
          onClick={() => openAuthModal('signin')}
          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
        >
          Sign In with Officer Credentials
        </button>
      </div>
    </div>
  );
};
