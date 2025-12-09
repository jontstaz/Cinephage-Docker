/**
 * GET /api/queue
 * List all items in the download queue
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { downloadQueue, movies, series, downloadClients } from '$lib/server/db/schema';
import { eq, not, inArray, and, isNull, isNotNull } from 'drizzle-orm';
import { downloadMonitor } from '$lib/server/downloadClients/monitoring';
import type { QueueItem, QueueItemWithMedia, QueueStatus } from '$lib/types/queue';

/**
 * Terminal statuses (items that are done processing)
 */
const TERMINAL_STATUSES: QueueStatus[] = ['imported', 'removed'];

export const GET: RequestHandler = async ({ url }) => {
	try {
		// Parse query params for filtering
		const statusParam = url.searchParams.get('status') as QueueStatus | 'all' | null;
		const mediaType = url.searchParams.get('mediaType') as 'movie' | 'tv' | 'all' | null;
		const clientId = url.searchParams.get('clientId');
		const includeTerminal = url.searchParams.get('includeTerminal') === 'true';

		// Build where conditions
		const conditions = [];

		// Status filter
		if (statusParam && statusParam !== 'all') {
			conditions.push(eq(downloadQueue.status, statusParam));
		} else if (!includeTerminal) {
			// By default, exclude terminal statuses
			conditions.push(not(inArray(downloadQueue.status, TERMINAL_STATUSES)));
		}

		// Media type filter
		if (mediaType === 'movie') {
			conditions.push(and(isNotNull(downloadQueue.movieId), isNull(downloadQueue.seriesId)));
		} else if (mediaType === 'tv') {
			conditions.push(and(isNotNull(downloadQueue.seriesId), isNull(downloadQueue.movieId)));
		}

		// Client filter
		if (clientId) {
			conditions.push(eq(downloadQueue.downloadClientId, clientId));
		}

		// Query with conditions
		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const rows = whereClause
			? await db.select().from(downloadQueue).where(whereClause)
			: await db
					.select()
					.from(downloadQueue)
					.where(not(inArray(downloadQueue.status, TERMINAL_STATUSES)));

		// Enrich with media info
		const items: QueueItemWithMedia[] = [];

		for (const row of rows) {
			const item: QueueItemWithMedia = {
				id: row.id,
				downloadClientId: row.downloadClientId,
				downloadId: row.downloadId,
				title: row.title,
				indexerId: row.indexerId,
				indexerName: row.indexerName,
				downloadUrl: row.downloadUrl,
				magnetUrl: row.magnetUrl,
				protocol: row.protocol,
				movieId: row.movieId,
				seriesId: row.seriesId,
				episodeIds: row.episodeIds as string[] | null,
				seasonNumber: row.seasonNumber,
				status: row.status as QueueStatus,
				progress: parseFloat(row.progress || '0'),
				size: row.size,
				downloadSpeed: row.downloadSpeed || 0,
				uploadSpeed: row.uploadSpeed || 0,
				eta: row.eta,
				ratio: parseFloat(row.ratio || '0'),
				clientDownloadPath: row.clientDownloadPath,
				outputPath: row.outputPath,
				importedPath: row.importedPath,
				quality: row.quality as QueueItem['quality'],
				addedAt: row.addedAt || new Date().toISOString(),
				startedAt: row.startedAt,
				completedAt: row.completedAt,
				importedAt: row.importedAt,
				errorMessage: row.errorMessage,
				importAttempts: row.importAttempts || 0,
				lastAttemptAt: row.lastAttemptAt,
				isAutomatic: !!row.isAutomatic,
				isUpgrade: !!row.isUpgrade,
				movie: null,
				series: null,
				downloadClient: null
			};

			// Get movie info
			if (row.movieId) {
				const [movie] = await db
					.select({
						id: movies.id,
						tmdbId: movies.tmdbId,
						title: movies.title,
						year: movies.year,
						posterPath: movies.posterPath
					})
					.from(movies)
					.where(eq(movies.id, row.movieId))
					.limit(1);
				item.movie = movie || null;
			}

			// Get series info
			if (row.seriesId) {
				const [seriesData] = await db
					.select({
						id: series.id,
						tmdbId: series.tmdbId,
						title: series.title,
						year: series.year,
						posterPath: series.posterPath
					})
					.from(series)
					.where(eq(series.id, row.seriesId))
					.limit(1);
				item.series = seriesData || null;
			}

			// Get client info
			const [client] = await db
				.select({
					id: downloadClients.id,
					name: downloadClients.name,
					implementation: downloadClients.implementation
				})
				.from(downloadClients)
				.where(eq(downloadClients.id, row.downloadClientId))
				.limit(1);
			item.downloadClient = client || null;

			items.push(item);
		}

		// Get stats
		const stats = await downloadMonitor.getStats();

		return json({
			success: true,
			data: {
				items,
				stats
			}
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};
