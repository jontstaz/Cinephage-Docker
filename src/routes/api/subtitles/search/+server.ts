import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtitleSearchService } from '$lib/server/subtitles/services/SubtitleSearchService';
import { LanguageProfileService } from '$lib/server/subtitles/services/LanguageProfileService';
import { subtitleSearchSchema } from '$lib/validation/schemas';
import { db } from '$lib/server/db';
import { movies, episodes, series } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { SubtitleSearchCriteria } from '$lib/server/subtitles/types';

/**
 * POST /api/subtitles/search
 * Search for subtitles across configured providers.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = subtitleSearchSchema.safeParse(data);

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
	const searchService = getSubtitleSearchService();
	const profileService = LanguageProfileService.getInstance();

	try {
		// Search for movie subtitles
		if (validated.movieId) {
			const movie = await db.query.movies.findFirst({
				where: eq(movies.id, validated.movieId)
			});

			if (!movie) {
				return json({ error: 'Movie not found' }, { status: 404 });
			}

			// Get languages from profile or request
			let languages = validated.languages || [];
			if (languages.length === 0) {
				const profile = await profileService.getProfileForMovie(validated.movieId);
				if (profile) {
					languages = profile.languages.map((l) => l.code);
				}
			}
			if (languages.length === 0) {
				languages = ['en']; // Default to English
			}

			const results = await searchService.searchForMovie(validated.movieId, languages, {
				providerIds: validated.providerIds
			});

			return json(results);
		}

		// Search for episode subtitles
		if (validated.episodeId) {
			const episode = await db.query.episodes.findFirst({
				where: eq(episodes.id, validated.episodeId)
			});

			if (!episode) {
				return json({ error: 'Episode not found' }, { status: 404 });
			}

			const seriesData = await db.query.series.findFirst({
				where: eq(series.id, episode.seriesId)
			});

			if (!seriesData) {
				return json({ error: 'Series not found' }, { status: 404 });
			}

			// Get languages from profile or request
			let languages = validated.languages || [];
			if (languages.length === 0) {
				const profile = await profileService.getProfileForSeries(seriesData.id);
				if (profile) {
					languages = profile.languages.map((l) => l.code);
				}
			}
			if (languages.length === 0) {
				languages = ['en']; // Default to English
			}

			const results = await searchService.searchForEpisode(validated.episodeId, languages, {
				providerIds: validated.providerIds
			});

			return json(results);
		}

		// Manual search with provided parameters
		if (!validated.title) {
			return json({ error: 'Either movieId, episodeId, or title is required' }, { status: 400 });
		}

		const criteria: SubtitleSearchCriteria = {
			title: validated.title,
			year: validated.year,
			imdbId: validated.imdbId,
			tmdbId: validated.tmdbId,
			seriesTitle: validated.seriesTitle,
			season: validated.season,
			episode: validated.episode,
			languages: validated.languages || ['en'],
			includeForced: validated.includeForced,
			includeHearingImpaired: validated.includeHearingImpaired,
			excludeHearingImpaired: validated.excludeHearingImpaired
		};

		const results = await searchService.search(
			criteria,
			{},
			{
				providerIds: validated.providerIds
			}
		);

		return json(results);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
