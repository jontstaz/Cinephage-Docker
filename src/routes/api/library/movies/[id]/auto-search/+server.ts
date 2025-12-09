import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { searchOnAdd } from '$lib/server/library/searchOnAdd.js';
import { db } from '$lib/server/db/index.js';
import { movies } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/logging';

/**
 * POST /api/library/movies/[id]/auto-search
 * Automatically search and grab the best release for a movie
 */
export const POST: RequestHandler = async ({ params }) => {
	try {
		const movieId = params.id;

		// Verify movie exists and get details
		const movie = await db.query.movies.findFirst({
			where: eq(movies.id, movieId)
		});

		if (!movie) {
			return json({ success: false, error: 'Movie not found' }, { status: 404 });
		}

		logger.info('[API] Auto-search triggered for movie', {
			movieId,
			title: movie.title
		});

		// Use searchOnAdd service to search and grab
		const result = await searchOnAdd.searchForMovie({
			movieId,
			tmdbId: movie.tmdbId,
			imdbId: movie.imdbId,
			title: movie.title,
			year: movie.year ?? undefined,
			scoringProfileId: movie.scoringProfileId ?? undefined
		});

		logger.info('[API] Auto-search completed for movie', {
			movieId,
			title: movie.title,
			success: result.success,
			releaseName: result.releaseName,
			error: result.error
		});

		return json({
			success: result.success,
			found: result.success && !!result.releaseName,
			grabbed: result.success && !!result.releaseName,
			releaseName: result.releaseName,
			error: result.error
		});
	} catch (error) {
		logger.error('[API] Movie auto-search error', error instanceof Error ? error : undefined);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to perform auto-search'
			},
			{ status: 500 }
		);
	}
};
