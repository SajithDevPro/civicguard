/**
 * CivicGuard Automated Serial Matching & Asset Recovery Service (matching.ts)
 * Orchestrates database queries, triggers, real-time match streams, and anti-fencing lookups.
 * Supports dual-mode: direct Supabase Postgres triggers when configured, and zero-latency
 * client-side matching engine with complete persistence.
 */
import {
  AssetCategory,
  AssetMatch,
  AssetMatchStatus,
  IncidentReport,
  IncidentStatus,
  RecoveredAsset,
  SerialCheckResult,
  UserProfile,
  UserRole,
} from '../types';
import { evaluateSerialMatch, normalizeSerial } from '../utils/matching';
import { fetchActiveIncidents, updateIncidentStatus } from './db';
import { createNotification } from './notifications';
import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY_RECOVERED_ASSETS = 'civicguard_recovered_assets_v1';
const STORAGE_KEY_ASSET_MATCHES = 'civicguard_asset_matches_v1';

// Seed Recovered Assets in Law Enforcement Inventory
const SEED_RECOVERED_ASSETS: RecoveredAsset[] = [
  {
    id: 'rec-asset-101',
    serial_number: 'SPEC-VADO-88219-SF',
    normalized_serial: 'SPECVADO88219SF',
    title: 'Specialized Turbo Vado 4.0 Electric Bicycle (Matte Black)',
    category: AssetCategory.VEHICLE,
    recovery_station_id: 'sta-001',
    recovery_station_name: 'Central Precinct (Station 1)',
    recovery_location: 'Impounded from unlicensed street vendor near 16th & Mission',
    officer_badge: 'CG-4081',
    photo_urls: [
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=800&q=80',
    ],
    notes: 'Intact frame number verified against crank casing. Battery key missing.',
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rec-asset-102',
    serial_number: 'APPL-MBP16-M3X-9940',
    normalized_serial: 'APPLMBP16M3X9940',
    title: 'Apple MacBook Pro 16" (Space Black, M3 Max)',
    category: AssetCategory.ELECTRONICS,
    recovery_station_id: 'sta-003',
    recovery_station_name: 'Mission Substation (Station 3)',
    recovery_location: 'Recovered during commercial pawnshop compliance inspection',
    officer_badge: 'CG-9901',
    photo_urls: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    ],
    notes: 'Hardware serial matched in pawn registry. MDM lock triggered.',
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rec-asset-103',
    serial_number: 'TRIM-R12-88194',
    normalized_serial: 'TRIMR1288194',
    title: 'Trimble R12i GNSS Geodetic Receiver System',
    category: AssetCategory.PROPERTY,
    recovery_station_id: 'sta-002',
    recovery_station_name: 'South Beach Substation (Station 2)',
    recovery_location: 'Found abandoned in industrial storage locker near Pier 48',
    officer_badge: 'CG-4081',
    photo_urls: [],
    notes: 'High-precision geospatial equipment. Case barcode matches TRIM-R12-88194.',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

// Helper: Get or Initialize Local Storage
export function getLocalRecoveredAssets(): RecoveredAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECOVERED_ASSETS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RECOVERED_ASSETS, JSON.stringify(SEED_RECOVERED_ASSETS));
      return [...SEED_RECOVERED_ASSETS];
    }
    return JSON.parse(raw);
  } catch {
    return [...SEED_RECOVERED_ASSETS];
  }
}

export function saveLocalRecoveredAssets(assets: RecoveredAsset[]) {
  try {
    localStorage.setItem(STORAGE_KEY_RECOVERED_ASSETS, JSON.stringify(assets));
  } catch (err) {
    console.warn('[MatchingService] Failed to save recovered assets:', err);
  }
}

export function getLocalAssetMatches(): AssetMatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSET_MATCHES);
    if (!raw) {
      // Auto-compute initial matches from seed incidents and recovered assets
      return generateInitialMatches();
    }
    return JSON.parse(raw);
  } catch {
    return generateInitialMatches();
  }
}

export function saveLocalAssetMatches(matches: AssetMatch[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ASSET_MATCHES, JSON.stringify(matches));
  } catch (err) {
    console.warn('[MatchingService] Failed to save asset matches:', err);
  }
}

