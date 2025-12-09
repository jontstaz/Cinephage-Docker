/**
 * Upgrade Monitor Task
 *
 * Searches for better quality releases for existing files.
 * Runs periodically (default: weekly) to upgrade content below quality cutoff.
 */

import { db } from '$lib/server/db/index.js';
import { monitoringHistory } from '$lib/server/db/schema.js';
import { monitoringSearchService } from '../search/MonitoringSearchService.js';
import { logger } from '$lib/logging/index.js';
import type { TaskResult } from '../MonitoringScheduler.js';

/**
 * Execute upgrade search task
 */
export async function executeUpgradeMonitorTask(): Promise<TaskResult> {
	const executedAt = new Date();
	logger.info('[UpgradeMonitorTask] Starting upgrade search');

	let itemsProcessed = 0;
	let itemsGrabbed = 0;
	let errors = 0;

	try {
		// Search for upgrades (both movies and episodes)
		const upgradeResults = await monitoringSearchService.searchForUpgrades({
			maxItems: 50 // Limit to prevent overwhelming indexers
		});

		itemsProcessed = upgradeResults.summary.searched;
		itemsGrabbed = upgradeResults.summary.grabbed;
		errors = upgradeResults.summary.errors;

		logger.info('[UpgradeMonitorTask] Upgrade search completed', {
			searched: upgradeResults.summary.searched,
			grabbed: upgradeResults.summary.grabbed,
			errors: upgradeResults.summary.errors
		});

		// Record history for each item
		for (const item of upgradeResults.items) {
			if (!item.searched && item.skipped) continue;

			await db.insert(monitoringHistory).values({
				taskType: 'upgrade',
				movieId: item.itemType === 'movie' ? item.itemId : undefined,
				episodeId: item.itemType === 'episode' ? item.itemId : undefined,
				status: item.grabbed
					? 'grabbed'
					: item.error
						? 'error'
						: item.releasesFound > 0
							? 'found'
							: 'no_results',
				releasesFound: item.releasesFound,
				releaseGrabbed: item.grabbeRelease,
				queueItemId: item.queueItemId,
				isUpgrade: true,
				// Note: oldScore and newScore would require additional tracking
				errorMessage: item.error,
				executedAt: executedAt.toISOString()
			});
		}

		logger.info('[UpgradeMonitorTask] Upgrade monitor task completed', {
			totalProcessed: itemsProcessed,
			totalGrabbed: itemsGrabbed,
			totalErrors: errors
		});

		return {
			taskType: 'upgrade',
			itemsProcessed,
			itemsGrabbed,
			errors,
			executedAt
		};
	} catch (error) {
		logger.error('[UpgradeMonitorTask] Task failed', error);
		throw error;
	}
}
