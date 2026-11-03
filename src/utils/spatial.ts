/**
 * CivicGuard Spatial Intelligence & Density Utilities
 * High-performance geospatial operations, Haversine geodesy, bounding-box culling,
 * category weight normalization, and grid-based cluster grouping.
 */
import L from 'leaflet';
import { AssetCategory, GeoCoordinates, IncidentReport, IncidentStatus } from '../types';

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface SpatialCluster {
  id: string;
  centroid: GeoCoordinates;
  count: number;
  totalWeight: number;
  riskIndex: number; // 0 - 100 score
  incidents: IncidentReport[];
  categoryCounts: Record<AssetCategory, number>;
  topCategory: AssetCategory;
  radiusMeters: number;
}

/**
 * Computes exact physical distance in meters between two lat/lng coordinates
 * using the spherical Haversine formula.
 */
export function calculateDistanceMeters(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  const earthRadiusMeters = 6371000;
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const lat1Rad = (coord1.lat * Math.PI) / 180;
  const lat2Rad = (coord2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

/**
 * Computes distance in kilometers
 */
export function calculateDistanceKm(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  return calculateDistanceMeters(coord1, coord2) / 1000;
}

/**
 * Filters incident arrays to only those located within current Leaflet map bounds.
 * Accepts either a Leaflet LatLngBounds instance or a manual BoundingBox object.
 */
export function filterIncidentsByBounds(
  incidents: IncidentReport[],
  bounds: L.LatLngBounds | BoundingBox | null
): IncidentReport[] {
  if (!bounds) return incidents;

  if ('getSouthWest' in bounds) {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return incidents.filter(
      (inc) =>
        inc.lat >= sw.lat &&
        inc.lat <= ne.lat &&
        inc.lng >= sw.lng &&
        inc.lng <= ne.lng
    );
  }

  return incidents.filter(
    (inc) =>
      inc.lat >= bounds.minLat &&
      inc.lat <= bounds.maxLat &&
      inc.lng >= bounds.minLng &&
      inc.lng <= bounds.maxLng
  );
}

/**
 * Assigns severity weights to incidents based on asset category:
 * - Vehicle = 3 (Grand theft auto / public safety risk)
 * - Electronics = 2 (High fencing velocity / confidential data)
 * - Property = 1 (Standard larceny)
 * - Other = 1
 * With slight multiplier for unresolved / pending cases.
 */
export function calculateIncidentWeight(incident: IncidentReport): number {
  let baseWeight = 1;

  switch (incident.category) {
    case AssetCategory.VEHICLE:
      baseWeight = 3.0;
      break;
    case AssetCategory.ELECTRONICS:
      baseWeight = 2.0;
      break;
    case AssetCategory.PROPERTY:
      baseWeight = 1.0;
      break;
    default:
      baseWeight = 1.0;
  }

  // Pending cases retain higher operational heat weight than recovered cases
  if (incident.status === IncidentStatus.PENDING) {
    baseWeight *= 1.25;
  } else if (incident.status === IncidentStatus.RECOVERED) {
    baseWeight *= 0.6;
  }

  return Number(baseWeight.toFixed(2));
}

/**
 * Transforms an array of incidents into weighted [lat, lng, intensity] tuples
 * for ingestion into Leaflet.heat layer. Intensity is normalized between 0.1 and 1.0.
 */
export function formatHeatmapPoints(
  incidents: IncidentReport[]
): [number, number, number][] {
  return incidents.map((inc) => {
    const weight = calculateIncidentWeight(inc);
    // Intensity scale from 0.2 to 1.0
    const intensity = Math.min(Math.max(weight / 3.75, 0.25), 1.0);
    return [inc.lat, inc.lng, intensity];
  });
}

/**
 * Spatial Grid Clustering Algorithm:
 * Groups points within a spatial radius (default ~300 meters) into cluster nodes
 * for fast multi-incident visualization and high-zoom sector aggregation.
 */
export function computeSpatialClusters(
  incidents: IncidentReport[],
  clusterRadiusMeters = 350
): SpatialCluster[] {
  const clusters: SpatialCluster[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < incidents.length; i++) {
    const parent = incidents[i];
    if (visited.has(parent.id)) continue;

    visited.add(parent.id);
    const clusterIncidents: IncidentReport[] = [parent];

    let sumLat = parent.lat;
    let sumLng = parent.lng;
    let totalWeight = calculateIncidentWeight(parent);

    const categoryCounts: Record<AssetCategory, number> = {
      [AssetCategory.VEHICLE]: parent.category === AssetCategory.VEHICLE ? 1 : 0,
      [AssetCategory.ELECTRONICS]: parent.category === AssetCategory.ELECTRONICS ? 1 : 0,
      [AssetCategory.PROPERTY]: parent.category === AssetCategory.PROPERTY ? 1 : 0,
      [AssetCategory.OTHER]: parent.category === AssetCategory.OTHER ? 1 : 0,
    };

    // Look for neighboring incidents within the cluster radius
    for (let j = i + 1; j < incidents.length; j++) {
      const neighbor = incidents[j];
      if (visited.has(neighbor.id)) continue;

      const dist = calculateDistanceMeters(
        { lat: parent.lat, lng: parent.lng },
        { lat: neighbor.lat, lng: neighbor.lng }
      );

      if (dist <= clusterRadiusMeters) {
        visited.add(neighbor.id);
        clusterIncidents.push(neighbor);
        sumLat += neighbor.lat;
        sumLng += neighbor.lng;
        totalWeight += calculateIncidentWeight(neighbor);
        categoryCounts[neighbor.category] = (categoryCounts[neighbor.category] || 0) + 1;
      }
    }

    const count = clusterIncidents.length;
    const centroid: GeoCoordinates = {
      lat: Number((sumLat / count).toFixed(5)),
      lng: Number((sumLng / count).toFixed(5)),
    };

    // Determine dominant category
    let topCategory = parent.category;
    let maxCatCount = 0;
    (Object.keys(categoryCounts) as AssetCategory[]).forEach((cat) => {
      if (categoryCounts[cat] > maxCatCount) {
        maxCatCount = categoryCounts[cat];
        topCategory = cat;
      }
    });

    // Compute regional risk index (0 - 100)
    // Factoring frequency and category severity
    const rawScore = totalWeight * 14 + count * 6;
    const riskIndex = Math.min(Math.round(rawScore), 99);

    clusters.push({
      id: `cluster-${centroid.lat.toFixed(3)}-${centroid.lng.toFixed(3)}`,
      centroid,
      count,
      totalWeight: Number(totalWeight.toFixed(1)),
      riskIndex,
      incidents: clusterIncidents,
      categoryCounts,
      topCategory,
      radiusMeters: clusterRadiusMeters,
    });
  }

  // Sort clusters descending by severity/risk index
  return clusters.sort((a, b) => b.riskIndex - a.riskIndex);
}

/**
 * Filter incidents by a temporal relative time window
 */
export function filterIncidentsByTimeWindow(
  incidents: IncidentReport[],
  windowHours: number | 'all'
): IncidentReport[] {
  if (windowHours === 'all') return incidents;

  const now = Date.now();
  const windowMillis = windowHours * 60 * 60 * 1000;

  return incidents.filter((inc) => {
    const reportTime = new Date(inc.created_at).getTime();
    return now - reportTime <= windowMillis;
  });
}

/**
 * Export incident array as standard RFC 7946 GeoJSON FeatureCollection
 */
export function exportIncidentsToGeoJSON(incidents: IncidentReport[]): string {
  const geojson = {
    type: 'FeatureCollection',
    features: incidents.map((inc) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [inc.lng, inc.lat],
      },
      properties: {
        id: inc.id,
        title: inc.title,
        category: inc.category,
        status: inc.status,
        serial_number: inc.serial_number,
        estimated_value: inc.estimated_value,
        address: inc.address_approx,
        created_at: inc.created_at,
        weight: calculateIncidentWeight(inc),
      },
    })),
  };

  return JSON.stringify(geojson, null, 2);
}