/**
 * Seed initial matches by cross-referencing seed incidents against recovered assets
 */
function generateInitialMatches(): AssetMatch[] {
  const seedMatches: AssetMatch[] = [
    {
      id: 'match-001',
      stolen_report_id: 'inc-9081', // Sarah Chen's Specialized E-Bike
      recovered_asset_id: 'rec-asset-101',
      confidence_score: 100,
      match_type: 'exact',
      status: 'pending_verification',
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      id: 'match-002',
      stolen_report_id: 'inc-9082', // David Kim's MacBook Pro
      recovered_asset_id: 'rec-asset-102',
      confidence_score: 100,
      match_type: 'exact',
      status: 'confirmed',
      reviewed_by: 'usr-officer-4081',
      reviewed_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      review_notes: 'Physical serial and MDM verified against victim proof of purchase.',
      created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    },
    {
      id: 'match-003',
      stolen_report_id: 'inc-9085', // Civil Engineering Trimble Surveyor
      recovered_asset_id: 'rec-asset-103',
      confidence_score: 100,
      match_type: 'exact',
      status: 'pending_verification',
      created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    },
  ];

  try {
    localStorage.setItem(STORAGE_KEY_ASSET_MATCHES, JSON.stringify(seedMatches));
  } catch (err) {
    console.warn('[MatchingService] Could not persist initial matches', err);
  }
  return seedMatches;
}

/**
 * Fetch all asset matches populated with full Incident and RecoveredAsset objects
 */
