import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRateLimitRegistry } from '$lib/server/indexers/ratelimit';

/**
 * GET /api/rate-limits
 * Returns current rate limit status for all indexers
 */
export const GET: RequestHandler = async () => {
	const registry = getRateLimitRegistry();
	return json({
		limiters: registry.getSummary()
	});
};

/**
 * DELETE /api/rate-limits
 * Clears all rate limiters (they'll be recreated with fresh configs)
 */
export const DELETE: RequestHandler = async () => {
	const registry = getRateLimitRegistry();
	registry.clear(); // Fully remove limiters so they get recreated with new config
	return json({ success: true, message: 'All rate limiters cleared' });
};
