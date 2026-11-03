/**
 * CivicGuard Zero-Trust Input Sanitization & File Validation Engine
 * Protects against Cross-Site Scripting (XSS), SQL Injection sequences,
 * and malicious file upload / polyglot / extension spoofing attacks.
 */
import { CreateIncidentInput, UserProfile } from '../../types';

export interface FileValidationResult {
  isValid: boolean;
  detectedMime: string | null;
  detectedExtension: string | null;
  error?: string;
  safeFilename?: string;
  fileSizeBytes: number;
}

// Magic byte signatures for verified media formats
const MAGIC_SIGNATURES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46], // "RIFF"
  WEBP_TYPE: [0x57, 0x45, 0x42, 0x50], // "WEBP" at offset 8
  PDF: [0x25, 0x50, 0x44, 0x46], // "%PDF"
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB maximum
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

/**
 * Strips HTML tags, script vectors, event handlers, and javascript: protocols.
 */
export function sanitizeHtml(raw: string): string {
  if (!raw) return '';
  return raw
    // Remove script / iframe / style / embed / object tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    // Remove any remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove dangerous pseudoprotocols
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
    // Remove inline event handlers (onerror=, onload=, etc.)
    .replace(/\bon\w+\s*=/gi, '');
}

/**
 * Sanitizes generic user text (e.g. titles, addresses, descriptions).
 * Retains normal punctuation while stripping control characters, XSS vectors, and SQL injection syntax.
 */
export function sanitizeText(input: string, maxLength = 2000): string {
  if (!input) return '';
  
  let cleaned = sanitizeHtml(input);

  // Strip null bytes and non-printable control characters (except newline, tab, carriage return)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Neutralize aggressive SQL injection comment sequences & stacked query delimiters
  cleaned = cleaned
    .replace(/--/g, '—') // replace SQL comment with em-dash
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line C-style comment syntax
    .replace(/;\s*(DROP|DELETE|UPDATE|ALTER|INSERT|CREATE|TRUNCATE|EXEC|UNION)\b/gi, ' $1');

  // Trim to specified maximum length
  return cleaned.trim().slice(0, maxLength);
}

/**
 * Sanitizes serial numbers, VINs, and IMEIs.
 * Only allows uppercase alphanumeric characters and safe separators (hyphen, dot, slash, underscore).
 */
export function sanitizeSerialNumber(serial: string): string {
  if (!serial) return '';
  // Strip all HTML/script tags first
  const cleanStr = sanitizeHtml(serial);
  // Keep only uppercase alphanumeric characters, dashes, dots, and underscores
  return cleanStr
    .toUpperCase()
    .replace(/[^A-Z0-9.\-_/]/g, '')
    .slice(0, 64);
}

/**
 * Validates and sanitizes a URL, allowing only safe HTTPS and HTTP URLs.
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validates and sanitizes an entire Incident Input payload before database execution.
 */
export function sanitizeIncidentInput(input: CreateIncidentInput): CreateIncidentInput {
  return {
    title: sanitizeText(input.title, 120),
    description: sanitizeText(input.description, 2000),
    category: input.category,
    lat: Number(input.lat.toFixed(6)),
    lng: Number(input.lng.toFixed(6)),
    serial_number: input.serial_number ? sanitizeSerialNumber(input.serial_number) : null,
    address_approx: input.address_approx ? sanitizeText(input.address_approx, 150) : undefined,
    estimated_value: input.estimated_value && !isNaN(Number(input.estimated_value))
      ? Math.max(0, Math.min(10000000, Number(input.estimated_value)))
      : null,
    reporter_name: input.reporter_name ? sanitizeText(input.reporter_name, 100) : undefined,
    reporter_phone: input.reporter_phone ? sanitizeText(input.reporter_phone, 30) : undefined,
    evidence_urls: (input.evidence_urls || [])
      .map((url) => sanitizeUrl(url))
      .filter((u): u is string => u !== null)
      .slice(0, 10), // Limit to 10 evidence attachments
  };
}

