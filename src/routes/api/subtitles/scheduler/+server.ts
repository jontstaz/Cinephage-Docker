import { json, type RequestEvent } from '@sveltejs/kit';
import { getSubtitleScheduler } from '$lib/server/subtitles/services/SubtitleScheduler';
import { z } from 'zod';
import { logger } from '$lib/logging';

type RequestHandler = (event: RequestEvent) => Promise<Response>;

const schedulerSettingsSchema = z.object({
	enabled: z.boolean().optional(),
	searchIntervalMinutes: z.number().int().min(15).max(10080).optional(), // 15 min to 1 week
	upgradeEnabled: z.boolean().optional(),
	autoSyncEnabled: z.boolean().optional(),
	maxConcurrentSearches: z.number().int().min(1).max(10).optional(),
	minScoreForAutoDownload: z.number().int().min(0).max(360).optional()
});

/**
 * GET /api/subtitles/scheduler
 * Get scheduler status and settings.
 */
export const GET: RequestHandler = async () => {
	const scheduler = getSubtitleScheduler();

	return json({
		isRunning: scheduler.isActive(),
		settings: scheduler.getSettings()
	});
};

/**
 * POST /api/subtitles/scheduler
 * Control the scheduler (start/stop/trigger).
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: { action?: string };
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const scheduler = getSubtitleScheduler();
	const action = data.action;

	switch (action) {
		case 'start':
			await scheduler.start();
			return json({ success: true, message: 'Scheduler started' });

		case 'stop':
			scheduler.stop();
			return json({ success: true, message: 'Scheduler stopped' });

		case 'trigger':
			// Trigger an immediate search cycle
			scheduler.triggerSearch().catch((error) => {
				logger.error(
					'[API] Error in triggered subtitle search',
					error instanceof Error ? error : undefined
				);
			});
			return json({ success: true, message: 'Search cycle triggered' });

		default:
			return json({ error: 'Invalid action. Use: start, stop, or trigger' }, { status: 400 });
	}
};

/**
 * PUT /api/subtitles/scheduler
 * Update scheduler settings.
 */
export const PUT: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = schedulerSettingsSchema.safeParse(data);

	if (!result.success) {
		return json(
			{
				error: 'Validation failed',
				details: result.error.flatten()
			},
			{ status: 400 }
		);
	}

	const scheduler = getSubtitleScheduler();

	try {
		await scheduler.updateSettings(result.data);

		return json({
			success: true,
			settings: scheduler.getSettings()
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
