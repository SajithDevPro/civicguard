-- ==============================================================================
-- CIVICGUARD ENTERPRISE SCHEMA DEFINITION & ROW-LEVEL SECURITY (RLS) POLICIES
-- Target Runtime: PostgreSQL 15+ / Supabase Platform
-- Migration: 20261031000000_init_civicguard_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Enable PostGIS if available in the host environment (optional, gracefully fallback)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "postgis";
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PostGIS extension not available; falling back to native lat/lng indexing.';
END $$;

-- 2. DOMAIN ENUMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('citizen', 'officer', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
        CREATE TYPE incident_status AS ENUM ('pending', 'investigated', 'recovered');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_category') THEN
        CREATE TYPE asset_category AS ENUM ('vehicle', 'electronics', 'property', 'other');
    END IF;
END $$;

-- 3. POLICE STATIONS TABLE
CREATE TABLE IF NOT EXISTS public.police_stations (
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
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    badge_number TEXT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NULL,
    station_id UUID REFERENCES public.police_stations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    -- Constraint: Officers must possess a verifiable badge number
    CONSTRAINT chk_badge_for_officers CHECK (
        (role = 'officer' AND badge_number IS NOT NULL AND length(trim(badge_number)) > 0)
        OR (role != 'officer')
    )
);

-- 5. INCIDENT REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.incident_reports (
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

-- 6. AUDIT & AUTOMATED JURISDICTION ASSIGNMENT FUNCTIONS
-- 6.1 Timestamp update trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_incidents_updated_at ON public.incident_reports;
CREATE TRIGGER trg_incidents_updated_at
    BEFORE UPDATE ON public.incident_reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6.2 Automated Jurisdiction Assignment based on Euclidean/Spherical proximity
CREATE OR REPLACE FUNCTION public.assign_incident_jurisdiction()
RETURNS TRIGGER AS $$
DECLARE
    closest_station_id UUID;
BEGIN
    -- Only auto-assign if assigned_station_id was not explicitly specified
    IF NEW.assigned_station_id IS NULL THEN
        SELECT id INTO closest_station_id
        FROM public.police_stations
        ORDER BY (
            -- Great-circle distance approximation (Haversine formula component)
            6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(NEW.lat)) * cos(radians(lat)) *
                    cos(radians(lng) - radians(NEW.lng)) +
                    sin(radians(NEW.lat)) * sin(radians(lat))
                ))
            )
        ) ASC
        LIMIT 1;

        NEW.assigned_station_id = closest_station_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_incident_jurisdiction ON public.incident_reports;
CREATE TRIGGER trg_assign_incident_jurisdiction
    BEFORE INSERT ON public.incident_reports
    FOR EACH ROW EXECUTE FUNCTION public.assign_incident_jurisdiction();

-- 6.3 Auto-provision Profile on Auth Sign-Up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'citizen'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Civic Member'),
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 7. PERFORMANCE & GEOSPATIAL INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_station_id ON public.profiles(station_id);

CREATE INDEX IF NOT EXISTS idx_stations_coords ON public.police_stations(lat, lng);
CREATE INDEX IF NOT EXISTS idx_stations_code ON public.police_stations(code);

CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON public.incident_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_station ON public.incident_reports(assigned_station_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON public.incident_reports(category);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at_desc ON public.incident_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_spatial ON public.incident_reports(lat, lng);

-- Fast partial index for serial number queries (anti-fencing & recovery lookups)
CREATE INDEX IF NOT EXISTS idx_incidents_serial_number_clean
    ON public.incident_reports(lower(trim(serial_number)))
    WHERE serial_number IS NOT NULL;

-- 8. ROW-LEVEL SECURITY (RLS) DEFINITIONS

-- Enable RLS on all tables
ALTER TABLE public.police_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Security Helper Functions (SECURITY DEFINER to safely read caller profile without recursion)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_officer_or_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('officer', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_officer_station_id()
RETURNS UUID AS $$
    SELECT station_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 8.1 POLICE STATIONS POLICIES
-- Anyone authenticated can view police stations to locate nearest command units
DROP POLICY IF EXISTS "stations_read_all" ON public.police_stations;
CREATE POLICY "stations_read_all"
    ON public.police_stations
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Only Admins can modify police station details
DROP POLICY IF EXISTS "stations_admin_write" ON public.police_stations;
CREATE POLICY "stations_admin_write"
    ON public.police_stations
    FOR ALL
    TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

-- 8.2 PROFILES POLICIES
-- Users can view their own profile; Officers/Admins can view all profiles for operational triage
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id
        OR public.is_officer_or_admin()
    );

-- Users can update their personal details (excluding role escalation)
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Prevents self-escalation to officer/admin
    );

-- 8.3 INCIDENT REPORTS POLICIES
-- [INSERT]: Citizens and authenticated users can file incident reports
DROP POLICY IF EXISTS "incidents_insert_citizen" ON public.incident_reports;
CREATE POLICY "incidents_insert_citizen"
    ON public.incident_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );

-- [SELECT]:
-- 1. Citizens can view their own reports at all times.
-- 2. Citizens can view investigated/recovered safety alerts or public notices.
-- 3. Officers and Admins can view ALL reports across the command map.
DROP POLICY IF EXISTS "incidents_select_policy" ON public.incident_reports;
CREATE POLICY "incidents_select_policy"
    ON public.incident_reports
    FOR SELECT
    TO authenticated
    USING (
        -- User owns the report
        auth.uid() = user_id
        -- OR user is authorized law enforcement personnel
        OR public.is_officer_or_admin()
        -- OR incident has been verified and published for public safety awareness
        OR status IN ('investigated', 'recovered')
    );

-- [UPDATE]:
-- Officers can update incident statuses, assign stations, and append investigative notes
DROP POLICY IF EXISTS "incidents_update_officer" ON public.incident_reports;
CREATE POLICY "incidents_update_officer"
    ON public.incident_reports
    FOR UPDATE
    TO authenticated
    USING (
        public.is_officer_or_admin()
    )
    WITH CHECK (
        public.is_officer_or_admin()
    );

-- [DELETE]:
-- Chain-of-custody rule: Incident reports cannot be deleted by standard users; only System Admins can purge
DROP POLICY IF EXISTS "incidents_delete_admin" ON public.incident_reports;
CREATE POLICY "incidents_delete_admin"
    ON public.incident_reports
    FOR DELETE
    TO authenticated
    USING (
        public.current_user_role() = 'admin'
    );

-- 9. REAL-TIME PUBLICATION CONFIGURATION
-- Enable Supabase Realtime for instant command push updates to active officer dispatch boards
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_reports;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'supabase_realtime publication not configured; please activate via Dashboard.';
END $$;
