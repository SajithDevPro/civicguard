/**
 * CivicGuard Core Database Service Layer
 * Enterprise client service layer handling geospatial incident management,
 * RBAC enforcement, automated jurisdiction assignment, and real-time syncing.
 */
import { SEED_INCIDENTS, SEED_POLICE_STATIONS } from '../data/seedData';
import {
  CreateIncidentInput,
  GeoCoordinates,
  IncidentFilterOptions,
  IncidentReport,
  IncidentStatus,
  PoliceStation,
  SystemMetrics,
  UpdateIncidentStatusInput,
  UserProfile,
  UserRole,
  ValidationResult,
} from '../types';
import { isSupabaseConfigured, supabase } from './supabase';
import { createNotification } from './notifications';
import { sanitizeIncidentInput, sanitizeText } from '../lib/security/sanitizer';
import { enforceRateLimit } from '../lib/security/rateLimiter';

const STORAGE_KEY_INCIDENTS = 'civicguard_incidents_v1';
const STORAGE_KEY_STATIONS = 'civicguard_stations_v1';

// Real-time listener callback registry
type IncidentEventListener = (payload: {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  incident: IncidentReport;
}) => void;
const listeners = new Set<IncidentEventListener>();

function notifyListeners(event: 'INSERT' | 'UPDATE' | 'DELETE', incident: IncidentReport) {
  listeners.forEach((listener) => {
    try {
      listener({ event, incident });
    } catch (err) {
      console.error('[CivicGuard Sync] Listener error:', err);
    }
  });
}

/**
 * Local store initialization ensuring offline resilience and demo instant readiness
 */
function getLocalIncidents(): IncidentReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INCIDENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(SEED_INCIDENTS));
      return [...SEED_INCIDENTS];
    }
    return JSON.parse(raw);
  } catch {
    return [...SEED_INCIDENTS];
  }
}

function saveLocalIncidents(incidents: IncidentReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(incidents));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

function getLocalStations(): PoliceStation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(SEED_POLICE_STATIONS));
      return [...SEED_POLICE_STATIONS];
    }
    return JSON.parse(raw);
  } catch {
    return [...SEED_POLICE_STATIONS];
  }
}

/**
 * Haversine formula for calculating great-circle distance between two coordinates in kilometers.
 * Mirrors the PostgreSQL assign_incident_jurisdiction() function.
 */
export function calculateDistanceKm(coord1: GeoCoordinates, coord2: GeoCoordinates): number {
  const earthRadiusKm = 6371;
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const lat1Rad = (coord1.lat * Math.PI) / 180;
  const lat2Rad = (coord2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

/**
 * Automatically determine the closest police station / jurisdiction zone for an incident.
 */
export function findNearestPoliceStation(
  coords: GeoCoordinates,
  stations: PoliceStation[]
): { station: PoliceStation; distanceKm: number } | null {
  if (stations.length === 0) return null;

  let nearest = stations[0];
  let minDistance = calculateDistanceKm(coords, { lat: nearest.lat, lng: nearest.lng });

  for (let i = 1; i < stations.length; i++) {
    const d = calculateDistanceKm(coords, { lat: stations[i].lat, lng: stations[i].lng });
    if (d < minDistance) {
      minDistance = d;
      nearest = stations[i];
    }
  }

  return { station: nearest, distanceKm: minDistance };
}

/**
 * Validate citizen incident report submission inputs
 */
export function validateReportInput(input: CreateIncidentInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters in length.';
  } else if (input.title.trim().length > 120) {
    errors.title = 'Title cannot exceed 120 characters.';
  }

  if (!input.description || input.description.trim().length < 10) {
    errors.description = 'Description must provide at least 10 characters of detail.';
  }

  if (typeof input.lat !== 'number' || isNaN(input.lat) || input.lat < -90 || input.lat > 90) {
    errors.lat = 'Valid latitude coordinate (-90 to +90) is required.';
  }

  if (typeof input.lng !== 'number' || isNaN(input.lng) || input.lng < -180 || input.lng > 180) {
    errors.lng = 'Valid longitude coordinate (-180 to +180) is required.';
  }

  if (input.estimated_value !== undefined && input.estimated_value !== null) {
    if (isNaN(input.estimated_value) || input.estimated_value < 0) {
      errors.estimated_value = 'Estimated value cannot be negative.';
    }
  }

  if (input.serial_number && input.serial_number.trim().length > 64) {
    errors.serial_number = 'Serial number cannot exceed 64 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Fetch all registered police stations and command substations.
 */
export async function fetchPoliceStations(): Promise<PoliceStation[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('police_stations')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.warn('[CivicGuard DB] Supabase station fetch error, fallback to local store:', error.message);
        return getLocalStations();
      }
      return data as PoliceStation[];
    } catch (err) {
      console.warn('[CivicGuard DB] Remote query failed, using local store:', err);
      return getLocalStations();
    }
  }

  return getLocalStations();
}

