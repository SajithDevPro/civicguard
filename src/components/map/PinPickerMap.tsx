import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, MapPin, Check, Navigation, AlertCircle, Compass } from 'lucide-react';
import { GeoCoordinates, PoliceStation } from '../../types';
import {
  CARTO_ATTRIBUTION,
  CARTO_DARK_MATTER_URL,
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  createPinPickerIcon,
} from './MapConfig';
import { findNearestPoliceStation } from '../../services/db';

interface PinPickerMapProps {
  initialCoords?: GeoCoordinates | null;
  onCoordsChange: (coords: GeoCoordinates, approxAddress?: string) => void;
  stations?: PoliceStation[];
  heightClass?: string;
}

// Map Event Listener for Click-to-Pin
function MapClickHandler({ onLocationSelected }: { onLocationSelected: (coords: GeoCoordinates) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelected({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });
    },
  });
  return null;
}

// Controller to programmatic pan/fly
function MapRecenterController({ target }: { target: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(target, map.getZoom(), { animate: true, duration: 0.8 });
  }, [target, map]);
  return null;
}

/**
 * Approximate reverse geocoder providing immediate human-readable context
 * Uses coordinate sector analysis with fallback to neighborhood landmarks
 */
function approximateAddress(coords: GeoCoordinates): string {
  const { lat, lng } = coords;

  // Known neighborhood centroids in SF Metro area
  if (lat >= 37.795 && lng >= -122.42) return 'Fisherman’s Wharf / North Beach Corridor';
  if (lat >= 37.785 && lng >= -122.41) return 'Financial District / Embarcadero Plaza';
  if (lat >= 37.78 && lat < 37.79 && lng >= -122.415 && lng < -122.40) return 'Union Square / Market St Transit Center';
  if (lat >= 37.765 && lat < 37.78 && lng >= -122.43 && lng < -122.41) return 'Civic Center / SOMA Commercial Strip';
  if (lat >= 37.75 && lat < 37.765 && lng >= -122.43 && lng < -122.405) return 'Mission District / 16th St Corridor';
  if (lat >= 37.76 && lat < 37.78 && lng >= -122.46 && lng < -122.43) return 'Haight-Ashbury / Buena Vista Heights';
  if (lat >= 37.74 && lat < 37.76 && lng < -122.46) return 'Sunset District / Ocean Beach Sector';
  if (lat >= 37.76 && lat < 37.78 && lng >= -122.40) return 'Mission Bay / Chase Center Waterfront';

  return `Sector Lat ${lat.toFixed(4)}°, Lng ${Math.abs(lng).toFixed(4)}° W (Metro District)`;
}

export const PinPickerMap: React.FC<PinPickerMapProps> = ({
  initialCoords,
  onCoordsChange,
  stations = [],
  heightClass = 'h-[360px]',
}) => {
  const [position, setPosition] = useState<GeoCoordinates>(
    initialCoords || { lat: DEFAULT_MAP_CENTER[0], lng: DEFAULT_MAP_CENTER[1] }
  );
  const [approxAddress, setApproxAddress] = useState<string>(
    approximateAddress(initialCoords || { lat: DEFAULT_MAP_CENTER[0], lng: DEFAULT_MAP_CENTER[1] })
  );
  const [isGeolocating, setIsGeolocating] = useState(false);

  // Sync when initialCoords change externally
  useEffect(() => {
    if (initialCoords && (initialCoords.lat !== position.lat || initialCoords.lng !== position.lng)) {
      setPosition(initialCoords);
      const addr = approximateAddress(initialCoords);
      setApproxAddress(addr);
    }
  }, [initialCoords]);

  const pickerIcon = useMemo(() => createPinPickerIcon(), []);

  const handleSelectCoords = (newCoords: GeoCoordinates) => {
    setPosition(newCoords);
    const addr = approximateAddress(newCoords);
    setApproxAddress(addr);
    onCoordsChange(newCoords, addr);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GeoCoordinates = {
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        };
        handleSelectCoords(coords);
        setIsGeolocating(false);
      },
      (err) => {
        console.warn('Geolocation failed or denied, using metro center:', err);
        setIsGeolocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Find nearest precinct for live feedback
  const nearestResult = findNearestPoliceStation(position, stations);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-inner flex flex-col">
      {/* Top Banner Guide */}
      <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 z-10">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-100">CLICK OR DRAG PIN TO ACCURATE THEFT LOCATION</span>
        </div>
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isGeolocating}
          className="px-2 py-0.5 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors inline-flex items-center gap-1"
        >
          <Navigation className={`w-3 h-3 ${isGeolocating ? 'text-emerald-400 animate-spin' : 'text-slate-400'}`} />
          <span>{isGeolocating ? 'Detecting...' : 'My Device GPS'}</span>
        </button>
      </div>

      {/* Leaflet Map Frame */}
      <div className={`relative w-full ${heightClass}`}>
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={DEFAULT_ZOOM}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer attribution={CARTO_ATTRIBUTION} url={CARTO_DARK_MATTER_URL} maxZoom={19} />

          <MapRecenterController target={[position.lat, position.lng]} />
          <MapClickHandler onLocationSelected={handleSelectCoords} />

          {/* Draggable Citizen Pin Marker */}
          <Marker
            position={[position.lat, position.lng]}
            icon={pickerIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const latLng = marker.getLatLng();
                handleSelectCoords({
                  lat: Number(latLng.lat.toFixed(5)),
                  lng: Number(latLng.lng.toFixed(5)),
                });
              },
            }}
          />
        </MapContainer>

        {/* Live Coordinates Readout Box (Bottom Right) */}
        <div className="absolute bottom-3 right-3 z-[400] p-2.5 bg-slate-950/95 backdrop-blur border border-slate-800 rounded-md shadow-xl text-xs max-w-xs font-mono">
          <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider flex items-center justify-between mb-1">
            <span>Pin Target Coordinates</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-slate-100 font-bold tabular-nums">
            {position.lat.toFixed(5)}° N, {Math.abs(position.lng).toFixed(5)}° W
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-1">
            {approxAddress}
          </div>
          {nearestResult && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[10px] text-blue-300 flex items-center justify-between">
              <span>Jurisdiction:</span>
              <span className="font-semibold">{nearestResult.station.code} ({nearestResult.distanceKm.toFixed(1)} km)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