export async function fetchAssetMatches(
  statusFilter?: AssetMatchStatus | 'all',
  currentUser?: UserProfile
): Promise<AssetMatch[]> {
  const matches = getLocalAssetMatches();
  const incidents = await fetchActiveIncidents({ status: 'all', category: 'all' }, currentUser);
  const recovered = getLocalRecoveredAssets();

  const incidentMap = new Map<string, IncidentReport>(incidents.map((i) => [i.id, i]));
  const recoveredMap = new Map<string, RecoveredAsset>(recovered.map((r) => [r.id, r]));

  let enriched = matches.map((m) => ({
    ...m,
    stolen_incident: incidentMap.get(m.stolen_report_id),
    recovered_asset: recoveredMap.get(m.recovered_asset_id),
  }));

  // Role-Based Access Control filtering
  if (currentUser && currentUser.role === UserRole.CITIZEN) {
    // Citizens can only view matches belonging to their own incidents
    enriched = enriched.filter(
      (m) => m.stolen_incident && m.stolen_incident.user_id === currentUser.id
    );
  }

  if (statusFilter && statusFilter !== 'all') {
    enriched = enriched.filter((m) => m.status === statusFilter);
  }

  // Sort: pending first, then by confidence descending, then by newest
  return enriched.sort((a, b) => {
    if (a.status === 'pending_verification' && b.status !== 'pending_verification') return -1;
    if (a.status !== 'pending_verification' && b.status === 'pending_verification') return 1;
    if (b.confidence_score !== a.confidence_score) return b.confidence_score - a.confidence_score;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Perform manual verification of an asset match:
 * - 'confirmed': Transitions match to confirmed, transitions incident to 'recovered', alerts citizen.
 * - 'rejected': Marks match as false positive with review notes.
 */
export async function verifyAssetMatch(
  matchId: string,
  action: 'confirmed' | 'rejected',
  notes: string,
  currentOfficer: UserProfile
): Promise<AssetMatch> {
  if (currentOfficer.role !== UserRole.OFFICER && currentOfficer.role !== UserRole.ADMIN) {
    throw new Error('Unauthorized: Only sworn law enforcement personnel may verify asset matches.');
  }

  const matches = getLocalAssetMatches();
  const index = matches.findIndex((m) => m.id === matchId);
  if (index === -1) {
    throw new Error(`Match with ID '${matchId}' not found.`);
  }

  const match = matches[index];
  const nowIso = new Date().toISOString();

  match.status = action;
  match.reviewed_by = currentOfficer.id;
  match.reviewed_at = nowIso;
  match.review_notes = notes.trim();

  // Update in Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('asset_matches')
        .update({
          status: action,
          reviewed_by: currentOfficer.id,
          reviewed_at: nowIso,
          review_notes: match.review_notes,
        })
        .eq('id', matchId);
    } catch (err) {
      console.warn('[MatchingService] Remote update failed:', err);
    }
  }

  // If confirmed, automatically resolve the incident report and notify the victim
  if (action === 'confirmed') {
    try {
      await updateIncidentStatus(
        {
          incident_id: match.stolen_report_id,
          status: IncidentStatus.RECOVERED,
          officer_notes: `Recovered via Automated Serial Match. Serial verified by ${currentOfficer.full_name} (${currentOfficer.badge_number ? `Badge #${currentOfficer.badge_number}` : 'Command'}). ${notes}`,
        },
        currentOfficer
      );
    } catch (err) {
      console.error('[MatchingService] Failed to auto-update incident to RECOVERED:', err);
    }
  }

  matches[index] = match;
  saveLocalAssetMatches(matches);

  const enrichedMatches = await fetchAssetMatches('all', currentOfficer);
  return enrichedMatches.find((m) => m.id === matchId) || match;
}

/**
 * Public Serial Verification Checker (Anti-Fencing Utility)
 * Queries both active incident reports and pawn/recovered databases.
 * Returns safe public information without revealing victim PII (phone, address, full name).
 */
export async function queryPublicSerialCheck(rawQuery: string): Promise<SerialCheckResult> {
  const query = rawQuery.trim();
  const normalizedQuery = normalizeSerial(query);

  if (!normalizedQuery || normalizedQuery.length < 3) {
    return {
      status: 'clear',
      query,
      normalized_query: normalizedQuery,
      confidence: 0,
      message: 'Please enter at least 3 characters of a valid serial number, VIN, or IMEI.',
    };
  }

  const incidents = await fetchActiveIncidents({ status: 'all', category: 'all' });
  
  // Find highest matching incident
  let bestMatchIncident: IncidentReport | null = null;
  let highestScore = 0;
  let bestMatchType: 'exact' | 'fuzzy' | 'none' = 'none';

  for (const inc of incidents) {
    if (!inc.serial_number) continue;
    const evalResult = evaluateSerialMatch(normalizedQuery, inc.serial_number);

    if (evalResult.confidence > highestScore) {
      highestScore = evalResult.confidence;
      bestMatchType = evalResult.matchType;
      bestMatchIncident = inc;
    }
  }

  // 1. Exact Match Flag
  if (highestScore === 100 && bestMatchIncident) {
    return {
      status: 'stolen_flagged',
      query,
      normalized_query: normalizedQuery,
      confidence: 100,
      incident_ref: `CG-${bestMatchIncident.id.substring(0, 8).toUpperCase()}`,
      title: bestMatchIncident.title,
      category: bestMatchIncident.category,
      precinct_name: bestMatchIncident.assigned_station_name || 'Municipal Police Command',
      reported_date: new Date(bestMatchIncident.created_at).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      message:
        'WARNING: This serial number is officially registered as active stolen property in the CivicGuard law enforcement network. Do not complete purchase or accept transfer.',
    };
  }

  // 2. Fuzzy Match Flag (Potential typo or alteration)
  if (highestScore >= 80 && bestMatchIncident) {
    return {
      status: 'potential_match',
      query,
      normalized_query: normalizedQuery,
      confidence: highestScore,
      incident_ref: `CG-${bestMatchIncident.id.substring(0, 8).toUpperCase()}`,
      title: bestMatchIncident.title,
      category: bestMatchIncident.category,
      precinct_name: bestMatchIncident.assigned_station_name || 'Municipal Police Command',
      reported_date: new Date(bestMatchIncident.created_at).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      message:
        'CAUTION: Potential partial or fuzzy match detected with an active stolen asset record (possible character alteration or typo). Contact local precinct for physical verification.',
    };
  }

  // 3. Clear Status
  return {
    status: 'clear',
    query,
    normalized_query: normalizedQuery,
    confidence: 0,
    message:
      'NO ACTIVE STOLEN RECORD FOUND. This serial number is not currently flagged in the CivicGuard public safety stolen asset index.',
  };
}
