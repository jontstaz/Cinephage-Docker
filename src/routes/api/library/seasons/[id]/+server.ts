import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { seasons, episodes } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/logging';

/**
 * PATCH /api/library/seasons/[id]
 * Update season settings (primarily monitoring)
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const { monitored } = body;

		// Validate season exists
		const [season] = await db.select().from(seasons).where(eq(seasons.id, params.id)).limit(1);

		if (!season) {
			return json({ success: false, error: 'Season not found' }, { status: 404 });
		}

		const updateData: Record<string, unknown> = {};

		if (typeof monitored === 'boolean') {
			updateData.monitored = monitored;
		}

		if (Object.keys(updateData).length === 0) {
			return json({ success: false, error: 'No valid fields to update' }, { status: 400 });
		}

		// Update season
		await db.update(seasons).set(updateData).where(eq(seasons.id, params.id));

		// If toggling monitoring, optionally update all episodes in this season
		if (typeof monitored === 'boolean' && body.updateEpisodes === true) {
			await db.update(episodes).set({ monitored }).where(eq(episodes.seasonId, params.id));
		}

		return json({ success: true });
	} catch (error) {
		logger.error('[API] Error updating season', error instanceof Error ? error : undefined);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to update season'
			},
			{ status: 500 }
		);
	}
};

// Alias PUT to PATCH for convenience
export const PUT: RequestHandler = PATCH;
