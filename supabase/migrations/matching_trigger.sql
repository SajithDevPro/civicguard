-- ==============================================================================
-- CIVICGUARD MODULE 7: AUTOMATED SERIAL NUMBER MATCHING ENGINE MIGRATION
-- Target Runtime: PostgreSQL 15+ / Supabase Platform
-- Migration: matching_trigger.sql
-- ==============================================================================

-- 1. EXTENSIONS (Levenshtein distance for fuzzy matching if available)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'fuzzystrmatch extension unavailable; using native regex fallback.';
END $$;

-- 2. DOMAIN ENUM: MATCH STATUS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status') THEN
        CREATE TYPE match_status AS ENUM ('pending_verification', 'confirmed', 'rejected');
    END IF;
END $$;

-- 3. RECOVERED ASSETS TABLE
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

-- 4. ASSET MATCHES TABLE
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

-- 5. SERIAL NORMALIZATION UTILITY FUNCTION
CREATE OR REPLACE FUNCTION public.normalize_serial(raw_serial TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT upper(regexp_replace(coalesce(raw_serial, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- 6. SERIAL SIMILARITY CALCULATION FUNCTION
CREATE OR REPLACE FUNCTION public.calculate_serial_similarity(str_a TEXT, str_b TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    norm_a TEXT;
    norm_b TEXT;
    max_len INT;
    dist INT;
BEGIN
    norm_a := public.normalize_serial(str_a);
    norm_b := public.normalize_serial(str_b);

    IF norm_a = '' OR norm_b = '' THEN
        RETURN 0.00;
    END IF;

    IF norm_a = norm_b THEN
        RETURN 100.00;
    END IF;

    max_len := GREATEST(length(norm_a), length(norm_b));
    IF max_len = 0 THEN
        RETURN 100.00;
    END IF;

    -- If fuzzystrmatch extension is present, calculate exact Levenshtein distance
    BEGIN
        SELECT levenshtein(norm_a, norm_b) INTO dist;
        RETURN ROUND(GREATEST(0.00, (1.0 - (dist::NUMERIC / max_len::NUMERIC)) * 100.00), 2);
    EXCEPTION WHEN OTHERS THEN
        -- Fallback heuristic if fuzzystrmatch is missing: check prefix/suffix match
        IF norm_a LIKE norm_b || '%' OR norm_b LIKE norm_a || '%' THEN
            RETURN 85.00;
        END IF;
        RETURN 0.00;
    END;
END;
$$;

-- 7. AUTO-POPULATE normalized_serial ON recovered_assets
CREATE OR REPLACE FUNCTION public.sync_recovered_asset_normalized_serial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.normalized_serial := public.normalize_serial(NEW.serial_number);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_recovered_asset_normalized_serial ON public.recovered_assets;
CREATE TRIGGER trg_sync_recovered_asset_normalized_serial
BEFORE INSERT OR UPDATE OF serial_number ON public.recovered_assets
FOR EACH ROW
EXECUTE FUNCTION public.sync_recovered_asset_normalized_serial();

-- 8. MATCHING TRIGGER FUNCTION: ON INSERT/UPDATE OF RECOVERED ASSET
CREATE OR REPLACE FUNCTION public.trigger_match_on_recovered_asset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_norm_serial TEXT;
    r_incident RECORD;
    v_score NUMERIC;
    v_match_type TEXT;
BEGIN
    v_norm_serial := public.normalize_serial(NEW.serial_number);
    IF v_norm_serial = '' THEN
        RETURN NEW;
    END IF;

    -- Scan active incident reports with serial numbers
    FOR r_incident IN
        SELECT id, serial_number, user_id, title
        FROM public.incident_reports
        WHERE serial_number IS NOT NULL
          AND status != 'recovered'
          AND public.normalize_serial(serial_number) != ''
    LOOP
        v_score := public.calculate_serial_similarity(v_norm_serial, r_incident.serial_number);
        
        IF v_score >= 80.00 THEN
            v_match_type := CASE WHEN v_score >= 100.00 THEN 'exact' ELSE 'fuzzy' END;
            
            -- Insert potential match record into asset_matches
            INSERT INTO public.asset_matches (
                stolen_report_id,
                recovered_asset_id,
                confidence_score,
                match_type,
                status
            )
            VALUES (
                r_incident.id,
                NEW.id,
                v_score,
                v_match_type,
                'pending_verification'
            )
            ON CONFLICT (stolen_report_id, recovered_asset_id) 
            DO UPDATE SET 
                confidence_score = EXCLUDED.confidence_score,
                match_type = EXCLUDED.match_type;
                
            -- Automated Notification alert for law enforcement
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    type,
                    severity,
                    incident_id
                )
                SELECT
                    p.id,
                    'Asset Recovery Match Detected (' || v_score || '%)',
                    'Recovered item serial ' || NEW.serial_number || ' matches Stolen Case: ' || r_incident.title,
                    'alert',
                    'high',
                    r_incident.id
                FROM public.profiles p
                WHERE p.role IN ('officer', 'admin');
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_on_recovered_asset ON public.recovered_assets;
CREATE TRIGGER trg_match_on_recovered_asset
AFTER INSERT OR UPDATE OF serial_number ON public.recovered_assets
FOR EACH ROW
EXECUTE FUNCTION public.trigger_match_on_recovered_asset();

-- 9. MATCHING TRIGGER FUNCTION: ON INSERT/UPDATE OF INCIDENT REPORT
CREATE OR REPLACE FUNCTION public.trigger_match_on_incident_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_norm_serial TEXT;
    r_asset RECORD;
    v_score NUMERIC;
    v_match_type TEXT;
BEGIN
    IF NEW.serial_number IS NULL THEN
        RETURN NEW;
    END IF;

    v_norm_serial := public.normalize_serial(NEW.serial_number);
    IF v_norm_serial = '' THEN
        RETURN NEW;
    END IF;

    -- Scan recovered assets
    FOR r_asset IN
        SELECT id, serial_number, title
        FROM public.recovered_assets
        WHERE normalized_serial != ''
    LOOP
        v_score := public.calculate_serial_similarity(v_norm_serial, r_asset.serial_number);
        
        IF v_score >= 80.00 THEN
            v_match_type := CASE WHEN v_score >= 100.00 THEN 'exact' ELSE 'fuzzy' END;

            INSERT INTO public.asset_matches (
                stolen_report_id,
                recovered_asset_id,
                confidence_score,
                match_type,
                status
            )
            VALUES (
                NEW.id,
                r_asset.id,
                v_score,
                v_match_type,
                'pending_verification'
            )
            ON CONFLICT (stolen_report_id, recovered_asset_id)
            DO UPDATE SET
                confidence_score = EXCLUDED.confidence_score,
                match_type = EXCLUDED.match_type;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_on_incident_report ON public.incident_reports;
CREATE TRIGGER trg_match_on_incident_report
AFTER INSERT OR UPDATE OF serial_number ON public.incident_reports
FOR EACH ROW
EXECUTE FUNCTION public.trigger_match_on_incident_report();

-- 10. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_recovered_assets_norm_serial ON public.recovered_assets(normalized_serial);
CREATE INDEX IF NOT EXISTS idx_asset_matches_status ON public.asset_matches(status);
CREATE INDEX IF NOT EXISTS idx_asset_matches_stolen_id ON public.asset_matches(stolen_report_id);
CREATE INDEX IF NOT EXISTS idx_asset_matches_recovered_id ON public.asset_matches(recovered_asset_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_norm_serial 
ON public.incident_reports (public.normalize_serial(serial_number))
WHERE serial_number IS NOT NULL;

-- 11. ROW-LEVEL SECURITY (RLS)
ALTER TABLE public.recovered_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_matches ENABLE ROW LEVEL SECURITY;

-- RECOVERED ASSETS POLICIES:
-- Officers and admins have full read/write access
CREATE POLICY "Officers and admins full access on recovered_assets"
ON public.recovered_assets
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role IN ('officer', 'admin')
    )
);

-- Public read for anonymized anti-fencing verification queries
CREATE POLICY "Public read recovered_assets"
ON public.recovered_assets
FOR SELECT
TO authenticated, anon
USING (true);

-- ASSET MATCHES POLICIES:
-- Officers and admins can view and verify all matches
CREATE POLICY "Officers manage asset_matches"
ON public.asset_matches
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role IN ('officer', 'admin')
    )
);

-- Citizens can view matches related to their own stolen reports
CREATE POLICY "Citizens view matches for own incidents"
ON public.asset_matches
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.incident_reports ir
        WHERE ir.id = asset_matches.stolen_report_id
          AND ir.user_id = auth.uid()
    )
);
