/**
 * Cloudflare detection service (Prowlarr-style).
 * Detects when responses are Cloudflare challenge/block pages.
 */

/**
 * Error thrown when Cloudflare protection is detected.
 */
export class CloudflareProtectedError extends Error {
	constructor(
		public readonly host: string,
		public readonly statusCode: number
	) {
		super(`Cloudflare protection detected on ${host}`);
		this.name = 'CloudflareProtectedError';
	}
}

/**
 * Server names that indicate Cloudflare/DDoS protection.
 * Based on Prowlarr's CloudFlareDetectionService.cs
 */
const PROTECTION_SERVER_NAMES = ['cloudflare', 'cloudflare-nginx', 'ddos-guard'];

/**
 * Content patterns that indicate challenge pages.
 * These patterns appear in Cloudflare's challenge/block HTML.
 */
const CHALLENGE_PATTERNS = [
	'<title>Just a moment...</title>',
	'<title>Access denied</title>',
	'<title>Attention Required!</title>',
	'error code: 1020',
	'cf-browser-verification',
	'cf_chl_opt',
	'__cf_chl_tk',
	'_cf_chl_opt'
];

/**
 * Check if a response indicates Cloudflare protection.
 *
 * Detection logic (from Prowlarr):
 * 1. Check if server header indicates Cloudflare/DDoS-Guard
 * 2. Check status codes typical of challenges (503, 403, 429)
 * 3. Check content for challenge patterns
 *
 * @param statusCode - HTTP status code
 * @param headers - Response headers
 * @param body - Response body text
 * @returns True if Cloudflare protection is detected
 */
export function isCloudflareProtected(statusCode: number, headers: Headers, body: string): boolean {
	// Check server header for known protection services
	const server = headers.get('server')?.toLowerCase() ?? '';
	const hasProtectionServer = PROTECTION_SERVER_NAMES.some((name) => server.includes(name));

	// If server header indicates Cloudflare + error status code + challenge content
	if (hasProtectionServer) {
		// Check status codes typical of Cloudflare challenges
		if (statusCode === 503 || statusCode === 403 || statusCode === 429) {
			// Check content for challenge patterns
			if (CHALLENGE_PATTERNS.some((pattern) => body.includes(pattern))) {
				return true;
			}
		}
	}

	// Also check 200 responses that might be challenge pages
	// Some Cloudflare setups return 200 with a challenge page
	// This is a fallback - check for the most distinctive pattern
	if (body.includes('<title>Just a moment...</title>')) {
		return true;
	}

	// Check for ray ID in body combined with challenge patterns
	// Ray ID is always present in Cloudflare responses
	if (body.includes('Ray ID:') || body.includes('ray-id')) {
		if (CHALLENGE_PATTERNS.some((pattern) => body.includes(pattern))) {
			return true;
		}
	}

	return false;
}

/**
 * Check response for Cloudflare protection and throw if detected.
 *
 * @param url - The URL that was fetched
 * @param statusCode - HTTP status code
 * @param headers - Response headers
 * @param body - Response body text
 * @throws CloudflareProtectedError if protection is detected
 */
export function detectAndThrow(
	url: string,
	statusCode: number,
	headers: Headers,
	body: string
): void {
	if (isCloudflareProtected(statusCode, headers, body)) {
		const host = new URL(url).hostname;
		throw new CloudflareProtectedError(host, statusCode);
	}
}
