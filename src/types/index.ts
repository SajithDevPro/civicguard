/**
 * CivicGuard Public Safety & Asset Recovery Platform
 * Enterprise TypeScript Data Types & Interfaces
 *
 * Strict typing contracts mirroring the PostgreSQL / Supabase enterprise schema.
 */

export enum UserRole {
  CITIZEN = 'citizen',
  OFFICER = 'officer',
  ADMIN = 'admin',
}

export enum IncidentStatus {
  PENDING = 'pending',
  INVESTIGATED = 'investigated',
  RECOVERED = 'recovered',
}

export enum AssetCategory {
  VEHICLE = 'vehicle',
  ELECTRONICS = 'electronics',
  PROPERTY = 'property',
  OTHER = 'other',
}

export enum SafetyZoneStatus {
  ACTIVE_PATROL = 'active_patrol',
  ELEVATED_WATCH = 'elevated_watch',
  SAFE_HAVEN = 'safe_haven',
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // GeoJSON format: array of [lng, lat] linear rings
}

export interface UserProfile {
  id: string; // UUID references auth.users(id)
  email: string;
  role: UserRole;
  badge_number: string | null;
  full_name: string;
  phone: string | null;
  station_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PoliceStation {
  id: string; // UUID primary key
  name: string;
  code: string; // e.g. "PCT-01", "CENTRAL-HQ"
  lat: number;
  lng: number;
  jurisdiction_polygon: GeoPolygon | null;
  contact_phone: string;
  address: string;
  dispatch_frequency?: string;
  active_officers_count?: number;
  created_at: string;
}

export interface IncidentReport {
  id: string; // UUID primary key
  title: string;
  description: string;
  category: AssetCategory;
  status: IncidentStatus;
  lat: number;
  lng: number;
  serial_number: string | null;
  user_id: string; // References profiles.id
  assigned_station_id: string | null; // References police_stations.id
  address_approx: string | null;
  estimated_value: number | null;
  evidence_urls: string[];
  officer_notes: string | null;
  reporter_name?: string;
  reporter_email?: string;
  reporter_phone?: string;
  assigned_station_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  category: AssetCategory;
  lat: number;
  lng: number;
  serial_number?: string | null;
  address_approx?: string | null;
  estimated_value?: number | null;
  evidence_urls?: string[];
  reporter_name?: string;
  reporter_phone?: string;
}

export interface UpdateIncidentStatusInput {
  incident_id: string;
  status: IncidentStatus;
  officer_notes?: string;
  assigned_station_id?: string;
}

export interface IncidentFilterOptions {
  status?: IncidentStatus | 'all';
  category?: AssetCategory | 'all';
  assigned_station_id?: string | 'all';
  search_query?: string;
  serial_number?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface SystemMetrics {
  total_reports: number;
  pending_count: number;
  investigated_count: number;
  recovered_count: number;
  recovery_rate_percent: number;
  total_recovered_value: number;
  active_stations_count: number;
  active_patrol_officers: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export type NotificationType = 'alert' | 'status_update' | 'dispatch';
export type NotificationSeverity = 'critical' | 'high' | 'info';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  read: boolean;
  incident_id: string | null;
  created_at: string;
}

export interface CreateNotificationInput {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  incident_id?: string | null;
}

export interface RecoveredAsset {
  id: string;
  serial_number: string;
  normalized_serial: string;
  title: string;
  category: AssetCategory;
  recovery_station_id: string | null;
  recovery_station_name?: string;
  recovery_location: string;
  officer_badge: string | null;
  photo_urls?: string[];
  notes?: string | null;
  created_at: string;
}

export type AssetMatchStatus = 'pending_verification' | 'confirmed' | 'rejected';

export interface AssetMatch {
  id: string;
  stolen_report_id: string;
  recovered_asset_id: string;
  confidence_score: number; // 0 - 100
  match_type: 'exact' | 'fuzzy';
  status: AssetMatchStatus;
  stolen_incident?: IncidentReport;
  recovered_asset?: RecoveredAsset;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
}

export interface SerialCheckResult {
  status: 'stolen_flagged' | 'potential_match' | 'clear';
  query: string;
  normalized_query: string;
  confidence: number;
  incident_ref?: string;
  title?: string;
  category?: AssetCategory;
  precinct_name?: string;
  reported_date?: string;
  message: string;
}

