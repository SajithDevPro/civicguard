import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  MapPin,
  Building2,
  DollarSign,
  Barcode,
  Send,
  Crosshair,
  ShieldCheck,
} from 'lucide-react';
import {
  AssetCategory,
  CreateIncidentInput,
  GeoCoordinates,
  PoliceStation,
  UserProfile,
  ValidationResult,
} from '../types';
import { findNearestPoliceStation, validateReportInput } from '../services/db';
import { PinPickerMap } from './map/PinPickerMap';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateIncidentInput) => Promise<void>;
  currentUser: UserProfile;
  initialCoords: GeoCoordinates | null;
  stations: PoliceStation[];
}

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  initialCoords,
  stations,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AssetCategory>(AssetCategory.PROPERTY);
  const [lat, setLat] = useState<number>(initialCoords?.lat ?? 37.7749);
  const [lng, setLng] = useState<number>(initialCoords?.lng ?? -122.4194);
  const [serialNumber, setSerialNumber] = useState('');
  const [addressApprox, setAddressApprox] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update coordinates whenever initialCoords changes (e.g. from map click)
  useEffect(() => {
    if (initialCoords) {
      setLat(initialCoords.lat);
      setLng(initialCoords.lng);
    }
  }, [initialCoords]);

  // Compute nearest station in real time to show jurisdiction preview
  const nearestResult = findNearestPoliceStation({ lat, lng }, stations);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const inputPayload: CreateIncidentInput = {
      title,
      description,
      category,
      lat: Number(lat),
      lng: Number(lng),
      serial_number: serialNumber.trim() ? serialNumber.trim() : null,
      address_approx: addressApprox.trim() ? addressApprox.trim() : null,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      reporter_name: currentUser.full_name,
      reporter_phone: currentUser.phone || undefined,
    };

    const validation: ValidationResult = validateReportInput(inputPayload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(inputPayload);
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to file incident report.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-lg shadow-2xl text-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                File Stolen Property & Public Safety Report
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Official intake dispatch form · Verified Citizen Filing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.form && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 rounded text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
              Incident Title / Asset Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Stolen Specialized Turbo Vado Electric Bicycle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {errors.title && <p className="mt-1 text-[11px] text-red-400">{errors.title}</p>}
          </div>

          {/* Category & Estimated Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                Asset Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value={AssetCategory.PROPERTY}>Property & General Valuables</option>
                <option value={AssetCategory.VEHICLE}>Vehicle / Bicycle / Transit</option>
                <option value={AssetCategory.ELECTRONICS}>Electronics & Computers</option>
                <option value={AssetCategory.OTHER}>Other Public Safety Incident</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                Estimated Value (USD)
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="3500.00"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              {errors.estimated_value && (
                <p className="mt-1 text-[11px] text-red-400">{errors.estimated_value}</p>
              )}
            </div>
          </div>

          {/* Serial Number & Address Approx */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                Serial Number / VIN (Anti-Fencing)
              </label>
              <div className="relative">
                <Barcode className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. SN-8921-X99"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Indexed for instant police and pawn shop anti-fencing matching.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                Approximate Street Address / Landmark
              </label>
              <input
                type="text"
                placeholder="e.g. Outside Union Square Transit Hub"
                value={addressApprox}
                onChange={(e) => setAddressApprox(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Interactive Geospatial Pin Picker Map & Reverse Geocode */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300">
              Precise Geospatial Location Picker (Drag or Click to Set)
            </label>
            <PinPickerMap
              initialCoords={{ lat, lng }}
              onCoordsChange={(coords, approx) => {
                setLat(coords.lat);
                setLng(coords.lng);
                if (approx && !addressApprox) {
                  setAddressApprox(approx);
                }
              }}
              stations={stations}
              heightClass="h-[220px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono text-slate-400">
            <div>
              <span>Latitude: </span>
              <span className="text-slate-200 tabular-nums">{lat.toFixed(5)}° N</span>
            </div>
            <div>
              <span>Longitude: </span>
              <span className="text-slate-200 tabular-nums">{Math.abs(lng).toFixed(5)}° W</span>
            </div>
          </div>

          {/* Jurisdiction Resolution Preview Box */}
          {nearestResult && (
            <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  Auto-Assigned Jurisdiction:{' '}
                  <strong className="text-white">{nearestResult.station.name}</strong>
                </span>
              </div>
              <span className="font-mono text-[11px] text-blue-300">
                {nearestResult.distanceKm.toFixed(2)} km away
              </span>
            </div>
          )}

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
              Incident Circumstances & Chain of Events *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Detail time of discovery, lock type, suspect descriptions, surveillance cameras in vicinity, or marks of identification..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {errors.description && (
              <p className="mt-1 text-[11px] text-red-400">{errors.description}</p>
            )}
          </div>

          {/* Footer Submit & Disclaimers */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 font-mono">
              Filing as: <span className="text-slate-300">{currentUser.full_name}</span> ({currentUser.email})
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting to Dispatch...' : 'Submit Official Report'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
