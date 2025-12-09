import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { episodes } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/logging';
import { searchOnAdd } from '$lib/server/library/searchOnAdd.js';
import { monitoringScheduler } from '$lib/server/monitoring/MonitoringScheduler.js';

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

		// Detect if monitoring is being enabled (was false, now true)
		const wasUnmonitored = !episode.monitored;
		const nowMonitored = typeof monitored === 'boolean' && monitored === true;

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

		// If monitoring was just enabled and episode has no file, check if we should trigger a search
		if (wasUnmonitored && nowMonitored && !episode.hasFile) {
			const settings = await monitoringScheduler.getSettings();

			if (settings.searchOnMonitorEnabled) {
				// Fire and forget - don't block the response
				searchOnAdd.searchForEpisode({ episodeId: params.id }).catch((err) => {
					logger.error('[API] Background search on episode monitor enable failed', {
						episodeId: params.id,
						error: err instanceof Error ? err.message : 'Unknown error'
					});
				});

				logger.info('[API] Triggered search on monitor enable for episode', {
					episodeId: params.id
				});
			}
		}

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
