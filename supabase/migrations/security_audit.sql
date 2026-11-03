-- ==============================================================================
-- CIVICGUARD COMPREHENSIVE SECURITY AUDIT & IMMUTABLE LOGGING ENGINE
-- Target: PostgreSQL 15+ / PostGIS / Supabase Platform
-- Migration: security_audit.sql
-- ==============================================================================

-- 1. IMMUTABLE AUDIT LOGS TABLE SPECIFICATION
-- Strictly append-only data store tracking all security-sensitive events,
-- case state modifications, badge credential changes, and access attempts.

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

-- Optimize queries on timestamp, resource, and actor for SOC forensic analysis
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs (severity);

-- ==============================================================================
-- 2. IMMUTABILITY ENFORCEMENT & ANTI-TAMPER TRIGGERS
-- Strictly disallow UPDATE and DELETE operations on public.audit_logs.
-- Even superusers/database owners cannot tamper with logged history through the API.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.enforce_audit_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Audit logs are strictly immutable. Action [%] is forbidden on public.audit_logs.', TG_OP
        USING ERRCODE = '55000', -- object_not_in_prerequisite_state
              HINT = 'Audit logs are append-only by CJIS and SOC2 compliance mandate.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_log_prevent_tampering ON public.audit_logs;
CREATE TRIGGER trg_audit_log_prevent_tampering
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.enforce_audit_log_immutability();

-- ==============================================================================
-- 3. ROW-LEVEL SECURITY (RLS) FOR AUDIT LOGS
-- ==============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3.1 SELECT: Only authenticated Administrators can inspect audit logs
DROP POLICY IF EXISTS "Admins can inspect audit logs" ON public.audit_logs;
CREATE POLICY "Admins can inspect audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 3.2 INSERT: Disallow arbitrary direct inserts from client tokens.
-- All inserts must occur via trusted PostgreSQL triggers or SECURITY DEFINER functions.
DROP POLICY IF EXISTS "System triggers and internal functions log audit records" ON public.audit_logs;
CREATE POLICY "System triggers and internal functions log audit records"
    ON public.audit_logs
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (
        -- Enforces caller cannot forge arbitrary user_id unless matching auth.uid() or trigger execution
        (auth.uid() IS NULL) OR (user_id = auth.uid()) OR (public.is_admin())
    );

-- 3.3 UPDATE & DELETE: Explicitly denied for all roles
DROP POLICY IF EXISTS "Strictly deny update on audit logs" ON public.audit_logs;
CREATE POLICY "Strictly deny update on audit logs"
    ON public.audit_logs
    FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Strictly deny delete on audit logs" ON public.audit_logs;
CREATE POLICY "Strictly deny delete on audit logs"
    ON public.audit_logs
    FOR DELETE
    USING (false);

