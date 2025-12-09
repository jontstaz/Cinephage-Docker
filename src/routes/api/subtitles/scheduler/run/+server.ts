import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtitleScheduler } from '$lib/server/subtitles/services/SubtitleScheduler';
import { logger } from '$lib/logging';

export const POST: RequestHandler = async () => {
	try {
		const scheduler = getSubtitleScheduler();

		// Trigger a manual search cycle
		// Run in background so we can respond immediately
		scheduler.triggerSearch().catch((error) => {
			logger.error(
				'[API] Error during manual subtitle search',
				error instanceof Error ? error : undefined
			);
		});

		return json({
			success: true,
			message: 'Subtitle search started'
		});
	} catch (error) {
		logger.error(
			'[API] Error triggering subtitle search',
			error instanceof Error ? error : undefined
		);
		return json({ error: 'Failed to trigger subtitle search' }, { status: 500 });
	}
};
