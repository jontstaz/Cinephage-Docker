/**
 * Missing Content Task
 *
 * Searches for monitored movies and episodes that don't have files yet.
 * Runs periodically (default: daily) to find and grab missing content.
 */

import { db } from '$lib/server/db/index.js';
import { monitoringHistory } from '$lib/server/db/schema.js';
import { monitoringSearchService } from '../search/MonitoringSearchService.js';
import { logger } from '$lib/logging/index.js';
import type { TaskResult } from '../MonitoringScheduler.js';

/**
 * Execute missing content search task
 * @param taskHistoryId - Optional ID linking to taskHistory for activity tracking
 */
export async function executeMissingContentTask(taskHistoryId?: string): Promise<TaskResult> {
	const executedAt = new Date();
	logger.info('[MissingContentTask] Starting missing content search', { taskHistoryId });

	let itemsProcessed = 0;
	let itemsGrabbed = 0;
	let errors = 0;

	try {
		// Search for missing movies
		logger.info('[MissingContentTask] Searching for missing movies');
		const movieResults = await monitoringSearchService.searchMissingMovies();

		itemsProcessed += movieResults.summary.searched;
		itemsGrabbed += movieResults.summary.grabbed;
		errors += movieResults.summary.errors;

		logger.info('[MissingContentTask] Missing movies search completed', {
			searched: movieResults.summary.searched,
			grabbed: movieResults.summary.grabbed,
			errors: movieResults.summary.errors
		});

		// Record history for each movie
		for (const item of movieResults.items) {
			if (!item.searched && item.skipped) continue; // Skip recording skipped items

			await db.insert(monitoringHistory).values({
				taskHistoryId,
				taskType: 'missing',
				movieId: item.itemType === 'movie' ? item.itemId : undefined,
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
				isUpgrade: false,
				errorMessage: item.error,
				executedAt: executedAt.toISOString()
			});
		}

		// Search for missing episodes
		logger.info('[MissingContentTask] Searching for missing episodes');
		const episodeResults = await monitoringSearchService.searchMissingEpisodes();

		itemsProcessed += episodeResults.summary.searched;
		itemsGrabbed += episodeResults.summary.grabbed;
		errors += episodeResults.summary.errors;

		logger.info('[MissingContentTask] Missing episodes search completed', {
			searched: episodeResults.summary.searched,
			grabbed: episodeResults.summary.grabbed,
			errors: episodeResults.summary.errors
		});

		// Record history for each episode
		for (const item of episodeResults.items) {
			if (!item.searched && item.skipped) continue;

			await db.insert(monitoringHistory).values({
				taskHistoryId,
				taskType: 'missing',
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
				isUpgrade: false,
				errorMessage: item.error,
				executedAt: executedAt.toISOString()
			});
		}

		logger.info('[MissingContentTask] Missing content task completed', {
			totalProcessed: itemsProcessed,
			totalGrabbed: itemsGrabbed,
			totalErrors: errors
		});

		return {
			taskType: 'missing',
			itemsProcessed,
			itemsGrabbed,
			errors,
			executedAt
		};
	} catch (error) {
		logger.error('[MissingContentTask] Task failed', error);
		throw error;
	}
}
