import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { episodes } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/logging';

/**
 * PATCH /api/library/episodes/[id]
 * Update episode settings (primarily monitoring)
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const { monitored, wantsSubtitlesOverride } = body;

		// Validate episode exists
		const [episode] = await db.select().from(episodes).where(eq(episodes.id, params.id)).limit(1);

		if (!episode) {
			return json({ success: false, error: 'Episode not found' }, { status: 404 });
		}

		const updateData: Record<string, unknown> = {};

		if (typeof monitored === 'boolean') {
			updateData.monitored = monitored;
		}
		if (wantsSubtitlesOverride !== undefined) {
			// Can be true, false, or null (to inherit from series)
			updateData.wantsSubtitlesOverride = wantsSubtitlesOverride;
		}

		if (Object.keys(updateData).length === 0) {
			return json({ success: false, error: 'No valid fields to update' }, { status: 400 });
		}

		// Update episode
		await db.update(episodes).set(updateData).where(eq(episodes.id, params.id));

		return json({ success: true });
	} catch (error) {
		logger.error('[API] Error updating episode', error instanceof Error ? error : undefined);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to update episode'
			},
			{ status: 500 }
		);
	}
};

// Alias PUT to PATCH for convenience
export const PUT: RequestHandler = PATCH;
