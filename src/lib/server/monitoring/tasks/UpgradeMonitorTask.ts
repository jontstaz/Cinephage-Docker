/**
 * Upgrade Monitor Task
 *
 * Searches for better quality releases for ALL existing files.
 * Runs periodically (default: weekly) to find any possible upgrades,
 * regardless of whether the current file has met the quality cutoff.
 *
 * Note: This differs from CutoffUnmetTask which only searches items
 * that are below the target quality cutoff.
 */

import { db } from '$lib/server/db/index.js';
import { monitoringHistory } from '$lib/server/db/schema.js';
import { monitoringSearchService } from '../search/MonitoringSearchService.js';
import { logger } from '$lib/logging/index.js';
import type { TaskResult } from '../MonitoringScheduler.js';

/**
 * Execute upgrade search task
 * @param taskHistoryId - Optional ID linking to taskHistory for activity tracking
 */
export async function executeUpgradeMonitorTask(taskHistoryId?: string): Promise<TaskResult> {
	const executedAt = new Date();
	logger.info('[UpgradeMonitorTask] Starting upgrade search', { taskHistoryId });

	let itemsProcessed = 0;
	let itemsGrabbed = 0;
	let errors = 0;

	try {
		// Search for ALL potential upgrades (both movies and episodes)
		// cutoffUnmetOnly: false means we search everything, not just items below cutoff
		const upgradeResults = await monitoringSearchService.searchForUpgrades({
			maxItems: 50, // Limit to prevent overwhelming indexers
			cutoffUnmetOnly: false // Search all items for potential upgrades
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
				taskHistoryId,
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
				releaseGrabbed: item.grabbedRelease,
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
