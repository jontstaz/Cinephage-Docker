import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtitleSyncService } from '$lib/server/subtitles/services/SubtitleSyncService';
import { subtitleSyncSchema } from '$lib/validation/schemas';
import { db } from '$lib/server/db';
import {
	subtitles,
	movies,
	series,
	episodes,
	movieFiles,
	episodeFiles,
	rootFolders
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { join } from 'path';

/**
 * POST /api/subtitles/sync
 * Synchronize a subtitle using ffsubsync.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = subtitleSyncSchema.safeParse(data);

	if (!result.success) {
		return json(
			{
				error: 'Validation failed',
				details: result.error.flatten()
			},
			{ status: 400 }
		);
	}

	const validated = result.data;
	const syncService = getSubtitleSyncService();

	try {
		// Get the subtitle record
		const subtitle = await db.query.subtitles.findFirst({
			where: eq(subtitles.id, validated.subtitleId)
		});

		if (!subtitle) {
			return json({ error: 'Subtitle not found' }, { status: 404 });
		}

		// Get the video path from the associated media
		let videoPath: string | undefined;
		let subtitleFullPath: string;

		if (subtitle.movieId) {
			const movie = await db.query.movies.findFirst({
				where: eq(movies.id, subtitle.movieId)
			});
			if (movie) {
				const movieFile = await db.query.movieFiles.findFirst({
					where: eq(movieFiles.movieId, movie.id)
				});
				if (movieFile && movie.rootFolderId) {
					const rootFolder = await db.query.rootFolders.findFirst({
						where: eq(rootFolders.id, movie.rootFolderId)
					});
					if (rootFolder) {
						videoPath = join(rootFolder.path, movie.path, movieFile.relativePath);
						subtitleFullPath = join(rootFolder.path, movie.path, subtitle.relativePath);
					}
				}
			}
		} else if (subtitle.episodeId) {
			const episode = await db.query.episodes.findFirst({
				where: eq(episodes.id, subtitle.episodeId)
			});
			if (episode) {
				const seriesData = await db.query.series.findFirst({
					where: eq(series.id, episode.seriesId)
				});
				const episodeFile = await db.query.episodeFiles.findFirst({
					where: eq(episodeFiles.seriesId, episode.seriesId)
				});
				if (episodeFile && seriesData?.rootFolderId) {
					const rootFolder = await db.query.rootFolders.findFirst({
						where: eq(rootFolders.id, seriesData.rootFolderId)
					});
					if (rootFolder) {
						videoPath = join(rootFolder.path, seriesData.path, episodeFile.relativePath);
						subtitleFullPath = join(rootFolder.path, seriesData.path, subtitle.relativePath);
					}
				}
			}
		}

		if (!videoPath && validated.referenceType === 'video' && !validated.referencePath) {
			return json({ error: 'No video file found for this subtitle' }, { status: 400 });
		}

		// Perform sync
		const syncResult = await syncService.syncSubtitle(subtitleFullPath!, {
			referenceType: validated.referenceType,
			referencePath: validated.referencePath || videoPath,
			maxOffsetSeconds: validated.maxOffsetSeconds,
			noFixFramerate: validated.noFixFramerate,
			gss: validated.gss
		});

		return json({
			success: syncResult.success,
			offsetMs: syncResult.offsetMs,
			confidence: syncResult.confidence,
			error: syncResult.error
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};

/**
 * GET /api/subtitles/sync
 * Check if ffsubsync is available.
 */
export const GET: RequestHandler = async () => {
	const syncService = getSubtitleSyncService();
	const isAvailable = await syncService.isAvailable();

	return json({
		available: isAvailable,
		message: isAvailable
			? 'ffsubsync is available'
			: 'ffsubsync is not installed. Install with: pip install ffsubsync'
	});
};
