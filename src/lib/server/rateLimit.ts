/**
 * Simple in-memory rate limiter using sliding window.
 * For production, consider using Redis or similar.
 */

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Rate limiting options.
 */
export interface RateLimitOptions {
	/** Time window in milliseconds */
	windowMs: number;
	/** Maximum requests allowed per window */
	maxRequests: number;
}

/**
 * Rate limit check result.
 */
export interface RateLimitResult {
	/** Whether the request is allowed */
	allowed: boolean;
	/** Remaining requests in current window */
	remaining: number;
	/** Unix timestamp when limit resets */
	resetAt: number;
}

/**
 * Default rate limit options.
 */
export const DEFAULT_RATE_LIMIT: RateLimitOptions = {
	windowMs: 60_000, // 1 minute
	maxRequests: 100 // 100 requests per minute
};

/**
 * Checks if a request is within rate limits.
 *
 * @param key - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param options - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 *
 * @example
 * const result = checkRateLimit(`ip:${clientIp}`);
 * if (!result.allowed) {
 *   return json({ error: 'Rate limit exceeded' }, { status: 429 });
 * }
 */
export function checkRateLimit(
	key: string,
	options: RateLimitOptions = DEFAULT_RATE_LIMIT
): RateLimitResult {
	const now = Date.now();
	const entry = store.get(key);

	// No existing entry or window has expired - create new entry
	if (!entry || entry.resetAt <= now) {
		store.set(key, {
			count: 1,
			resetAt: now + options.windowMs
		});
		return {
			allowed: true,
			remaining: options.maxRequests - 1,
			resetAt: now + options.windowMs
		};
	}

	// Check if over limit
	if (entry.count >= options.maxRequests) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: entry.resetAt
		};
	}

	// Increment and allow
	entry.count++;
	return {
		allowed: true,
		remaining: options.maxRequests - entry.count,
		resetAt: entry.resetAt
	};
}

/**
 * Clears rate limit entries older than maxAge.
 * Call periodically to prevent memory leaks.
 *
 * @param maxAge - Maximum age in milliseconds (default: 5 minutes)
 */
export function cleanupRateLimits(maxAge: number = 5 * 60_000): void {
	const now = Date.now();
	for (const [key, entry] of store.entries()) {
		if (entry.resetAt + maxAge < now) {
			store.delete(key);
		}
	}
}

/**
 * Creates rate limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
	return {
		'X-RateLimit-Remaining': String(result.remaining),
		'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
		...(result.allowed
			? {}
			: { 'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)) })
	};
}
