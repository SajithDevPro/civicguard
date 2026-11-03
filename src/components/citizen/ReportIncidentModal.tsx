/**
 * CivicGuard Citizen Incident Reporting Wizard (ReportIncidentModal.tsx)
 * 4-Step guided incident submission modal utilizing react-hook-form, zod,
 * interactive PinPickerMap, and client-side compressed photo evidence upload.
 */
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  Car,
  Laptop,
  Package,
  ShieldAlert,
  MapPin,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  Barcode,
  Calendar,
  Trash2,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  Send,
  Crosshair,
  Printer,
  FileCheck,
} from 'lucide-react';
import { AssetCategory, GeoCoordinates, IncidentReport, PoliceStation, UserProfile } from '../../types';
import {
  ReportFormData,
  ReportSchema,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGES_COUNT,
  ACCEPTED_IMAGE_TYPES,
} from '../../lib/validations/report';
import { PinPickerMap } from '../map/PinPickerMap';
import { uploadMultipleEvidence } from '../../services/storage';
import { createIncidentReport, findNearestPoliceStation } from '../../services/db';
import { validateFileBuffer } from '../../lib/security/sanitizer';
import { useRateLimiter } from '../../lib/security/rateLimiter';

interface ReportIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialCoords?: GeoCoordinates | null;
  stations: PoliceStation[];
  onReportCreated: (incident: IncidentReport) => void;
}

const STEPS = [
  { id: 1, title: 'Item Details', desc: 'Category & Identifiers' },
  { id: 2, title: 'Geolocation', desc: 'Pinpoint Theft Location' },
  { id: 3, title: 'Photo Evidence', desc: 'Upload Pictures & Receipts' },
  { id: 4, title: 'Review & File', desc: 'Official Intake Verification' },
];

