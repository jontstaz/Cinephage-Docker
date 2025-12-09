/**
 * Stream Resolve Endpoint - TV Episodes
 * Extracts stream from providers and returns HLS playlist directly
 * (Jellyfin doesn't follow redirects for .strm files)
 *
 * GET /api/streaming/resolve/tv/[tmdbId]/[season]/[episode]
 */

import type { RequestHandler } from './$types';
import { fetchPlaylist } from '$lib/server/streaming/utils';
import { StreamWorker, streamWorkerRegistry, workerManager } from '$lib/server/workers';

/** Create JSON error response */
function errorResponse(message: string, code: string, status: number): Response {
	return new Response(JSON.stringify({ error: message, code }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

export const GET: RequestHandler = async ({ params, request }) => {
	const { tmdbId, season, episode } = params;

	if (!tmdbId || !season || !episode) {
		return errorResponse('Missing parameters', 'MISSING_PARAM', 400);
	}

	// Validate all params are numeric
	if (!/^\d+$/.test(tmdbId) || !/^\d+$/.test(season) || !/^\d+$/.test(episode)) {
		return errorResponse('Invalid parameter format', 'INVALID_PARAM', 400);
	}

	const tmdbIdNum = parseInt(tmdbId, 10);
	const seasonNum = parseInt(season, 10);
	const episodeNum = parseInt(episode, 10);

	// Create or find existing stream worker for this media
	let worker = streamWorkerRegistry.findByMedia(tmdbIdNum, 'tv', seasonNum, episodeNum);

	if (!worker) {
		worker = new StreamWorker({
			mediaType: 'tv',
			tmdbId: tmdbIdNum,
			season: seasonNum,
			episode: episodeNum
		});

		try {
			workerManager.spawn(worker);
			streamWorkerRegistry.register(worker);
			// Start the worker in background (it will wait for complete/fail)
			workerManager.spawnInBackground(worker);
		} catch (e) {
			// Concurrency limit reached - still process request, just without worker tracking
			worker.log(
				'warn',
				`Could not create worker: ${e instanceof Error ? e.message : 'Unknown error'}`
			);
			worker = undefined as unknown as StreamWorker;
		}
	}

	worker?.extractionStarted();

	try {
		// Dynamic imports to isolate any module loading errors
		const { extractStreams, streamCache, getBestQualityStreamUrl, getBaseUrlAsync } =
			await import('$lib/server/streaming');
		const baseUrl = await getBaseUrlAsync(request);

		// Check cache first
		const cacheKey = `stream:tv:${tmdbId}:${seasonNum}:${episodeNum}:best`;
		const cachedBestUrl = streamCache.get(cacheKey) as string | undefined;

		if (cachedBestUrl) {
			worker?.cacheHit();
			// Fetch and return the playlist directly (Jellyfin doesn't follow redirects)
			return await fetchPlaylist(cachedBestUrl);
		}

		// Try to get metadata from TMDB (optional - but needed for anime providers)
		let imdbId: string | undefined;
		let title: string | undefined;
		let year: number | undefined;
		let alternativeTitles: string[] | undefined;

		try {
			const { tmdb } = await import('$lib/server/tmdb');

			// Fetch external IDs
			const externalIds = await tmdb.getTvExternalIds(tmdbIdNum);
			imdbId = externalIds.imdb_id || undefined;

			// Fetch show details for title and year (needed for AnimeKai, AniList resolution)
			const showDetails = await tmdb.getTVShow(tmdbIdNum);
			title = showDetails.name;
			year = showDetails.first_air_date
				? parseInt(showDetails.first_air_date.substring(0, 4), 10)
				: undefined;

			// Use original name as alternative title if different (common for anime)
			if (showDetails.original_name && showDetails.original_name !== showDetails.name) {
				alternativeTitles = [showDetails.original_name];
			}
		} catch {
			// TMDB lookup failed - extraction can still work for non-anime providers
		}

		// Extract streams from providers
		const result = await extractStreams({
			tmdbId,
			type: 'tv',
			season: seasonNum,
			episode: episodeNum,
			imdbId,
			title,
			year,
			alternativeTitles
		});

		if (!result.success || result.sources.length === 0) {
			worker?.fail(result.error || 'No sources found');
			return errorResponse(
				`Stream extraction failed: ${result.error || 'No sources found'}`,
				'EXTRACTION_FAILED',
				503
			);
		}

		// Find first working source
		const workingSource = result.sources.find((s) => s.status === 'working') || result.sources[0];

		if (!workingSource) {
			worker?.fail('No working stream sources');
			return errorResponse('No working stream sources', 'NO_SOURCES', 503);
		}

		// Record successful extraction
		worker?.extractionSucceeded(result.provider || 'unknown', workingSource.quality);

		// Get the best quality stream URL by parsing the HLS master playlist
		const bestQualityUrl = await getBestQualityStreamUrl(
			workingSource.url,
			workingSource.referer,
			baseUrl
		);

		// Cache the best quality URL
		streamCache.set(cacheKey, bestQualityUrl);

		// Fetch and return the playlist directly (Jellyfin doesn't follow redirects)
		return await fetchPlaylist(bestQualityUrl);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		worker?.fail(errorMessage);
		return errorResponse(`Stream extraction error: ${errorMessage}`, 'INTERNAL_ERROR', 500);
	}
};
