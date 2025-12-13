/**
 * Cutoff Unmet Task
 *
 * Searches for content with files that are below the profile's quality cutoff.
 * Runs periodically (default: daily) to upgrade content that hasn't reached target quality.
 *
 * Note: This differs from UpgradeMonitorTask which searches ALL items for potential upgrades.
 * CutoffUnmetTask ONLY searches items that are below their target quality cutoff.
 */

import { db } from '$lib/server/db/index.js';
import { monitoringHistory } from '$lib/server/db/schema.js';
import { monitoringSearchService } from '../search/MonitoringSearchService.js';
import { logger } from '$lib/logging/index.js';
import type { TaskResult } from '../MonitoringScheduler.js';

/**
 * Execute cutoff unmet search task
 * @param taskHistoryId - Optional ID linking to taskHistory for activity tracking
 */
export async function executeCutoffUnmetTask(taskHistoryId?: string): Promise<TaskResult> {
	const executedAt = new Date();
	logger.info('[CutoffUnmetTask] Starting cutoff unmet search', { taskHistoryId });

	let itemsProcessed = 0;
	let itemsGrabbed = 0;
	let errors = 0;

	try {
		// Search for items below quality cutoff only
		// cutoffUnmetOnly: true means we only search items that haven't reached target quality
		const cutoffResults = await monitoringSearchService.searchForUpgrades({
			maxItems: 50,
			cutoffUnmetOnly: true // Only search items below cutoff
		});

		itemsProcessed = cutoffResults.summary.searched;
		itemsGrabbed = cutoffResults.summary.grabbed;
		errors = cutoffResults.summary.errors;

		logger.info('[CutoffUnmetTask] Cutoff unmet search completed', {
			searched: cutoffResults.summary.searched,
			grabbed: cutoffResults.summary.grabbed,
			errors: cutoffResults.summary.errors
		});

		// Record history for each item
		for (const item of cutoffResults.items) {
			if (!item.searched && item.skipped) continue;

			await db.insert(monitoringHistory).values({
				taskHistoryId,
				taskType: 'cutoffUnmet',
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
				errorMessage: item.error,
				executedAt: executedAt.toISOString()
			});
		}

		logger.info('[CutoffUnmetTask] Cutoff unmet task completed', {
			totalProcessed: itemsProcessed,
			totalGrabbed: itemsGrabbed,
			totalErrors: errors
		});

		return {
			taskType: 'cutoff_unmet',
			itemsProcessed,
			itemsGrabbed,
			errors,
			executedAt
		};
	} catch (error) {
		logger.error('[CutoffUnmetTask] Task failed', error);
		throw error;
	}
}
