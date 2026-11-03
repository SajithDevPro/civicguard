/**
 * CivicGuard Sliding-Window Rate Limiter & Abuse Prevention Engine
 * Prevents automated scraping, serial number harvesting, and DDoS incident flooding.
 * Enforces strict rolling windows with persistence across tab refreshes.
 */
import { useEffect, useState, useCallback } from 'react';

export type RateLimitAction =
  | 'INCIDENT_REPORT'
  | 'SERIAL_LOOKUP'
  | 'AUTH_ATTEMPT'
  | 'BRIEFING_EXPORT';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  description: string;
}

export const RATE_LIMIT_RULES: Record<RateLimitAction, RateLimitConfig> = {
  INCIDENT_REPORT: {
    maxRequests: 3,
    windowSeconds: 900, // 15 minutes
    description: 'Incident submission limit (3 per 15 minutes)',
  },
  SERIAL_LOOKUP: {
    maxRequests: 20,
    windowSeconds: 60, // 1 minute
    description: 'Anti-fencing registry lookup limit (20 per minute)',
  },
  AUTH_ATTEMPT: {
    maxRequests: 5,
    windowSeconds: 300, // 5 minutes
    description: 'Authentication attempt limit (5 per 5 minutes)',
  },
  BRIEFING_EXPORT: {
    maxRequests: 10,
    windowSeconds: 600, // 10 minutes
    description: 'Briefing report export limit (10 per 10 minutes)',
  },
};

export interface RateLimitResult {
  allowed: boolean;
  action: RateLimitAction;
  remaining: number;
  limit: number;
  resetTimeMs: number;
  retryAfterSeconds: number;
  message?: string;
}

export class RateLimitError extends Error {
  statusCode: number;
  action: RateLimitAction;
  retryAfterSeconds: number;
  resetTimeMs: number;

  constructor(result: RateLimitResult) {
    super(
      result.message ||
        `Rate limit exceeded for ${result.action}. Retry in ${result.retryAfterSeconds}s.`
    );
    this.name = 'RateLimitError';
    this.statusCode = 429;
    this.action = result.action;
    this.retryAfterSeconds = result.retryAfterSeconds;
    this.resetTimeMs = result.resetTimeMs;
  }
}

const STORAGE_PREFIX = 'cg_rl_';

function getStorageKey(action: RateLimitAction, identifier: string): string {
  const cleanId = (identifier || 'anonymous').replace(/[^a-zA-Z0-9_\-]/g, '_');
  return `${STORAGE_PREFIX}${action}_${cleanId}`;
}

function loadTimestamps(key: string): number[] {
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTimestamps(key: string, timestamps: number[]): void {
  try {
    const serialized = JSON.stringify(timestamps);
    sessionStorage.setItem(key, serialized);
    localStorage.setItem(key, serialized);
  } catch {
    // Storage access may be restricted in sandboxed environments
  }
}

/**
 * Checks and increments the sliding-window rate limiter for a specific action and actor.
 */
export function checkRateLimit(
  action: RateLimitAction,
  identifier = 'current_user',
  options?: { recordAttempt?: boolean }
): RateLimitResult {
  const record = options?.recordAttempt !== false; // default true
  const rule = RATE_LIMIT_RULES[action];
  const now = Date.now();
  const windowMs = rule.windowSeconds * 1000;
  const cutoff = now - windowMs;

  const key = getStorageKey(action, identifier);
  const existingTimestamps = loadTimestamps(key);

  // Prune timestamps older than rolling window
  const validTimestamps = existingTimestamps.filter((ts) => ts > cutoff);

  if (validTimestamps.length >= rule.maxRequests) {
    const oldest = validTimestamps[0];
    const resetTimeMs = oldest + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

    return {
      allowed: false,
      action,
      remaining: 0,
      limit: rule.maxRequests,
      resetTimeMs,
      retryAfterSeconds,
      message: `Security Throttling: ${rule.description}. Please wait ${retryAfterSeconds} seconds before trying again.`,
    };
  }

  // Record current request timestamp
  if (record) {
    validTimestamps.push(now);
    saveTimestamps(key, validTimestamps);
  }

  const remaining = rule.maxRequests - validTimestamps.length;
  const oldest = validTimestamps.length > 0 ? validTimestamps[0] : now;
  const resetTimeMs = oldest + windowMs;
  const retryAfterSeconds = Math.max(0, Math.ceil((resetTimeMs - now) / 1000));

  return {
    allowed: true,
    action,
    remaining,
    limit: rule.maxRequests,
    resetTimeMs,
    retryAfterSeconds,
  };
}

/**
 * Enforces rate limit, throwing RateLimitError (HTTP 429 equivalent) if breached.
 */
export function enforceRateLimit(action: RateLimitAction, identifier = 'current_user'): void {
  const result = checkRateLimit(action, identifier, { recordAttempt: true });
  if (!result.allowed) {
    throw new RateLimitError(result);
  }
}

/**
 * Generates standard rate limit headers for API or mock responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTimeMs / 1000).toString(),
    ...(result.retryAfterSeconds > 0
      ? { 'Retry-After': result.retryAfterSeconds.toString() }
      : {}),
  };
}

/**
 * Reset rate limit counter for a specific action/identifier (e.g. on successful admin override).
 */
export function resetRateLimit(action: RateLimitAction, identifier = 'current_user'): void {
  const key = getStorageKey(action, identifier);
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * React hook for UI rate limiting feedback and live countdown timers.
 */
export function useRateLimiter(action: RateLimitAction, identifier = 'current_user') {
  const [status, setStatus] = useState<RateLimitResult>(() =>
    checkRateLimit(action, identifier, { recordAttempt: false })
  );
  const [countdown, setCountdown] = useState<number>(status.retryAfterSeconds);

  // Sync state
  const refresh = useCallback(() => {
    const res = checkRateLimit(action, identifier, { recordAttempt: false });
    setStatus(res);
    setCountdown(res.retryAfterSeconds);
    return res;
  }, [action, identifier]);

  // Live second countdown when rate limited
  useEffect(() => {
    if (!status.allowed && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            refresh();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status.allowed, countdown, refresh]);

  return {
    isThrottled: !status.allowed,
    remaining: status.remaining,
    limit: status.limit,
    countdown,
    message: status.message,
    refresh,
  };
}