/**
 * Fetch active incident reports with RBAC policy simulation and filtering.
 * Enforces:
 * - Citizens only view their own reports OR public safety alerts (investigated/recovered)
 * - Officers and Admins can view all reports across all statuses
 */
export async function fetchActiveIncidents(
  filter?: IncidentFilterOptions,
  currentUser?: UserProfile
): Promise<IncidentReport[]> {
  // Remote Supabase Execution
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('incident_reports').select('*, police_stations(name)');

      if (filter?.status && filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }
      if (filter?.category && filter.category !== 'all') {
        query = query.eq('category', filter.category);
      }
      if (filter?.assigned_station_id && filter.assigned_station_id !== 'all') {
        query = query.eq('assigned_station_id', filter.assigned_station_id);
      }
      if (filter?.serial_number) {
        query = query.ilike('serial_number', `%${filter.serial_number.trim()}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('[CivicGuard DB] Remote query error, falling back to local store:', error.message);
      } else if (data) {
        return (data as unknown[]).map((row: any) => ({
          ...row,
          assigned_station_name: row.police_stations?.name,
        })) as IncidentReport[];
      }
    } catch (err) {
      console.warn('[CivicGuard DB] Network exception, using local store:', err);
    }
  }

  // Local Store with Row-Level Security Policy Enforcement
  const allIncidents = getLocalIncidents();
  const stations = getLocalStations();
  const stationMap = new Map(stations.map((s) => [s.id, s.name]));

  return allIncidents
    .filter((incident) => {
      // 1. RLS enforcement check
      if (currentUser) {
        const isOfficerOrAdmin =
          currentUser.role === UserRole.OFFICER || currentUser.role === UserRole.ADMIN;
        if (!isOfficerOrAdmin) {
          const isOwner = incident.user_id === currentUser.id;
          const isPublicAlert =
            incident.status === IncidentStatus.INVESTIGATED ||
            incident.status === IncidentStatus.RECOVERED;
          if (!isOwner && !isPublicAlert) {
            return false;
          }
        }
      }

      // 2. Status filter
      if (filter?.status && filter.status !== 'all' && incident.status !== filter.status) {
        return false;
      }

      // 3. Category filter
      if (filter?.category && filter.category !== 'all' && incident.category !== filter.category) {
        return false;
      }

      // 4. Assigned Station filter
      if (
        filter?.assigned_station_id &&
        filter.assigned_station_id !== 'all' &&
        incident.assigned_station_id !== filter.assigned_station_id
      ) {
        return false;
      }

      // 5. Serial Number search
      if (filter?.serial_number) {
        const query = filter.serial_number.trim().toLowerCase();
        if (!incident.serial_number?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 6. Text query search (title, description, address)
      if (filter?.search_query) {
        const query = filter.search_query.trim().toLowerCase();
        const matchesTitle = incident.title.toLowerCase().includes(query);
        const matchesDesc = incident.description.toLowerCase().includes(query);
        const matchesAddress = incident.address_approx?.toLowerCase().includes(query) ?? false;
        const matchesSerial = incident.serial_number?.toLowerCase().includes(query) ?? false;

        if (!matchesTitle && !matchesDesc && !matchesAddress && !matchesSerial) {
          return false;
        }
      }

      return true;
    })
    .map((incident) => ({
      ...incident,
      assigned_station_name: incident.assigned_station_id
        ? stationMap.get(incident.assigned_station_id)
        : undefined,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Fetch a single incident dossier by UUID.
 */
export async function fetchIncidentById(id: string): Promise<IncidentReport | null> {
  const incidents = getLocalIncidents();
  const incident = incidents.find((inc) => inc.id === id);
  if (!incident) return null;

  const stations = getLocalStations();
  const station = stations.find((s) => s.id === incident.assigned_station_id);

  return {
    ...incident,
    assigned_station_name: station ? station.name : undefined,
  };
}

/**
 * Submit a new incident report with automated jurisdiction assignment and RLS checks.
 */
export async function createIncidentReport(
  input: CreateIncidentInput,
  currentUser: UserProfile
): Promise<IncidentReport> {
  // 1. Sliding-Window Rate Limit Enforcement (Max 3 reports / 15 minutes per user)
  enforceRateLimit('INCIDENT_REPORT', currentUser.id);

  // 2. Input Sanitization (strips XSS vectors, SQL delimiters, control characters)
  const cleanInput = sanitizeIncidentInput(input);

  // 3. Validation
  const validation = validateReportInput(cleanInput);
  if (!validation.isValid) {
    const firstErr = Object.values(validation.errors)[0];
    throw new Error(`Validation failed: ${firstErr}`);
  }

  // 4. Automated Jurisdiction Computation (Haversine spatial resolution)
  const stations = getLocalStations();
  const nearestResult = findNearestPoliceStation({ lat: cleanInput.lat, lng: cleanInput.lng }, stations);
  const assignedStation = nearestResult ? nearestResult.station : stations[0];

  const nowIso = new Date().toISOString();
  const newIncident: IncidentReport = {
    id: `inc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    title: cleanInput.title,
    description: cleanInput.description,
    category: cleanInput.category,
    status: IncidentStatus.PENDING,
    lat: cleanInput.lat,
    lng: cleanInput.lng,
    serial_number: cleanInput.serial_number || null,
    user_id: currentUser.id,
    assigned_station_id: assignedStation ? assignedStation.id : null,
    address_approx: cleanInput.address_approx || 'Geospatial pin recorded',
    estimated_value: cleanInput.estimated_value ?? null,
    evidence_urls: cleanInput.evidence_urls || [],
    officer_notes: null,
    reporter_name: cleanInput.reporter_name || currentUser.full_name,
    reporter_email: currentUser.email,
    reporter_phone: cleanInput.reporter_phone || currentUser.phone || undefined,
    assigned_station_name: assignedStation ? assignedStation.name : undefined,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // Remote Supabase Insert (if configured)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('incident_reports')
        .insert({
          title: newIncident.title,
          description: newIncident.description,
          category: newIncident.category,
          status: newIncident.status,
          lat: newIncident.lat,
          lng: newIncident.lng,
          serial_number: newIncident.serial_number,
          user_id: newIncident.user_id,
          assigned_station_id: newIncident.assigned_station_id,
          address_approx: newIncident.address_approx,
          estimated_value: newIncident.estimated_value,
          evidence_urls: newIncident.evidence_urls,
          reporter_name: newIncident.reporter_name,
          reporter_phone: newIncident.reporter_phone,
        })
        .select()
        .single();

      if (!error && data) {
        newIncident.id = data.id;
      }
    } catch (err) {
      console.warn('[CivicGuard DB] Remote insert sync failed, saved locally:', err);
    }
  }

  // Persist locally
  const currentIncidents = getLocalIncidents();
  currentIncidents.unshift(newIncident);
  saveLocalIncidents(currentIncidents);

  // Broadcast real-time push to all listeners (officer dashboards)
  notifyListeners('INSERT', newIncident);

  // Auto-dispatch notification to police officers
  createNotification({
    user_id: 'usr-officer-4081',
    title: `Priority Dispatch: ${newIncident.category.toUpperCase()} Theft`,
    message: `New incident reported: ${newIncident.title}. Location: ${newIncident.address_approx || 'GPS Coordinates Logged'}.`,
    type: 'dispatch',
    severity: newIncident.category === 'vehicle' ? 'critical' : 'high',
    incident_id: newIncident.id,
  }).catch((err) => console.warn('[CivicGuard DB] Notification broadcast failed:', err));

  return newIncident;
}

