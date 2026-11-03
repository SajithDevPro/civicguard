/**
 * CivicGuard GovTech Security Architecture & HTTP Header Directives
 * Configures Content-Security-Policy (CSP), HSTS, and Zero-Trust transport standards.
 */

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://*.cartocdn.com',
    'https://*.basemaps.cartocdn.com',
    'https://*.tile.openstreetmap.org',
    'https://*.openstreetmap.org',
    'https://images.unsplash.com',
    'https://*.supabase.co',
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://*.cartocdn.com',
    'https://*.basemaps.cartocdn.com',
    'https://*.tile.openstreetmap.org',
    'https://generativelanguage.googleapis.com',
  ],
  'worker-src': ["'self'", 'blob:'],
  'frame-src': ["'self'"],
  'frame-ancestors': ["'self'", 'https://*.google.com', 'https://*.run.app'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
};

/**
 * Builds the canonical Content-Security-Policy string from directives
 */
export function buildCspHeader(directives = CSP_DIRECTIVES): string {
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

export const HTTP_SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': buildCspHeader(),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
};

/**
 * Verifies if a given URI destination is permitted by the active Content Security Policy connect-src rules
 */
export function isAllowedConnectOrigin(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const allowedPatterns = [
      /^localhost(:\d+)?$/,
      /^127\.0\.0\.1(:\d+)?$/,
      /\.supabase\.co$/,
      /\.cartocdn\.com$/,
      /\.openstreetmap\.org$/,
      /\.googleapis\.com$/,
      /\.run\.app$/,
    ];
    return allowedPatterns.some((pattern) => pattern.test(parsed.hostname));
  } catch {
    return false;
  }
}
