-- ==============================================================================
-- CIVICGUARD COMPREHENSIVE ROLE-BASED ACCESS CONTROL (RBAC) & SECURITY POLICIES
-- Target: PostgreSQL 15+ / Supabase Platform
-- Migration: rbac_policies.sql
-- ==============================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- Securely extract caller credentials without recursive RLS trigger loops

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

-- 2. INTEGRITY CONSTRAINTS & ROLE-ESCALATION PREVENTION TRIGGERS

-- 2.1 Enforce badge number & station assignment for Law Enforcement Officers
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

-- 2.2 Prevent Self-Escalation to Officer or Admin
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- If caller is modifying their own profile and is not an Admin
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

-- 3. ROW-LEVEL SECURITY ACTIVATION ON ALL CORE TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_matches') THEN
        ALTER TABLE public.asset_matches ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ==============================================================================
-- 4. GRANULAR POLICIES: PROFILES TABLE
-- ==============================================================================

-- SELECT: Citizens see own profile; Officers & Admins see all for incident triage & verification
DROP POLICY IF EXISTS "profiles_select_rbac" ON public.profiles;
CREATE POLICY "profiles_select_rbac"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id
        OR public.is_officer_or_admin()
    );

-- UPDATE: Users can modify their own details; Admins can modify any profile
DROP POLICY IF EXISTS "profiles_update_rbac" ON public.profiles;
CREATE POLICY "profiles_update_rbac"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id
        OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = id
        OR public.is_admin()
    );

-- ==============================================================================
-- 5. GRANULAR POLICIES: POLICE STATIONS TABLE
-- ==============================================================================

-- SELECT: Public precinct lookup for nearest reporting and dispatch routing
DROP POLICY IF EXISTS "stations_select_public" ON public.police_stations;
CREATE POLICY "stations_select_public"
    ON public.police_stations
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- ALL: Only Admins can create or modify police station infrastructure
DROP POLICY IF EXISTS "stations_modify_admin" ON public.police_stations;
CREATE POLICY "stations_modify_admin"
    ON public.police_stations
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==============================================================================
-- 6. GRANULAR POLICIES: INCIDENT REPORTS TABLE
-- ==============================================================================

-- INSERT: Citizens can report incidents (user_id enforced to authenticated caller)
DROP POLICY IF EXISTS "incidents_insert_rbac" ON public.incident_reports;
CREATE POLICY "incidents_insert_rbac"
    ON public.incident_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );

-- SELECT:
-- 1. Citizens see reports they authored
-- 2. Citizens see public safety alerts (investigated or recovered items for community awareness)
-- 3. Officers and Admins see full tactical queue
DROP POLICY IF EXISTS "incidents_select_rbac" ON public.incident_reports;
CREATE POLICY "incidents_select_rbac"
    ON public.incident_reports
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.is_officer_or_admin()
        OR status IN ('investigated', 'recovered')
    );

-- UPDATE:
-- Only Officers and Admins can update status, append investigation notes, or assign precincts
DROP POLICY IF EXISTS "incidents_update_rbac" ON public.incident_reports;
CREATE POLICY "incidents_update_rbac"
    ON public.incident_reports
    FOR UPDATE
    TO authenticated
    USING (
        public.is_officer_or_admin()
    )
    WITH CHECK (
        public.is_officer_or_admin()
    );

-- DELETE:
-- Strict chain of custody: Only Admins may expunge records for retention compliance
DROP POLICY IF EXISTS "incidents_delete_admin_only" ON public.incident_reports;
CREATE POLICY "incidents_delete_admin_only"
    ON public.incident_reports
    FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
    );

-- ==============================================================================
-- 7. GRANULAR POLICIES: NOTIFICATIONS TABLE
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DROP POLICY IF EXISTS "notifications_select_user" ON public.notifications;
        CREATE POLICY "notifications_select_user"
            ON public.notifications
            FOR SELECT
            TO authenticated
            USING (
                auth.uid() = user_id
                OR public.is_admin()
            );

        DROP POLICY IF EXISTS "notifications_update_user" ON public.notifications;
        CREATE POLICY "notifications_update_user"
            ON public.notifications
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