/**
 * Update incident status and investigative notes.
 * STRICT SECURITY RULE: Restricted to Officer and Admin roles only.
 */
export async function updateIncidentStatus(
  input: UpdateIncidentStatusInput,
  currentUser: UserProfile
): Promise<IncidentReport> {
  // Security RBAC authorization check
  const isAuthorized =
    currentUser.role === UserRole.OFFICER || currentUser.role === UserRole.ADMIN;

  if (!isAuthorized) {
    throw new Error(
      'Unauthorized: Only authorized law enforcement personnel or administrators may modify incident statuses or append investigative notes.'
    );
  }

  const currentIncidents = getLocalIncidents();
  const index = currentIncidents.findIndex((inc) => inc.id === input.incident_id);

  if (index === -1) {
    throw new Error(`Incident with ID '${input.incident_id}' not found.`);
  }

  const existing = currentIncidents[index];
  const nowIso = new Date().toISOString();

  const updatedIncident: IncidentReport = {
    ...existing,
    status: input.status,
    officer_notes:
      input.officer_notes !== undefined ? sanitizeText(input.officer_notes, 2000) : existing.officer_notes,
    assigned_station_id: input.assigned_station_id || existing.assigned_station_id,
    updated_at: nowIso,
  };

  // Remote Supabase Update
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('incident_reports')
        .update({
          status: updatedIncident.status,
          officer_notes: updatedIncident.officer_notes,
          assigned_station_id: updatedIncident.assigned_station_id,
          updated_at: nowIso,
        })
        .eq('id', input.incident_id);
    } catch (err) {
      console.warn('[CivicGuard DB] Remote status update failed, updated locally:', err);
    }
  }

  currentIncidents[index] = updatedIncident;
  saveLocalIncidents(currentIncidents);

  notifyListeners('UPDATE', updatedIncident);

  // Notify citizen filer of investigation update or asset recovery
  createNotification({
    user_id: updatedIncident.user_id,
    title: `Case Status Update: ${updatedIncident.title}`,
    message: `Case #${updatedIncident.id.substring(0, 8).toUpperCase()} updated to ${input.status.toUpperCase()} by ${currentUser.full_name} (${currentUser.badge_number ? `Badge #${currentUser.badge_number}` : 'Command'}).`,
    type: 'status_update',
    severity: input.status === IncidentStatus.RECOVERED ? 'info' : 'high',
    incident_id: updatedIncident.id,
  }).catch((err) => console.warn('[CivicGuard DB] Notification broadcast failed:', err));

  return updatedIncident;
}

