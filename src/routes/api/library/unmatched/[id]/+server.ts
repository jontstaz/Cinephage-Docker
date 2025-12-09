import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import {
	unmatchedFiles,
	movies,
	series,
	seasons,
	movieFiles,
	episodes,
	episodeFiles
} from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { tmdb } from '$lib/server/tmdb.js';
import { mediaInfoService } from '$lib/server/library/index.js';
import path from 'path';
import { logger } from '$lib/logging';

/**
 * GET /api/library/unmatched/[id]
 * Get details for a specific unmatched file
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = params.id;
		if (!id) {
			return json({ success: false, error: 'Invalid ID' }, { status: 400 });
		}

		const [file] = await db.select().from(unmatchedFiles).where(eq(unmatchedFiles.id, id));

		if (!file) {
			return json({ success: false, error: 'Unmatched file not found' }, { status: 404 });
		}

		return json({
			success: true,
			file
		});
	} catch (error) {
		logger.error('[API] Error fetching unmatched file', error instanceof Error ? error : undefined);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch unmatched file'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/library/unmatched/[id]
 * Manually match an unmatched file to a TMDB entry
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const id = params.id;
		if (!id) {
			return json({ success: false, error: 'Invalid ID' }, { status: 400 });
		}

		const body = await request.json();
		const { tmdbId, mediaType, season, episode } = body as {
			tmdbId: number;
			mediaType: 'movie' | 'tv';
			season?: number;
			episode?: number;
		};

		if (!tmdbId || !mediaType) {
			return json({ success: false, error: 'tmdbId and mediaType are required' }, { status: 400 });
		}

		// Get the unmatched file
		const [unmatchedFile] = await db.select().from(unmatchedFiles).where(eq(unmatchedFiles.id, id));

		if (!unmatchedFile) {
			return json({ success: false, error: 'Unmatched file not found' }, { status: 404 });
		}

		// Get media info
		const mediaInfo = await mediaInfoService.extractMediaInfo(unmatchedFile.path);

		if (mediaType === 'movie') {
			// Get movie details from TMDB
			const details = await tmdb.getMovie(tmdbId);

			// Check if movie already exists
			let [existingMovie] = await db.select().from(movies).where(eq(movies.tmdbId, tmdbId));

			if (!existingMovie) {
				// Create new movie entry
				const [newMovie] = await db
					.insert(movies)
					.values({
						tmdbId,
						title: details.title,
						originalTitle: details.original_title || details.title,
						year: details.release_date ? parseInt(details.release_date.substring(0, 4), 10) : null,
						overview: details.overview,
						posterPath: details.poster_path,
						backdropPath: details.backdrop_path,
						path: path.dirname(unmatchedFile.path),
						rootFolderId: unmatchedFile.rootFolderId,
						monitored: true
					})
					.returning();
				existingMovie = newMovie;
			}

			// Add the movie file
			await db.insert(movieFiles).values({
				movieId: existingMovie.id,
				relativePath: path.basename(unmatchedFile.path),
				size: unmatchedFile.size,
				quality: null,
				mediaInfo: mediaInfo || null
			});

			// Update movie to have file
			await db.update(movies).set({ hasFile: true }).where(eq(movies.id, existingMovie.id));

			// Delete from unmatched
			await db.delete(unmatchedFiles).where(eq(unmatchedFiles.id, id));

			return json({
				success: true,
				message: `Matched to movie: ${details.title}`,
				movie: existingMovie
			});
		} else if (mediaType === 'tv') {
			if (season === undefined || episode === undefined) {
				return json(
					{ success: false, error: 'season and episode are required for TV shows' },
					{ status: 400 }
				);
			}

			// Get series details from TMDB
			const details = await tmdb.getTVShow(tmdbId);

			// Check if series already exists
			let [existingSeries] = await db.select().from(series).where(eq(series.tmdbId, tmdbId));

			if (!existingSeries) {
				// Create new series entry
				const [newSeries] = await db
					.insert(series)
					.values({
						tmdbId,
						title: details.name,
						originalTitle: details.original_name || details.name,
						year: details.first_air_date
							? parseInt(details.first_air_date.substring(0, 4), 10)
							: null,
						overview: details.overview,
						posterPath: details.poster_path,
						backdropPath: details.backdrop_path,
						path: path.dirname(path.dirname(unmatchedFile.path)), // Go up two levels (file -> season folder -> series folder)
						rootFolderId: unmatchedFile.rootFolderId,
						monitored: true
					})
					.returning();
				existingSeries = newSeries;
			}

			// Check if season exists, create if not
			let [existingSeason] = await db
				.select()
				.from(seasons)
				.where(and(eq(seasons.seriesId, existingSeries.id), eq(seasons.seasonNumber, season)));

			if (!existingSeason) {
				const [newSeason] = await db
					.insert(seasons)
					.values({
						seriesId: existingSeries.id,
						seasonNumber: season,
						monitored: true
					})
					.returning();
				existingSeason = newSeason;
			}

			// Find or create episode
			const [existingEpisode] = await db
				.select()
				.from(episodes)
				.where(
					and(
						eq(episodes.seriesId, existingSeries.id),
						eq(episodes.seasonNumber, season),
						eq(episodes.episodeNumber, episode)
					)
				);

			let episodeId: string;

			if (existingEpisode) {
				episodeId = existingEpisode.id;
			} else {
				// Create episode entry
				const [newEpisode] = await db
					.insert(episodes)
					.values({
						seriesId: existingSeries.id,
						seasonNumber: season,
						episodeNumber: episode,
						title: `Season ${season} Episode ${episode}`,
						monitored: true,
						hasFile: true
					})
					.returning();
				episodeId = newEpisode.id;
			}

			// Add the episode file
			await db.insert(episodeFiles).values({
				seriesId: existingSeries.id,
				seasonNumber: season,
				episodeIds: [episodeId],
				relativePath: path.basename(unmatchedFile.path),
				size: unmatchedFile.size,
				quality: null,
				mediaInfo: mediaInfo || null
			});

			// Update episode to have file
			await db.update(episodes).set({ hasFile: true }).where(eq(episodes.id, episodeId));

			// Delete from unmatched
			await db.delete(unmatchedFiles).where(eq(unmatchedFiles.id, id));

			return json({
				success: true,
				message: `Matched to ${details.name} S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`,
				series: existingSeries
			});
		}

		return json({ success: false, error: 'Invalid media type' }, { status: 400 });
	} catch (error) {
		logger.error('[API] Error matching unmatched file', error instanceof Error ? error : undefined);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to match file'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/library/unmatched/[id]
 * Remove a file from the unmatched list (ignore it)
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = params.id;
		if (!id) {
			return json({ success: false, error: 'Invalid ID' }, { status: 400 });
		}

		const [deleted] = await db.delete(unmatchedFiles).where(eq(unmatchedFiles.id, id)).returning();

		if (!deleted) {
			return json({ success: false, error: 'Unmatched file not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'File removed from unmatched list'
		});
	} catch (error) {
		logger.error('[API] Error deleting unmatched file', error instanceof Error ? error : undefined);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to delete unmatched file'
			},
			{ status: 500 }
		);
	}
};
