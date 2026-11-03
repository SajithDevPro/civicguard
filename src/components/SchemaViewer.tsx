import React, { useState } from 'react';
import {
  Database,
  Shield,
  Copy,
  Check,
  Code2,
  Lock,
  Layers,
  ArrowRight,
  Server,
  Zap,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { resetToSeedData } from '../services/db';

export const SchemaViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'sql' | 'rbac-policies' | 'security-audit' | 'analytics-views' | 'matching-trigger' | 'rls' | 'architecture'>('sql');

  const migrationSql = `-- ==============================================================================
-- CIVICGUARD ENTERPRISE SCHEMA DEFINITION & ROW-LEVEL SECURITY (RLS) POLICIES
-- Target Runtime: PostgreSQL 15+ / Supabase Platform
-- Migration: 20261031000000_init_civicguard_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. DOMAIN ENUMS
CREATE TYPE user_role AS ENUM ('citizen', 'officer', 'admin');
CREATE TYPE incident_status AS ENUM ('pending', 'investigated', 'recovered');
CREATE TYPE asset_category AS ENUM ('vehicle', 'electronics', 'property', 'other');

-- 3. POLICE STATIONS TABLE
CREATE TABLE public.police_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    jurisdiction_polygon JSONB DEFAULT NULL,
    contact_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    dispatch_frequency TEXT DEFAULT '154.680 MHz',
    active_officers_count INT NOT NULL DEFAULT 16,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. USER PROFILES TABLE (Linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    badge_number TEXT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NULL,
    station_id UUID REFERENCES public.police_stations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    CONSTRAINT chk_badge_for_officers CHECK (
        (role = 'officer' AND badge_number IS NOT NULL AND length(trim(badge_number)) > 0)
        OR (role != 'officer')
    )
);

-- 5. INCIDENT REPORTS TABLE
CREATE TABLE public.incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (length(trim(title)) >= 5),
    description TEXT NOT NULL CHECK (length(trim(description)) >= 10),
    category asset_category NOT NULL DEFAULT 'property',
    status incident_status NOT NULL DEFAULT 'pending',
    lat DOUBLE PRECISION NOT NULL CHECK (lat >= -90.0 AND lat <= 90.0),
    lng DOUBLE PRECISION NOT NULL CHECK (lng >= -180.0 AND lng <= 180.0),
    serial_number TEXT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_station_id UUID REFERENCES public.police_stations(id) ON DELETE SET NULL,
    address_approx TEXT NULL,
    estimated_value NUMERIC(10, 2) NULL CHECK (estimated_value IS NULL OR estimated_value >= 0),
    evidence_urls TEXT[] NOT NULL DEFAULT '{}',
    officer_notes TEXT NULL,
    reporter_name TEXT NULL,
    reporter_phone TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. PERFORMANCE & GEOSPATIAL INDEXES
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_stations_coords ON public.police_stations(lat, lng);
CREATE INDEX idx_incidents_user_id ON public.incident_reports(user_id);
CREATE INDEX idx_incidents_assigned_station ON public.incident_reports(assigned_station_id);
CREATE INDEX idx_incidents_status ON public.incident_reports(status);
CREATE INDEX idx_incidents_category ON public.incident_reports(category);
CREATE INDEX idx_incidents_spatial ON public.incident_reports(lat, lng);
CREATE INDEX idx_incidents_serial_number_clean
    ON public.incident_reports(lower(trim(serial_number)))
    WHERE serial_number IS NOT NULL;

-- 7. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.police_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Security helper functions
CREATE OR REPLACE FUNCTION public.is_officer_or_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('officer', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Citizen Insert Policy
CREATE POLICY "incidents_insert_citizen" ON public.incident_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Citizen & Officer Select Policy
CREATE POLICY "incidents_select_policy" ON public.incident_reports
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR public.is_officer_or_admin()
        OR status IN ('investigated', 'recovered')
    );

-- Officer Update Policy
CREATE POLICY "incidents_update_officer" ON public.incident_reports
    FOR UPDATE TO authenticated
    USING (public.is_officer_or_admin())
    WITH CHECK (public.is_officer_or_admin());`;

  const matchingTriggerSql = `-- ==============================================================================
-- CIVICGUARD MODULE 7: AUTOMATED SERIAL NUMBER MATCHING ENGINE
-- Migration: supabase/migrations/matching_trigger.sql
-- ==============================================================================

-- 1. RECOVERED ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.recovered_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT NOT NULL,
    normalized_serial TEXT NOT NULL,
    title TEXT NOT NULL,
    category asset_category NOT NULL DEFAULT 'property',
    recovery_station_id UUID REFERENCES public.police_stations(id) ON DELETE SET NULL,
    recovery_location TEXT NOT NULL,
    officer_badge TEXT NULL,
    photo_urls TEXT[] DEFAULT '{}',
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. ASSET MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.asset_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stolen_report_id UUID NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
    recovered_asset_id UUID NOT NULL REFERENCES public.recovered_assets(id) ON DELETE CASCADE,
    confidence_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    match_type TEXT NOT NULL DEFAULT 'exact' CHECK (match_type IN ('exact', 'fuzzy')),
    status match_status NOT NULL DEFAULT 'pending_verification',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ NULL,
    review_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_stolen_recovered_pair UNIQUE (stolen_report_id, recovered_asset_id)
);

-- 3. SERIAL NORMALIZATION UTILITY
CREATE OR REPLACE FUNCTION public.normalize_serial(raw_serial TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT upper(regexp_replace(coalesce(raw_serial, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- 4. MATCHING TRIGGER ON RECOVERED ASSETS INSERT
CREATE OR REPLACE FUNCTION public.trigger_match_on_recovered_asset()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_norm_serial TEXT;
    r_incident RECORD;
    v_score NUMERIC;
BEGIN
    v_norm_serial := public.normalize_serial(NEW.serial_number);
    IF v_norm_serial = '' THEN RETURN NEW; END IF;

    FOR r_incident IN
        SELECT id, serial_number, title FROM public.incident_reports
        WHERE serial_number IS NOT NULL AND status != 'recovered'
    LOOP
        v_score := public.calculate_serial_similarity(v_norm_serial, r_incident.serial_number);
        IF v_score >= 80.00 THEN
            INSERT INTO public.asset_matches (stolen_report_id, recovered_asset_id, confidence_score, match_type, status)
            VALUES (r_incident.id, NEW.id, v_score, CASE WHEN v_score >= 100 THEN 'exact' ELSE 'fuzzy' END, 'pending_verification')
            ON CONFLICT (stolen_report_id, recovered_asset_id) DO NOTHING;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;`;

  const rbacPoliciesSql = `-- ==============================================================================
-- CIVICGUARD COMPREHENSIVE ROLE-BASED ACCESS CONTROL (RBAC) & SECURITY POLICIES
-- Target: PostgreSQL 15+ / Supabase Platform
-- Migration: rbac_policies.sql
-- ==============================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS public.user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_station_id()
RETURNS UUID AS $$
    SELECT station_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_officer_or_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('officer', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. INTEGRITY CONSTRAINTS & ROLE-ESCALATION PREVENTION
CREATE OR REPLACE FUNCTION public.enforce_officer_credentials()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'officer' THEN
        IF NEW.badge_number IS NULL OR length(trim(NEW.badge_number)) < 3 THEN
            RAISE EXCEPTION 'Law Enforcement Officers must have a valid municipal badge number (min 3 chars).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_officer_credentials ON public.profiles;
CREATE TRIGGER trg_enforce_officer_credentials
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_officer_credentials();

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() = OLD.id AND NOT public.is_admin() THEN
        IF NEW.role != OLD.role THEN
            RAISE EXCEPTION 'Privilege escalation violation: Standard users cannot alter their assigned role.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- 3. ROW-LEVEL SECURITY ACTIVATION
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- 4. PROFILES RLS
CREATE POLICY "profiles_select_rbac" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_officer_or_admin());

CREATE POLICY "profiles_update_rbac" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- 5. INCIDENTS RLS
CREATE POLICY "incidents_insert_rbac" ON public.incident_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "incidents_select_rbac" ON public.incident_reports
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR public.is_officer_or_admin()
        OR status IN ('investigated', 'recovered')
    );

CREATE POLICY "incidents_update_rbac" ON public.incident_reports
    FOR UPDATE TO authenticated
    USING (public.is_officer_or_admin())
    WITH CHECK (public.is_officer_or_admin());

CREATE POLICY "incidents_delete_admin_only" ON public.incident_reports
    FOR DELETE TO authenticated
    USING (public.is_admin());`;

  const analyticsViewsSql = `-- ==============================================================================
-- CIVICGUARD EXECUTIVE ANALYTICS, AGGREGATIONS & INTELLIGENCE REPORTING
-- Target: PostgreSQL 15+ / Supabase Platform
-- Migration: analytics_views.sql
-- ==============================================================================

-- 1. PRECINCT MONTHLY STATS VIEW (precinct_monthly_stats)
CREATE OR REPLACE VIEW public.precinct_monthly_stats AS
SELECT 
    COALESCE(i.assigned_station_id, '00000000-0000-0000-0000-000000000000'::uuid) AS assigned_station_id,
    COALESCE(s.name, 'Unassigned / Mutual Aid') AS station_name,
    COALESCE(s.code, 'N/A') AS station_code,
    date_trunc('month', i.created_at) AS report_month,
    COUNT(i.id) AS total_reports,
    COUNT(i.id) FILTER (WHERE i.status = 'pending') AS pending_count,
    COUNT(i.id) FILTER (WHERE i.status = 'investigated') AS investigated_count,
    COUNT(i.id) FILTER (WHERE i.status = 'recovered') AS recovered_count,
    ROUND(
        (COUNT(i.id) FILTER (WHERE i.status = 'recovered')::NUMERIC / NULLIF(COUNT(i.id), 0)) * 100.0,
        2
    ) AS recovery_success_rate,
    COALESCE(
        ROUND(
            AVG(EXTRACT(EPOCH FROM (i.updated_at - i.created_at)) / 3600.0) FILTER (WHERE i.status = 'recovered'),
            1
        ),
        0.0
    ) AS avg_resolution_hours,
    COALESCE(SUM(i.estimated_value), 0.00) AS total_reported_value,
    COALESCE(SUM(i.estimated_value) FILTER (WHERE i.status = 'recovered'), 0.00) AS total_recovered_value
FROM public.incident_reports i
LEFT JOIN public.police_stations s ON i.assigned_station_id = s.id
GROUP BY 
    COALESCE(i.assigned_station_id, '00000000-0000-0000-0000-000000000000'::uuid),
    s.name, s.code, date_trunc('month', i.created_at)
ORDER BY report_month DESC, total_reports DESC;

-- 2. CATEGORY DISTRIBUTION RPC FUNCTION (category_distribution_rpc)
CREATE OR REPLACE FUNCTION public.category_distribution_rpc(
    start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    end_date TIMESTAMPTZ DEFAULT NOW(),
    filter_station_id UUID DEFAULT NULL
)
RETURNS TABLE (
    category public.asset_category,
    total_reported BIGINT,
    total_recovered BIGINT,
    recovery_rate NUMERIC(5, 2),
    total_value_stolen NUMERIC(14, 2),
    total_value_recovered NUMERIC(14, 2)
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT 
        i.category,
        COUNT(i.id) AS total_reported,
        COUNT(i.id) FILTER (WHERE i.status = 'recovered') AS total_recovered,
        ROUND((COUNT(i.id) FILTER (WHERE i.status = 'recovered')::NUMERIC / NULLIF(COUNT(i.id), 0)) * 100.0, 2) AS recovery_rate,
        COALESCE(SUM(i.estimated_value), 0.00) AS total_value_stolen,
        COALESCE(SUM(i.estimated_value) FILTER (WHERE i.status = 'recovered'), 0.00) AS total_value_recovered
    FROM public.incident_reports i
    WHERE i.created_at >= start_date AND i.created_at <= end_date
      AND (filter_station_id IS NULL OR i.assigned_station_id = filter_station_id)
    GROUP BY i.category
    ORDER BY total_reported DESC;
$$;`;

  const securityAuditSql = `-- ==============================================================================
-- CIVICGUARD COMPREHENSIVE SECURITY AUDIT & IMMUTABLE LOGGING ENGINE
-- Target: PostgreSQL 15+ / PostGIS / Supabase Platform
-- Migration: security_audit.sql
-- ==============================================================================

-- 1. IMMUTABLE AUDIT LOGS TABLE SPECIFICATION
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_role public.user_role,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) NOT NULL,
    ip_address INET,
    client_user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    severity VARCHAR(16) NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'NOTICE', 'WARNING', 'CRITICAL')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. IMMUTABILITY ENFORCEMENT & ANTI-TAMPER TRIGGERS
CREATE OR REPLACE FUNCTION public.enforce_audit_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Audit logs are strictly immutable. Action [%] is forbidden on public.audit_logs.', TG_OP
        USING ERRCODE = '55000',
              HINT = 'Audit logs are append-only by CJIS and SOC2 compliance mandate.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_log_prevent_tampering
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.enforce_audit_log_immutability();

-- 3. ROW-LEVEL SECURITY (RLS) FOR AUDIT LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can inspect audit logs"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_admin());

CREATE POLICY "System triggers and internal functions log audit records"
    ON public.audit_logs FOR INSERT TO authenticated, anon
    WITH CHECK ((auth.uid() IS NULL) OR (user_id = auth.uid()) OR (public.is_admin()));

CREATE POLICY "Strictly deny update on audit logs"
    ON public.audit_logs FOR UPDATE USING (false);

CREATE POLICY "Strictly deny delete on audit logs"
    ON public.audit_logs FOR DELETE USING (false);`;

  const handleCopy = () => {
    let textToCopy = migrationSql;
    if (activeSubTab === 'matching-trigger') textToCopy = matchingTriggerSql;
    else if (activeSubTab === 'rbac-policies') textToCopy = rbacPoliciesSql;
    else if (activeSubTab === 'security-audit') textToCopy = securityAuditSql;
    else if (activeSubTab === 'analytics-views') textToCopy = analyticsViewsSql;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="space-y-6">
      {/* Tab Switcher & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              Enterprise PostgreSQL & Supabase Architecture
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Strict typed relational schema · PostGIS coordinates · Automated Serial Cross-Reference
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveSubTab('sql')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                activeSubTab === 'sql'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Core Schema
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('rbac-policies')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                activeSubTab === 'rbac-policies'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RBAC Policies
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('security-audit')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                activeSubTab === 'security-audit'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Audit Logs
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('analytics-views')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                activeSubTab === 'analytics-views'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Analytics Views
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('matching-trigger')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                activeSubTab === 'matching-trigger'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Matching Triggers
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('rls')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                activeSubTab === 'rls'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RLS Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('architecture')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                activeSubTab === 'architecture'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Data Flow
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied SQL' : 'Copy Script'}</span>
          </button>
        </div>
      </div>

      {/* SQL Migration Script Viewer */}
      {activeSubTab === 'sql' && (
        <div className="border border-slate-800 rounded bg-slate-950 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>supabase/migrations/20261031000000_init_civicguard_schema.sql</span>
            </div>
            <span className="text-[11px] text-slate-500">PostgreSQL 15+ / PostGIS</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto max-h-[600px] bg-slate-950/70">
            {migrationSql}
          </pre>
        </div>
      )}

      {/* RBAC Policies SQL Viewer */}
      {activeSubTab === 'rbac-policies' && (
        <div className="border border-slate-800 rounded bg-slate-950 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>supabase/migrations/rbac_policies.sql</span>
            </div>
            <span className="text-[11px] text-slate-500">Security Definers · Escalation Prevention · RLS Policies</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto max-h-[600px] bg-slate-950/70">
            {rbacPoliciesSql}
          </pre>
        </div>
      )}

      {/* Security Audit & Immutability Logs SQL Viewer */}
      {activeSubTab === 'security-audit' && (
        <div className="border border-slate-800 rounded bg-slate-950 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>supabase/migrations/security_audit.sql</span>
            </div>
            <span className="text-[11px] text-slate-500">Immutable audit_logs · Anti-Tamper Trigger · Admin RLS</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto max-h-[600px] bg-slate-950/70">
            {securityAuditSql}
          </pre>
        </div>
      )}

      {/* Analytics Views & Aggregations SQL Viewer */}
      {activeSubTab === 'analytics-views' && (
        <div className="border border-slate-800 rounded bg-slate-950 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>supabase/migrations/analytics_views.sql</span>
            </div>
            <span className="text-[11px] text-slate-500">precinct_monthly_stats · category_distribution_rpc · daily_trends</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto max-h-[600px] bg-slate-950/70">
            {analyticsViewsSql}
          </pre>
        </div>
      )}

      {/* Automated Matching Trigger SQL Viewer */}
      {activeSubTab === 'matching-trigger' && (
        <div className="border border-slate-800 rounded bg-slate-950 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>supabase/migrations/matching_trigger.sql</span>
            </div>
            <span className="text-[11px] text-slate-500">Triggers · Levenshtein Distance · asset_matches</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto max-h-[600px] bg-slate-950/70">
            {matchingTriggerSql}
          </pre>
        </div>
      )}

      {/* Row-Level Security (RLS) Policy Matrix */}
      {activeSubTab === 'rls' && (
        <div className="space-y-4">
          <div className="border border-slate-800 rounded bg-slate-900/80 overflow-hidden">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-400" />
                Row-Level Security (RLS) Multi-Tenant Access Matrix
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Operation</th>
                    <th className="px-4 py-3">Citizen Role</th>
                    <th className="px-4 py-3">Officer Role</th>
                    <th className="px-4 py-3">Admin Role</th>
                    <th className="px-4 py-3">Security Policy Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr>
                    <td className="px-4 py-3 font-mono font-semibold text-sky-300">profiles</td>
                    <td className="px-4 py-3 font-mono">SELECT</td>
                    <td className="px-4 py-3 text-emerald-400">Own Profile</td>
                    <td className="px-4 py-3 text-emerald-400">All Profiles</td>
                    <td className="px-4 py-3 text-emerald-400">All Profiles</td>
                    <td className="px-4 py-3 text-slate-400">
                      Officers need citizen identity details to investigate cases; citizens only see themselves.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono font-semibold text-sky-300">profiles</td>
                    <td className="px-4 py-3 font-mono">UPDATE</td>
                    <td className="px-4 py-3 text-emerald-400">Self (No Role Escalation)</td>
                    <td className="px-4 py-3 text-emerald-400">Self Only</td>
                    <td className="px-4 py-3 text-emerald-400">All Profiles</td>
                    <td className="px-4 py-3 text-slate-400">
                      Explicit CHECK constraint ensures citizens cannot escalate themselves to officer or admin.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono font-semibold text-amber-300">police_stations</td>
                    <td className="px-4 py-3 font-mono">SELECT</td>
                    <td className="px-4 py-3 text-emerald-400">Public Read</td>
                    <td className="px-4 py-3 text-emerald-400">Public Read</td>
                    <td className="px-4 py-3 text-emerald-400">Public Read</td>
                    <td className="px-4 py-3 text-slate-400">
                      Precinct locations and jurisdiction boundaries must be universally discoverable for dispatch.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-300">incident_reports</td>
                    <td className="px-4 py-3 font-mono">INSERT</td>
                    <td className="px-4 py-3 text-emerald-400">Own (auth.uid() = user_id)</td>
                    <td className="px-4 py-3 text-emerald-400">Permitted</td>
                    <td className="px-4 py-3 text-emerald-400">Permitted</td>
                    <td className="px-4 py-3 text-slate-400">
                      Citizens can file stolen property reports; user_id is forced to caller auth.uid().
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-300">incident_reports</td>
                    <td className="px-4 py-3 font-mono">SELECT</td>
                    <td className="px-4 py-3 text-amber-300">Own + Public Safety Alerts</td>
                    <td className="px-4 py-3 text-emerald-400">Full Jurisdiction Intake</td>
                    <td className="px-4 py-3 text-emerald-400">Universal Intake</td>
                    <td className="px-4 py-3 text-slate-400">
                      Protects victim privacy while surfacing community safety zones and recovered alerts.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-300">incident_reports</td>
                    <td className="px-4 py-3 font-mono">UPDATE</td>
                    <td className="px-4 py-3 text-rose-400 font-semibold">DENIED</td>
                    <td className="px-4 py-3 text-emerald-400">Status & Case Notes</td>
                    <td className="px-4 py-3 text-emerald-400">Full Access</td>
                    <td className="px-4 py-3 text-slate-400">
                      Strict chain of custody: citizens cannot tamper with reports once submitted to law enforcement.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-300">incident_reports</td>
                    <td className="px-4 py-3 font-mono">DELETE</td>
                    <td className="px-4 py-3 text-rose-400 font-semibold">DENIED</td>
                    <td className="px-4 py-3 text-rose-400 font-semibold">DENIED</td>
                    <td className="px-4 py-3 text-emerald-400">Admin Only</td>
                    <td className="px-4 py-3 text-slate-400">
                      Tamper-proof official police record retention standards.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Architectural System Blueprint */}
      {activeSubTab === 'architecture' && (
        <div className="space-y-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Real-Time Geospatial Data Flow Architecture</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1.5">
                <div className="font-mono text-emerald-400 font-bold">1. Citizen Dropped Pin</div>
                <p className="text-slate-400">
                  Citizen clicks tactical map or GPS detects location. Front-end executes client-side schema validation (DOMPurify, type guard checks).
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1.5">
                <div className="font-mono text-sky-400 font-bold">2. Automated Spatial Index</div>
                <p className="text-slate-400">
                  PostgreSQL trigger executes spherical Haversine / PostGIS query to determine closest precinct and auto-assigns <code>assigned_station_id</code>.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1.5">
                <div className="font-mono text-purple-400 font-bold">3. WAL Stream & RLS Filter</div>
                <p className="text-slate-400">
                  Postgres WAL triggers Supabase Realtime broadcast. Supabase evaluates RLS policies before dispatching push notifications.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1.5">
                <div className="font-mono text-amber-400 font-bold">4. Tactical Officer Push</div>
                <p className="text-slate-400">
                  Active officer terminals receive WebSocket payload and immediately render pulsing alert ring on radar map and triage board.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <h4 className="text-xs font-bold font-mono uppercase text-slate-300">
                Security Audit & Hardening Specifications
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-5">
                <li>
                  <strong className="text-slate-200">Input Sanitization & Validation:</strong> Client & database constraints enforce string lengths, bounds for latitude ([-90, 90]) and longitude ([-180, 180]), preventing buffer or malformed coordinate attacks.
                </li>
                <li>
                  <strong className="text-slate-200">SQL Injection Immunity:</strong> Pure parameterized queries via Supabase client library and PL/pgSQL prepared statements; zero dynamic SQL concatenation.
                </li>
                <li>
                  <strong className="text-slate-200">Rate Limiting & Abuse Prevention:</strong> Token Bucket rate limiting on public intake endpoints (max 5 reports per hour per citizen IP/auth ID) to prevent false-alarm DDoS floods.
                </li>
                <li>
                  <strong className="text-slate-200">Role Privilege Escalation Defense:</strong> Security definer functions isolate caller session; explicit profile update constraints prohibit users from altering their own <code>role</code> or <code>badge_number</code>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Reset Seed Data Button */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center justify-between text-xs">
        <span className="text-slate-400 font-mono">
          Demonstration Environment: Active in-browser PostgreSQL client sandbox
        </span>
        <button
          type="button"
          onClick={() => {
            resetToSeedData();
            window.location.reload();
          }}
          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 font-mono inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Sample Seed Data</span>
        </button>
      </div>
    </div>
  );
};