/**
 * Fast lookup for stolen property by serial number (anti-fencing verification tool).
 */
export async function searchIncidentsBySerialNumber(serial: string): Promise<IncidentReport[]> {
  const cleanSerial = serial.trim().toLowerCase();
  if (!cleanSerial) return [];

  const all = getLocalIncidents();
  return all.filter(
    (inc) => inc.serial_number && inc.serial_number.toLowerCase().includes(cleanSerial)
  );
}

/**
 * Subscribe to real-time incident reports stream.
 * Automatically ties into Supabase Realtime channel or client pub/sub engine.
 */
export function subscribeToIncidents(callback: IncidentEventListener): () => void {
  listeners.add(callback);

  let supabaseChannel: any = null;
  if (isSupabaseConfigured && supabase) {
    supabaseChannel = supabase
      .channel('public:incident_reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incident_reports' },
        (payload) => {
          callback({
            event: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            incident: payload.new as IncidentReport,
          });
        }
      )
      .subscribe();
  }

  return () => {
    listeners.delete(callback);
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}

/**
 * Calculate high-level aggregate system recovery metrics.
 */
export async function fetchSystemMetrics(): Promise<SystemMetrics> {
  const incidents = getLocalIncidents();
  const stations = getLocalStations();

  const total = incidents.length;
  const pending = incidents.filter((i) => i.status === IncidentStatus.PENDING).length;
  const investigated = incidents.filter((i) => i.status === IncidentStatus.INVESTIGATED).length;
  const recovered = incidents.filter((i) => i.status === IncidentStatus.RECOVERED).length;

  const recoveryRate = total > 0 ? (recovered / total) * 100 : 0;
  const totalRecoveredVal = incidents
    .filter((i) => i.status === IncidentStatus.RECOVERED && i.estimated_value)
    .reduce((sum, item) => sum + (item.estimated_value || 0), 0);

  const activePatrolCount = stations.reduce(
    (sum, st) => sum + (st.active_officers_count || 12),
    0
  );

  return {
    total_reports: total,
    pending_count: pending,
    investigated_count: investigated,
    recovered_count: recovered,
    recovery_rate_percent: Number(recoveryRate.toFixed(1)),
    total_recovered_value: totalRecoveredVal,
    active_stations_count: stations.length,
    active_patrol_officers: activePatrolCount,
  };
}

/**
 * Reset local demonstration database back to default seed state
 */
export function resetToSeedData(): void {
  localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(SEED_INCIDENTS));
  localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(SEED_POLICE_STATIONS));
}
