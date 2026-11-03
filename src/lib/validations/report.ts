/**
 * CivicGuard Citizen Incident Reporting - Zod Validation Schema
 * Enforces strict typing, string length constraints, geographic coordinate bounds,
 * and media file format/size checks.
 */
import { z } from 'zod';
import { AssetCategory } from '../../types';

// Constants for Evidence Photo Uploads
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const MAX_IMAGES_COUNT = 3;

/**
 * Custom file validator for client-side File objects
 */
export const EvidenceFileSchema = z.custom<File>((val) => val instanceof File, {
  message: 'Must be a valid File object',
})
  .refine((file) => file.size <= MAX_FILE_SIZE_BYTES, {
    message: 'Each image must be 5MB or smaller.',
  })
  .refine(
    (file) =>
      ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number]),
    {
      message: 'Allowed formats: JPEG, PNG, or WebP.',
    }
  );

/**
 * Strict Incident Report Schema
 */
export const ReportSchema = z.object({
  title: z
    .string()
    .min(5, { message: 'Title must be at least 5 characters long.' })
    .max(100, { message: 'Title cannot exceed 100 characters.' })
    .trim(),

  category: z.nativeEnum(AssetCategory),

  description: z
    .string()
    .min(20, {
      message: 'Please provide at least 20 characters describing the theft circumstances.',
    })
    .max(2000, { message: 'Description cannot exceed 2000 characters.' })
    .trim(),

  serialNumber: z
    .string()
    .trim()
    .max(64, { message: 'Serial number cannot exceed 64 characters.' })
    .regex(/^[a-zA-Z0-9\-_./\s]*$/, {
      message: 'Serial number may only contain alphanumeric characters, dashes, and slashes.',
    })
    .optional()
    .or(z.literal('')),

  estimatedValue: z
    .union([z.number().nonnegative({ message: 'Estimated value cannot be negative.' }), z.nan()])
    .optional()
    .nullable(),

  latitude: z
    .number()
    .min(-90.0, { message: 'Latitude must be between -90 and 90.' })
    .max(90.0, { message: 'Latitude must be between -90 and 90.' }),

  longitude: z
    .number()
    .min(-180.0, { message: 'Longitude must be between -180 and 180.' })
    .max(180.0, { message: 'Longitude must be between -180 and 180.' }),

  addressApprox: z
    .string()
    .max(200, { message: 'Address description cannot exceed 200 characters.' })
    .optional()
    .or(z.literal('')),

  incidentDate: z
    .string()
    .min(1, { message: 'Date of incident is required.' })
    .refine(
      (val) => {
        const date = new Date(val);
        const now = new Date();
        // Allow a 5-minute clock skew buffer
        return date.getTime() <= now.getTime() + 5 * 60 * 1000;
      },
      { message: 'Incident date cannot be in the future.' }
    ),

  images: z
    .array(EvidenceFileSchema)
    .max(MAX_IMAGES_COUNT, { message: `You can upload up to ${MAX_IMAGES_COUNT} images.` }),
});

export type ReportFormData = z.infer<typeof ReportSchema>;