export const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialCoords,
  stations,
  onReportCreated,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<{ file: File; url: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [createdCase, setCreatedCase] = useState<IncidentReport | null>(null);
  const [fileSecurityError, setFileSecurityError] = useState<string | null>(null);

  // Sliding-window rate limit hook for incident reporting
  const {
    isThrottled,
    countdown,
    message: throttleMessage,
    refresh: refreshRateLimit,
  } = useRateLimiter('INCIDENT_REPORT', currentUser.id);

  // Initialize today's date formatted for datetime-local input
  const defaultDate = new Date().toISOString().slice(0, 16);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(ReportSchema) as any,
    defaultValues: {
      title: '',
      category: AssetCategory.PROPERTY,
      description: '',
      serialNumber: '',
      estimatedValue: null,
      latitude: initialCoords?.lat ?? 37.7749,
      longitude: initialCoords?.lng ?? -122.4194,
      addressApprox: '',
      incidentDate: defaultDate,
      images: [],
    },
    mode: 'onChange',
  });

  const formValues = watch();

  // Keep coordinates updated if initialCoords change
  useEffect(() => {
    if (initialCoords) {
      setValue('latitude', initialCoords.lat);
      setValue('longitude', initialCoords.lng);
    }
  }, [initialCoords, setValue]);

  // Clean up object URLs on unmount or reset
  useEffect(() => {
    return () => {
      imagePreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [imagePreviews]);

  if (!isOpen) return null;

  // Handle Drag & Drop / File Input Selection with Magic Bytes Inspection
  const handleFilesAdded = async (incomingFiles: FileList | File[]) => {
    setFileSecurityError(null);
    const validFiles: File[] = [];

    for (const file of Array.from(incomingFiles)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as any)) {
        setFileSecurityError(`File "${file.name}" format not accepted. Only JPEG, PNG, or WebP allowed.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileSecurityError(`File "${file.name}" exceeds the 5MB size limit.`);
        continue;
      }

      // Cryptographic magic header byte inspection
      const inspection = await validateFileBuffer(file);
      if (!inspection.isValid) {
        setFileSecurityError(`Security Check Failed: ${inspection.error}`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const combined = [...imageFiles, ...validFiles].slice(0, MAX_IMAGES_COUNT);
    setImageFiles(combined);
    setValue('images', combined, { shouldValidate: true });

    // Generate previews
    const previews = combined.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    const updated = imageFiles.filter((_, i) => i !== index);
    setImageFiles(updated);
    setValue('images', updated, { shouldValidate: true });

    URL.revokeObjectURL(imagePreviews[index].url);
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Step Navigation with validation gates
  const handleNextStep = async () => {
    if (currentStep === 1) {
      const valid = await trigger(['title', 'category', 'description', 'serialNumber', 'estimatedValue', 'incidentDate']);
      if (!valid) return;
    } else if (currentStep === 2) {
      const valid = await trigger(['latitude', 'longitude', 'addressApprox']);
      if (!valid) return;
    } else if (currentStep === 3) {
      const valid = await trigger(['images']);
      if (!valid) return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Submission Handler
  const onFormSubmit = async (data: ReportFormData) => {
    try {
      setIsSubmitting(true);
      setUploadProgress(20);

      // 1. Upload evidence images to Supabase Storage / local preview cache
      const tempReportId = `rep-${Date.now().toString(36)}`;
      let evidenceUrls: string[] = [];

      if (imageFiles.length > 0) {
        setUploadProgress(40);
        evidenceUrls = await uploadMultipleEvidence(
          imageFiles,
          currentUser.id,
          tempReportId,
          (_, percent) => {
            setUploadProgress(40 + Math.round(percent * 0.4));
          }
        );
      }

      setUploadProgress(85);

      // 2. Persist incident record via core database service
      const newIncident = await createIncidentReport(
        {
          title: data.title,
          description: data.description,
          category: data.category,
          lat: data.latitude,
          lng: data.longitude,
          serial_number: data.serialNumber ? data.serialNumber.trim().toUpperCase() : null,
          address_approx: data.addressApprox || 'Geospatial pin recorded',
          estimated_value: data.estimatedValue ? Number(data.estimatedValue) : null,
          evidence_urls: evidenceUrls,
          reporter_name: currentUser.full_name,
          reporter_phone: currentUser.phone || undefined,
        },
        currentUser
      );

      setUploadProgress(100);
      setCreatedCase(newIncident);
      onReportCreated(newIncident);
    } catch (err: any) {
      alert(`Submission failed: ${err.message || 'Please verify form inputs.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAndReset = () => {
    reset();
    setImageFiles([]);
    setImagePreviews([]);
    setCurrentStep(1);
    setCreatedCase(null);
    onClose();
  };

  // Nearest police precinct resolution
  const nearestStationResult = findNearestPoliceStation(
    { lat: formValues.latitude, lng: formValues.longitude },
    stations
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl text-slate-100 overflow-hidden my-4 sm:my-8 flex flex-col">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                CivicGuard Citizen Incident Intake
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Official Stolen Property & Asset Recovery Filing Wizard
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseAndReset}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Ribbon */}
        {!createdCase && (
          <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-3">
            <div className="grid grid-cols-4 gap-2">
              {STEPS.map((step) => {
                const isCurrent = currentStep === step.id;
                const isComplete = currentStep > step.id;

                return (
                  <div key={step.id} className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                          isComplete
                            ? 'bg-emerald-500 text-black'
                            : isCurrent
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isComplete ? '✓' : step.id}
                      </span>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isCurrent ? 'text-white' : isComplete ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                    {/* Progress Bar Line */}
                    <div
                      className={`h-1 w-full rounded-full transition-colors ${
                        isComplete
                          ? 'bg-emerald-500'
                          : isCurrent
                          ? 'bg-emerald-500/40'
                          : 'bg-slate-800'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form Content / Success State */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {createdCase ? (
            /* SUCCESS CONFIRMATION VIEW */
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">
                  Incident Report Officially Logged
                </h3>
                <p className="text-xs text-slate-400">
                  Your case has been broadcast to precinct dispatch terminals and registered in the municipal recovery network.
                </p>
              </div>

              {/* Official Tracking Case ID Dossier Card */}
              <div className="max-w-md mx-auto p-4 bg-slate-950 border border-slate-800 rounded-lg text-left space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400 uppercase">Tracking Case ID</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {createdCase.id.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500">Asset:</span> {createdCase.title}
                  </div>
                  <div>
                    <span className="text-slate-500">Serial Tag:</span>{' '}
                    {createdCase.serial_number || 'None'}
                  </div>
                  <div>
                    <span className="text-slate-500">Assigned Station:</span>{' '}
                    <strong className="text-sky-300">{createdCase.assigned_station_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>{' '}
                    <span className="text-amber-300 font-bold">PENDING DETECTIVE INTAKE</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded border border-slate-700 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseAndReset}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded border border-emerald-500 shadow"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
              {/* STEP 1: ITEM DETAILS & IDENTIFICATION */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  {/* Category Grid */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2 font-semibold">
                      Select Asset Category *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        {
                          id: AssetCategory.VEHICLE,
                          label: 'Vehicles / Bikes',
                          desc: 'Bicycle, e-bike, scooter, motorcycle',
                          icon: Car,
                          color: 'text-red-400',
                          border: 'border-red-500/40',
                        },
                        {
                          id: AssetCategory.ELECTRONICS,
                          label: 'Electronics',
                          desc: 'Laptops, phones, tablets, cameras',
                          icon: Laptop,
                          color: 'text-amber-400',
                          border: 'border-amber-500/40',
                        },
                        {
                          id: AssetCategory.PROPERTY,
                          label: 'Property',
                          desc: 'Luggage, tools, jewelry, equipment',
                          icon: Package,
                          color: 'text-pink-400',
                          border: 'border-pink-500/40',
                        },
                        {
                          id: AssetCategory.OTHER,
                          label: 'Other Incident',
                          desc: 'Public property or other stolen items',
                          icon: ShieldAlert,
                          color: 'text-slate-400',
                          border: 'border-slate-500/40',
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = formValues.category === item.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setValue('category', item.id as AssetCategory, { shouldValidate: true })}
                            className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                              isSelected
                                ? `bg-slate-800 ${item.border} ring-1 ring-emerald-500/50 shadow-md`
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Icon className={`w-5 h-5 ${item.color}`} />
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white leading-tight">
                                {item.label}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                {item.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title & Estimated Value */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                        Asset Title & Model *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2025 Specialized Turbo Vado Electric Bike (Matte Black)"
                        {...register('title')}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      {errors.title && (
                        <p className="mt-1 text-[11px] text-red-400">{errors.title.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                        Estimated Value (USD)
                      </label>
                      <div className="relative">
                        <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="3200.00"
                          {...register('estimatedValue', { valueAsNumber: true })}
                          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      {errors.estimatedValue && (
                        <p className="mt-1 text-[11px] text-red-400">{errors.estimatedValue.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Serial Number / VIN & Incident Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                        Serial Number / VIN / IMEI
                      </label>
                      <div className="relative">
                        <Barcode className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="e.g. SN-99420-EB / C02GK99ZMD6R"
                          {...register('serialNumber')}
                          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Anti-fencing registry automatically broadcasts to licensed regional pawnshops.
                      </p>
                      {errors.serialNumber && (
                        <p className="mt-1 text-[11px] text-red-400">{errors.serialNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                        Date & Time of Incident *
                      </label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="datetime-local"
                          {...register('incidentDate')}
                          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      {errors.incidentDate && (
                        <p className="mt-1 text-[11px] text-red-400">{errors.incidentDate.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Circumstances & Description */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Detailed Incident Circumstances * (min 20 chars)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe what occurred, any witnesses, surveillance cameras in sight, lock cutting marks, or distinctive scratches..."
                      {...register('description')}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span>{formValues.description?.length || 0} / 2000 chars</span>
                      {errors.description && (
                        <span className="text-red-400">{errors.description.message}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: GEOLOCATION VERIFICATION */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <h3 className="font-bold text-white">Geospatial Location Verification</h3>
                      <p className="text-[11px] text-slate-400">
                        Drag the pin or click on the map to pinpoint exact coordinates of the theft.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            setValue('latitude', Number(pos.coords.latitude.toFixed(5)));
                            setValue('longitude', Number(pos.coords.longitude.toFixed(5)));
                          });
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 rounded flex items-center gap-1.5"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Use Current GPS Location</span>
                    </button>
                  </div>

                  {/* Integrated PinPickerMap */}
                  <PinPickerMap
                    initialCoords={{ lat: formValues.latitude, lng: formValues.longitude }}
                    onCoordsChange={(coords, approx) => {
                      setValue('latitude', coords.lat, { shouldValidate: true });
                      setValue('longitude', coords.lng, { shouldValidate: true });
                      if (approx && !formValues.addressApprox) {
                        setValue('addressApprox', approx);
                      }
                    }}
                    stations={stations}
                    heightClass="h-[300px]"
                  />

                  {/* Manual Landmark or Street description */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Street Intersection or Landmark Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Outside Powell St BART station, south exit"
                      {...register('addressApprox')}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Automated Jurisdiction Sector Callout */}
                  {nearestStationResult && (
                    <div className="p-3 bg-slate-950 border border-blue-500/30 rounded-lg flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span>
                          Dispatch Jurisdiction:{' '}
                          <strong className="text-white">{nearestStationResult.station.name}</strong>
                        </span>
                      </div>
                      <span className="text-blue-300">
                        {nearestStationResult.distanceKm.toFixed(2)} km distance
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: PHOTO EVIDENCE UPLOAD */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                      Upload Photo Evidence & Ownership Receipts
                    </h3>
                    <p className="text-xs text-slate-400">
                      Attach up to 3 photos of the stolen item, serial number tags, purchase receipts, or broken security locks.
                    </p>
                  </div>

                  {/* Dropzone Container */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
                    }}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-6 text-center transition-colors bg-slate-950/40 cursor-pointer"
                    onClick={() => {
                      const input = document.getElementById('evidence-file-input');
                      input?.click();
                    }}
                  >
                    <input
                      id="evidence-file-input"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleFilesAdded(e.target.files);
                      }}
                    />

                    <UploadCloud className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                    <div className="text-xs font-semibold text-slate-200">
                      Click to upload photos or drag and drop files here
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      JPEG, PNG, or WebP up to 5MB each (Max {MAX_IMAGES_COUNT} photos)
                    </div>
                  </div>

                  {/* Cryptographic Magic Byte Inspection Error Banner */}
                  {fileSecurityError && (
                    <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="font-mono">{fileSecurityError}</span>
                    </div>
                  )}

                  {/* Image Preview Grid */}
                  {imagePreviews.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-slate-400">
                        Attached Files ({imagePreviews.length}/{MAX_IMAGES_COUNT}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {imagePreviews.map((item, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-2 flex flex-col gap-2"
                          >
                            <img
                              src={item.url}
                              alt={`Evidence preview ${idx + 1}`}
                              className="w-full h-28 object-cover rounded bg-slate-900"
                            />
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                              <span className="truncate max-w-[120px]">{item.file.name}</span>
                              <span className="text-slate-500">
                                {(item.file.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-3 right-3 p-1 rounded bg-red-950/90 text-red-300 border border-red-700/60 hover:bg-red-800 transition-colors shadow"
                              title="Delete file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {imagePreviews.length === 0 && (
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded text-xs text-slate-500 italic text-center">
                      No photos attached. Attaching photos is optional but significantly increases detective recovery likelihood.
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: REVIEW & SUBMIT */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                      Review Incident Report Before Formal Lodging
                    </h3>
                    <p className="text-xs text-slate-400">
                      Verify all information below. Once lodged, reports are legally recorded and dispatched to law enforcement.
                    </p>
                  </div>

                  {/* Summary Dossier Card */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-slate-500 uppercase block text-[10px]">Title & Model</span>
                        <span className="text-white font-bold">{formValues.title}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block text-[10px]">Asset Category</span>
                        <span className="text-sky-300 uppercase font-semibold">{formValues.category}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-slate-500 uppercase block text-[10px]">Serial Number</span>
                        <span className="text-slate-200">{formValues.serialNumber || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block text-[10px]">Est. Value</span>
                        <span className="text-emerald-400 font-bold">
                          {formValues.estimatedValue ? `$${formValues.estimatedValue}` : 'Not declared'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block text-[10px]">Evidence Photos</span>
                        <span className="text-slate-200">{imageFiles.length} attached</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-500 uppercase block text-[10px]">Location & Jurisdiction</span>
                      <div className="text-slate-200">
                        {formValues.latitude.toFixed(5)}° N, {Math.abs(formValues.longitude).toFixed(5)}° W
                        {formValues.addressApprox ? ` (${formValues.addressApprox})` : ''}
                      </div>
                      {nearestStationResult && (
                        <div className="text-blue-300 text-[11px]">
                          Dispatch Assigned: {nearestStationResult.station.name}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-slate-500 uppercase block text-[10px] mb-1">Theft Circumstances</span>
                      <p className="text-slate-300 text-xs font-sans line-clamp-3 bg-slate-900/60 p-2 rounded">
                        {formValues.description}
                      </p>
                    </div>
                    {/* Sliding-Window Rate Limit Warning Banner */}
                    {isThrottled && (
                      <div className="p-3.5 bg-amber-950/60 border border-amber-600/70 rounded-lg text-amber-200 text-xs font-mono space-y-1">
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Submission Rate Limit Active (Max 3 / 15m)</span>
                        </div>
                        <p className="text-[11px] text-amber-300/80">
                          To protect municipal systems against automated spam, submissions are temporarily throttled. Retry available in: <strong className="text-white font-bold">{countdown} seconds</strong>.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Submitting Progress Bar */}
                  {isSubmitting && (
                    <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                        <span>Uploading Evidence & Registering Case...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Wizard Footer Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={currentStep === 1 ? handleCloseAndReset : handlePrevStep}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{currentStep === 1 ? 'Cancel' : 'Previous'}</span>
                </button>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded border border-emerald-500 transition-colors flex items-center gap-1.5 shadow"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || isThrottled}
                    className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded border border-emerald-500 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isSubmitting
                        ? 'Lodging Case...'
                        : isThrottled
                        ? `Throttled (${countdown}s)`
                        : 'Submit Official Report'}
                    </span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
