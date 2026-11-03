-- ==============================================================================
-- CIVICGUARD EXECUTIVE ANALYTICS, AGGREGATIONS & INTELLIGENCE REPORTING
-- Target: PostgreSQL 15+ / Supabase Platform
-- Migration: analytics_views.sql
-- ==============================================================================

-- 1. COMPOSITE INDEXES FOR ANALYTICAL QUERY OPTIMIZATION
CREATE INDEX IF NOT EXISTS idx_incidents_analytics_created_status 
    ON public.incident_reports (created_at DESC, status, category);

CREATE INDEX IF NOT EXISTS idx_incidents_station_status 
    ON public.incident_reports (assigned_station_id, status, created_at);

-- 2. PRECINCT MONTHLY STATS VIEW (precinct_monthly_stats)
-- Aggregates total reported thefts, total recovered assets, recovery success percentage,
-- and average resolution duration (in hours) grouped by station and calendar month.

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
            AVG(
                EXTRACT(EPOCH FROM (i.updated_at - i.created_at)) / 3600.0
            ) FILTER (WHERE i.status = 'recovered'),
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
    s.name,
    s.code,
    date_trunc('month', i.created_at)
ORDER BY report_month DESC, total_reports DESC;

-- Grant read access to authenticated and authorized law enforcement
GRANT SELECT ON public.precinct_monthly_stats TO authenticated;

-- 3. CATEGORY DISTRIBUTION RPC FUNCTION (category_distribution_rpc)
-- Aggregates stolen asset counts and values by category within user-defined date bounds.

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
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        i.category,
        COUNT(i.id) AS total_reported,
        COUNT(i.id) FILTER (WHERE i.status = 'recovered') AS total_recovered,
        ROUND(
            (COUNT(i.id) FILTER (WHERE i.status = 'recovered')::NUMERIC / NULLIF(COUNT(i.id), 0)) * 100.0,
            2
        ) AS recovery_rate,
        COALESCE(SUM(i.estimated_value), 0.00) AS total_value_stolen,
        COALESCE(SUM(i.estimated_value) FILTER (WHERE i.status = 'recovered'), 0.00) AS total_value_recovered
    FROM public.incident_reports i
    WHERE i.created_at >= start_date 
      AND i.created_at <= end_date
      AND (filter_station_id IS NULL OR i.assigned_station_id = filter_station_id)
    GROUP BY i.category
    ORDER BY total_reported DESC;
$$;

GRANT EXECUTE ON FUNCTION public.category_distribution_rpc TO authenticated;

-- 4. TEMPORAL DAILY TRENDS RPC FUNCTION (daily_incident_recovery_trends_rpc)
-- Generates daily day-by-day report vs recovery series for interactive charts.

CREATE OR REPLACE FUNCTION public.daily_incident_recovery_trends_rpc(
    start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    end_date TIMESTAMPTZ DEFAULT NOW(),
    filter_station_id UUID DEFAULT NULL
)
RETURNS TABLE (
    calendar_date DATE,
    reports_count BIGINT,
    recovered_count BIGINT,
    stolen_value_sum NUMERIC(14, 2),
    recovered_value_sum NUMERIC(14, 2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH date_series AS (
        SELECT generate_series(
            date_trunc('day', start_date)::DATE,
            date_trunc('day', end_date)::DATE,
            '1 day'::interval
        )::DATE AS calendar_date
    )
    SELECT 
        d.calendar_date,
        COUNT(i.id) AS reports_count,
        COUNT(i.id) FILTER (WHERE i.status = 'recovered') AS recovered_count,
        COALESCE(SUM(i.estimated_value), 0.00) AS stolen_value_sum,
        COALESCE(SUM(i.estimated_value) FILTER (WHERE i.status = 'recovered'), 0.00) AS recovered_value_sum
    FROM date_series d
    LEFT JOIN public.incident_reports i 
        ON date_trunc('day', i.created_at)::DATE = d.calendar_date
        AND (filter_station_id IS NULL OR i.assigned_station_id = filter_station_id)
    GROUP BY d.calendar_date
    ORDER BY d.calendar_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.daily_incident_recovery_trends_rpc TO authenticated;

-- 5. EXECUTIVE METRICS ROLLUP FUNCTION (executive_kpi_summary_rpc)
CREATE OR REPLACE FUNCTION public.executive_kpi_summary_rpc(
    start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    end_date TIMESTAMPTZ DEFAULT NOW(),
    filter_station_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_incidents BIGINT,
    total_recovered BIGINT,
    total_pending BIGINT,
    recovery_rate NUMERIC(5, 2),
    total_stolen_value NUMERIC(14, 2),
    total_recovered_value NUMERIC(14, 2),
    avg_resolution_hours NUMERIC(6, 1)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(i.id) AS total_incidents,
        COUNT(i.id) FILTER (WHERE i.status = 'recovered') AS total_recovered,
        COUNT(i.id) FILTER (WHERE i.status = 'pending') AS total_pending,
        ROUND(
            (COUNT(i.id) FILTER (WHERE i.status = 'recovered')::NUMERIC / NULLIF(COUNT(i.id), 0)) * 100.0,
            2
        ) AS recovery_rate,
        COALESCE(SUM(i.estimated_value), 0.00) AS total_stolen_value,
        COALESCE(SUM(i.estimated_value) FILTER (WHERE i.status = 'recovered'), 0.00) AS total_recovered_value,
        COALESCE(
            ROUND(
                AVG(
                    EXTRACT(EPOCH FROM (i.updated_at - i.created_at)) / 3600.0
                ) FILTER (WHERE i.status = 'recovered'),
                1
            ),
            0.0
        ) AS avg_resolution_hours
    FROM public.incident_reports i
    WHERE i.created_at >= start_date 
      AND i.created_at <= end_date
      AND (filter_station_id IS NULL OR i.assigned_station_id = filter_station_id);
$$;

GRANT EXECUTE ON FUNCTION public.executive_kpi_summary_rpc TO authenticated;
