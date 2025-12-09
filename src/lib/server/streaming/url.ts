/**
 * URL Utilities
 *
 * Provides consistent base URL resolution for .strm files and proxy URLs.
 * This ensures URLs work correctly when accessed from external devices.
 */

import { getStreamingIndexerSettings } from './settings';

// Cache the database baseUrl to avoid repeated DB queries on every request
let cachedBaseUrl: string | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Get the base URL for generating stream URLs (synchronous version).
 * Uses cached database value, falls back to request-based resolution.
 *
 * Priority:
 * 1. Cached database baseUrl (from Cinephage Stream indexer settings)
 * 2. X-Forwarded headers (for reverse proxy setups like nginx/traefik)
 * 3. Request URL (fallback to request origin)
 *
 * @param request - The incoming request object
 * @returns The base URL to use for generating stream/proxy URLs
 */
export function getBaseUrl(request: Request): string {
	// 1. Check cached database value
	if (cachedBaseUrl && Date.now() < cacheExpiry) {
		return cachedBaseUrl;
	}

	// 2. Check for reverse proxy headers
	const forwardedHost = request.headers.get('x-forwarded-host');
	const forwardedProto = request.headers.get('x-forwarded-proto') || 'http';

	if (forwardedHost) {
		return `${forwardedProto}://${forwardedHost}`;
	}

	// 3. Fallback to request URL origin
	const url = new URL(request.url);
	return `${url.protocol}//${url.host}`;
}

/**
 * Get the base URL for generating stream URLs (async version).
 * Fetches from database and updates cache.
 *
 * Priority:
 * 1. Database baseUrl (from Cinephage Stream indexer settings)
 * 2. X-Forwarded headers (for reverse proxy setups like nginx/traefik)
 * 3. Request URL (fallback to request origin)
 *
 * @param request - The incoming request object
 * @returns The base URL to use for generating stream/proxy URLs
 */
export async function getBaseUrlAsync(request: Request): Promise<string> {
	// 1. Check database settings (and update cache)
	const settings = await getStreamingIndexerSettings();
	if (settings?.baseUrl) {
		const baseUrl = settings.baseUrl.replace(/\/$/, '');
		cachedBaseUrl = baseUrl;
		cacheExpiry = Date.now() + CACHE_TTL_MS;
		return baseUrl;
	}

	// 2. Check for reverse proxy headers
	const forwardedHost = request.headers.get('x-forwarded-host');
	const forwardedProto = request.headers.get('x-forwarded-proto') || 'http';

	if (forwardedHost) {
		return `${forwardedProto}://${forwardedHost}`;
	}

	// 3. Fallback to request URL origin
	const url = new URL(request.url);
	return `${url.protocol}//${url.host}`;
}

/**
 * Refresh the cached base URL from database.
 * Call this on startup or when settings change.
 */
export async function refreshBaseUrlCache(): Promise<void> {
	const settings = await getStreamingIndexerSettings();
	if (settings?.baseUrl) {
		cachedBaseUrl = settings.baseUrl.replace(/\/$/, '');
		cacheExpiry = Date.now() + CACHE_TTL_MS;
	}
}
