/**
 * Cutoff Unmet Task
 *
 * Searches for content with files that are below the profile's quality cutoff.
 * Runs periodically (default: daily) to upgrade content that hasn't reached target quality.
 *
 * Note: This uses the same search logic as UpgradeMonitorTask. History is recorded
 * by UpgradeMonitorTask to avoid duplicate entries - this task only triggers the search.
 */

import { monitoringSearchService } from '../search/MonitoringSearchService.js';
import { logger } from '$lib/logging/index.js';
import type { TaskResult } from '../MonitoringScheduler.js';

/**
 * Execute cutoff unmet search task
 */
export async function executeCutoffUnmetTask(): Promise<TaskResult> {
	const executedAt = new Date();
	logger.info('[CutoffUnmetTask] Starting cutoff unmet search');

	let itemsProcessed = 0;
	let itemsGrabbed = 0;
	let errors = 0;

	try {
		// Search for upgrades (items below cutoff)
		// Uses the same search as UpgradeMonitorTask - history is recorded there
		// to avoid duplicate entries in the monitoring history
		const upgradeResults = await monitoringSearchService.searchForUpgrades({
			maxItems: 50
		});

		itemsProcessed = upgradeResults.summary.searched;
		itemsGrabbed = upgradeResults.summary.grabbed;
		errors = upgradeResults.summary.errors;

		logger.info('[CutoffUnmetTask] Cutoff unmet task completed', {
			searched: upgradeResults.summary.searched,
			grabbed: upgradeResults.summary.grabbed,
			errors: upgradeResults.summary.errors
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
