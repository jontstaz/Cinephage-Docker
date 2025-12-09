import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { monitoringScheduler } from '$lib/server/monitoring/MonitoringScheduler.js';
import { logger } from '$lib/logging';

/**
 * POST /api/monitoring/search/upgrade
 * Manually trigger upgrade search
 */
export const POST: RequestHandler = async () => {
	try {
		const result = await monitoringScheduler.runUpgradeSearch();

		return json({
			success: true,
			message: 'Upgrade search completed',
			result
		});
	} catch (error) {
		logger.error('[API] Failed to run upgrade search', error instanceof Error ? error : undefined);
		return json(
			{
				success: false,
				error: 'Failed to run upgrade search',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