/**
 * Sanitizes user profile updates.
 */
export function sanitizeUserProfile(profile: Partial<UserProfile>): Partial<UserProfile> {
  const result: Partial<UserProfile> = { ...profile };
  if (result.full_name) {
    result.full_name = sanitizeText(result.full_name, 100);
  }
  if (result.email) {
    result.email = sanitizeText(result.email, 120).toLowerCase();
  }
  if (result.badge_number) {
    result.badge_number = sanitizeSerialNumber(result.badge_number).slice(0, 20);
  }
  if (result.phone) {
    result.phone = sanitizeText(result.phone, 30);
  }
  return result;
}

/**
 * Inspects a byte buffer's magic header bytes to determine true MIME type
 * and prevent extension-spoofing attacks (e.g. payload.php.png).
 */
export function inspectMagicBytes(bytes: Uint8Array): { mimeType: string | null; extension: string | null } {
  if (bytes.length < 12) {
    return { mimeType: null, extension: null };
  }

  // Check JPEG (FF D8 FF)
  if (
    bytes[0] === MAGIC_SIGNATURES.JPEG[0] &&
    bytes[1] === MAGIC_SIGNATURES.JPEG[1] &&
    bytes[2] === MAGIC_SIGNATURES.JPEG[2]
  ) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }

  // Check PNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    MAGIC_SIGNATURES.PNG.every((expected, index) => bytes[index] === expected)
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }

  // Check WEBP (RIFF....WEBP)
  const isRiff = MAGIC_SIGNATURES.WEBP_RIFF.every((expected, index) => bytes[index] === expected);
  const isWebp = MAGIC_SIGNATURES.WEBP_TYPE.every((expected, index) => bytes[index + 8] === expected);
  if (isRiff && isWebp) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  // Check PDF (%PDF - 25 50 44 46)
  if (
    MAGIC_SIGNATURES.PDF.every((expected, index) => bytes[index] === expected)
  ) {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }

  return { mimeType: null, extension: null };
}

/**
 * Validates a browser File instance against magic bytes, allowed MIME types, and size.
 * Returns a sanitized filename and validation status.
 */
export async function validateFileBuffer(file: File): Promise<FileValidationResult> {
  // 1. File Size Verification
  if (!file || file.size === 0) {
    return {
      isValid: false,
      detectedMime: null,
      detectedExtension: null,
      error: 'File is empty or unreadable.',
      fileSizeBytes: 0,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      detectedMime: null,
      detectedExtension: null,
      error: `File size exceeds the 10 MB security limit (Received: ${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
      fileSizeBytes: file.size,
    };
  }

  // 2. Read first 64 bytes for magic signature inspection
  try {
    const slice = file.slice(0, 64);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { mimeType, extension } = inspectMagicBytes(bytes);

    if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
      return {
        isValid: false,
        detectedMime: mimeType,
        detectedExtension: extension,
        error: 'Security Reject: File header signature does not match an approved image format (JPEG, PNG, WEBP) or PDF.',
        fileSizeBytes: file.size,
      };
    }

    // 3. Generate hardened, path-traversal-free filename
    const cleanBasename = file.name
      .replace(/[\x00-\x1F\x7F]/g, '') // remove control chars
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_') // sanitize unsafe characters
      .replace(/\.+/g, '.') // collapse multiple dots
      .slice(0, 50);

    const randomNonce = Math.random().toString(36).substring(2, 10);
    const safeFilename = `evidence_${Date.now()}_${randomNonce}.${extension}`;

    return {
      isValid: true,
      detectedMime: mimeType,
      detectedExtension: extension,
      safeFilename,
      fileSizeBytes: file.size,
    };
  } catch (err: any) {
    return {
      isValid: false,
      detectedMime: null,
      detectedExtension: null,
      error: `Failed to inspect file buffer: ${err?.message || 'IO Error'}`,
      fileSizeBytes: file.size,
    };
  }
}