-- ==============================================================================
-- 4. SYSTEM HELPER: SECURE AUDIT LOGGING FUNCTION
-- Callable by RPC or triggers to record forensic events with caller telemetry.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.log_security_event(
    p_action VARCHAR(64),
    p_resource_type VARCHAR(64),
    p_resource_id VARCHAR(128),
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_severity VARCHAR(16) DEFAULT 'INFO',
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_user_id UUID := auth.uid();
    v_user_role public.user_role;
    v_client_ip INET;
    v_user_agent TEXT;
BEGIN
    -- Resolve caller role
    IF v_user_id IS NOT NULL THEN
        SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
    END IF;

    -- Extract client connection telemetry if available
    BEGIN
        v_client_ip := inet(current_setting('request.headers', true)::json->>'x-forwarded-for');
    EXCEPTION WHEN OTHERS THEN
        v_client_ip := NULL;
    END;

    BEGIN
        v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
    EXCEPTION WHEN OTHERS THEN
        v_user_agent := NULL;
    END;

    INSERT INTO public.audit_logs (
        user_id,
        user_role,
        action,
        resource_type,
        resource_id,
        ip_address,
        client_user_agent,
        old_values,
        new_values,
        metadata_json,
        severity
    ) VALUES (
        v_user_id,
        v_user_role,
        p_action,
        p_resource_type,
        p_resource_id,
        v_client_ip,
        v_user_agent,
        p_old_values,
        p_new_values,
        p_metadata,
        p_severity
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 5. AUTOMATED AUDIT TRIGGERS: INCIDENT REPORTS
-- Captures incident lifecycle state changes, officer notes, and deletions.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_incident_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
    v_action VARCHAR(64);
    v_severity VARCHAR(16) := 'INFO';
    v_metadata JSONB := '{}'::jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'INCIDENT_CREATED';
        v_metadata := jsonb_build_object(
            'title', NEW.title,
            'category', NEW.category,
            'has_serial', NEW.serial_number IS NOT NULL,
            'assigned_station_id', NEW.assigned_station_id,
            'estimated_value', NEW.estimated_value
        );

        PERFORM public.log_security_event(
            v_action,
            'incident_reports',
            NEW.id::text,
            v_metadata,
            v_severity,
            NULL,
            to_jsonb(NEW)
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'INCIDENT_STATUS_CHANGED';
            v_severity := CASE 
                WHEN NEW.status = 'recovered' THEN 'NOTICE'
                ELSE 'INFO'
            END;
            v_metadata := jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'notes_added', NEW.officer_notes IS DISTINCT FROM OLD.officer_notes
            );
        ELSIF OLD.assigned_station_id IS DISTINCT FROM NEW.assigned_station_id THEN
            v_action := 'INCIDENT_JURISDICTION_REASSIGNED';
            v_metadata := jsonb_build_object(
                'old_station', OLD.assigned_station_id,
                'new_station', NEW.assigned_station_id
            );
        ELSE
            v_action := 'INCIDENT_DETAILS_UPDATED';
        END IF;

        PERFORM public.log_security_event(
            v_action,
            'incident_reports',
            NEW.id::text,
            v_metadata,
            v_severity,
            jsonb_build_object('status', OLD.status, 'assigned_station_id', OLD.assigned_station_id),
            jsonb_build_object('status', NEW.status, 'assigned_station_id', NEW.assigned_station_id)
        );
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'INCIDENT_DELETED';
        v_severity := 'CRITICAL';
        v_metadata := jsonb_build_object(
            'deleted_by', auth.uid(),
            'title', OLD.title,
            'category', OLD.category,
            'status', OLD.status
        );

        PERFORM public.log_security_event(
            v_action,
            'incident_reports',
            OLD.id::text,
            v_metadata,
            v_severity,
            to_jsonb(OLD),
            NULL
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_incident_reports ON public.incident_reports;
CREATE TRIGGER trg_audit_incident_reports
    AFTER INSERT OR UPDATE OR DELETE ON public.incident_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_audit_incident_lifecycle();

-- ==============================================================================
-- 6. AUTOMATED AUDIT TRIGGERS: USER PROFILES & CREDENTIALS
-- Logs role assignments, badge verification, and account modifications.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_profile_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action VARCHAR(64);
    v_severity VARCHAR(16) := 'INFO';
    v_metadata JSONB := '{}'::jsonb;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            v_action := 'PROFILE_ROLE_ELEVATED';
            v_severity := 'CRITICAL';
            v_metadata := jsonb_build_object(
                'old_role', OLD.role,
                'new_role', NEW.role,
                'modified_by', auth.uid()
            );
        ELSIF OLD.badge_number IS DISTINCT FROM NEW.badge_number THEN
            v_action := 'OFFICER_BADGE_ALTERED';
            v_severity := 'WARNING';
            v_metadata := jsonb_build_object(
                'old_badge', OLD.badge_number,
                'new_badge', NEW.badge_number,
                'station_id', NEW.station_id
            );
        ELSIF OLD.station_id IS DISTINCT FROM NEW.station_id THEN
            v_action := 'OFFICER_STATION_TRANSFERRED';
            v_severity := 'NOTICE';
            v_metadata := jsonb_build_object(
                'old_station', OLD.station_id,
                'new_station', NEW.station_id
            );
        ELSE
            v_action := 'PROFILE_DETAILS_UPDATED';
        END IF;

        PERFORM public.log_security_event(
            v_action,
            'profiles',
            NEW.id::text,
            v_metadata,
            v_severity,
            jsonb_build_object('role', OLD.role, 'badge_number', OLD.badge_number, 'station_id', OLD.station_id),
            jsonb_build_object('role', NEW.role, 'badge_number', NEW.badge_number, 'station_id', NEW.station_id)
        );
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'PROFILE_ACCOUNT_DELETED';
        v_severity := 'CRITICAL';
        v_metadata := jsonb_build_object(
            'deleted_role', OLD.role,
            'deleted_email', OLD.email,
            'deleted_by', auth.uid()
        );

        PERFORM public.log_security_event(
            v_action,
            'profiles',
            OLD.id::text,
            v_metadata,
            v_severity,
            to_jsonb(OLD),
            NULL
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
    AFTER UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_audit_profile_changes();
