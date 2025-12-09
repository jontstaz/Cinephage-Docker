/**
 * Cinephage Stream Indexer
 *
 * A special indexer that provides streaming releases. Unlike torrent indexers,
 * this creates .strm files that point to our internal HLS proxy endpoints.
 *
 * Streaming releases always have a low score to ensure they can be upgraded
 * to higher-quality torrent releases when the user's profile allows it.
 *
 * Note: Stream extraction is deferred to grab time. Search just returns
 * placeholder releases; actual availability is checked when grabbing.
 */

import { PublicIndexerBase } from '../base/PublicIndexerBase';
import {
	type NativeIndexerConfig,
	type IndexerMetadata,
	type SearchRequest
} from '../base/IndexerBase';
import { NewznabCategory } from '../base/Categories';
import type { IndexerCapabilities } from '../../core/capabilities';
import type {
	SearchCriteria,
	MovieSearchCriteria,
	TvSearchCriteria
} from '../../core/searchCriteria';
import type { ReleaseResult } from '../../core/releaseResult';

/**
 * Simple cache to track content we've already verified exists.
 * This avoids repeated extraction calls for the same content.
 */
interface AvailabilityEntry {
	available: boolean;
	expiry: number;
}
const availabilityCache = new Map<string, AvailabilityEntry>();
const AVAILABILITY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Definition ID for registry */
export const CINEPHAGE_STREAM_DEFINITION_ID = 'cinephage-stream';

/** Fixed small size for streaming releases (1KB placeholder) */
const STREAMING_SIZE = 1024;

/**
 * Cinephage Stream Indexer Implementation
 */
export class CinephageStreamIndexer extends PublicIndexerBase {
	override readonly protocol = 'streaming' as const;

	protected readonly metadata: IndexerMetadata = {
		id: CINEPHAGE_STREAM_DEFINITION_ID,
		name: 'Cinephage Stream',
		description: 'Internal streaming provider - creates .strm files for instant playback',
		urls: ['http://localhost/'],
		language: 'en-US',
		privacy: 'public',
		supportsPagination: false,
		requestDelay: 0
	};

	readonly capabilities: IndexerCapabilities = {
		search: { available: false, supportedParams: [] },
		tvSearch: { available: true, supportedParams: ['q', 'tmdbId', 'season', 'ep'] },
		movieSearch: { available: true, supportedParams: ['q', 'tmdbId'] },
		musicSearch: { available: false, supportedParams: [] },
		bookSearch: { available: false, supportedParams: [] },
		categories: this.buildCategoryMap(),
		supportsPagination: false,
		supportsInfoHash: false,
		limitMax: 10,
		limitDefault: 1
	};

	constructor(config: NativeIndexerConfig) {
		super(config);
	}

	/** Build category map for capabilities */
	private buildCategoryMap(): Map<number, string> {
		const map = new Map<number, string>();
		map.set(NewznabCategory.Movies, 'Movies');
		map.set(NewznabCategory.MoviesHD, 'Movies HD');
		map.set(NewznabCategory.TV, 'TV');
		map.set(NewznabCategory.TVHD, 'TV HD');
		return map;
	}

	/**
	 * Override search to handle streaming-specific logic
	 */
	override async search(criteria: SearchCriteria): Promise<ReleaseResult[]> {
		const startTime = Date.now();

		try {
			let results: ReleaseResult[] = [];

			if (criteria.searchType === 'movie') {
				results = await this.searchMovie(criteria as MovieSearchCriteria);
			} else if (criteria.searchType === 'tv') {
				results = await this.searchTv(criteria as TvSearchCriteria);
			}

			this.recordSuccess(Date.now() - startTime);
			return results;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			this.log.error(`[CinephageStream] Search failed: ${errorMsg}`);
			this.recordFailure(errorMsg);
			return [];
		}
	}

	/**
	 * Search for movie streams
	 *
	 * Note: Stream extraction is deferred to grab time. Search returns a placeholder
	 * release assuming streaming is available. Actual availability is checked when
	 * the release is grabbed via the resolve API.
	 */
	private async searchMovie(criteria: MovieSearchCriteria): Promise<ReleaseResult[]> {
		const tmdbId = criteria.tmdbId;

		if (!tmdbId) {
			this.log.debug('[CinephageStream] Movie search requires TMDB ID');
			return [];
		}

		this.log.info(`[CinephageStream] Returning streaming placeholder for movie TMDB ${tmdbId}`);

		// Check cached availability (if we've recently verified this content)
		const cacheKey = `movie-${tmdbId}`;
		const cached = availabilityCache.get(cacheKey);
		if (cached && cached.expiry > Date.now()) {
			if (!cached.available) {
				this.log.debug(`[CinephageStream] Cached as unavailable: movie ${tmdbId}`);
				return [];
			}
		}

		// Build release title
		const title = criteria.query
			? `${criteria.query} [Streaming]`
			: `Movie TMDB-${tmdbId} [Streaming]`;

		const release: ReleaseResult = {
			guid: `cinephage-stream-movie-${tmdbId}`,
			title,
			// Special download URL format for streaming protocol
			downloadUrl: `stream://movie/${tmdbId}`,
			publishDate: new Date(),
			size: STREAMING_SIZE,
			indexerId: this.id,
			indexerName: this.name,
			protocol: 'streaming',
			categories: [NewznabCategory.Movies, NewznabCategory.MoviesHD],
			// Streaming has no seeders/leechers
			seeders: undefined,
			leechers: undefined,
			// Additional metadata
			imdbId: criteria.imdbId,
			tmdbId: tmdbId
		};

		return [release];
	}

	/**
	 * Search for TV episode, season pack, or complete series streams
	 * If both season and episode are provided: single episode search
	 * If only season is provided: season pack search
	 * If no season is provided: complete series search
	 */
	private async searchTv(criteria: TvSearchCriteria): Promise<ReleaseResult[]> {
		const tmdbId = criteria.tmdbId;
		const season = criteria.season;
		const episode = criteria.episode;

		if (!tmdbId) {
			this.log.debug('[CinephageStream] TV search requires TMDB ID');
			return [];
		}

		// Complete series search (no season specified)
		if (season === undefined) {
			return this.searchTvSeriesPack(criteria, tmdbId);
		}

		// Season pack search (no episode specified)
		if (episode === undefined) {
			return this.searchTvSeasonPack(criteria, tmdbId, season);
		}

		// Single episode search
		return this.searchTvEpisode(criteria, tmdbId, season, episode);
	}

	/**
	 * Search for a single TV episode stream
	 *
	 * Note: Stream extraction is deferred to grab time. Search returns a placeholder
	 * release assuming streaming is available.
	 */
	private async searchTvEpisode(
		criteria: TvSearchCriteria,
		tmdbId: number,
		season: number,
		episode: number
	): Promise<ReleaseResult[]> {
		this.log.info(
			`[CinephageStream] Returning streaming placeholder for TV TMDB ${tmdbId} S${season}E${episode}`
		);

		// Check cached availability
		const cacheKey = `tv-${tmdbId}-s${season}e${episode}`;
		const cached = availabilityCache.get(cacheKey);
		if (cached && cached.expiry > Date.now()) {
			if (!cached.available) {
				this.log.debug(
					`[CinephageStream] Cached as unavailable: TV ${tmdbId} S${season}E${episode}`
				);
				return [];
			}
		}

		// Build release title
		const seasonStr = season.toString().padStart(2, '0');
		const episodeStr = episode.toString().padStart(2, '0');
		const title = criteria.query
			? `${criteria.query} S${seasonStr}E${episodeStr} [Streaming]`
			: `TV TMDB-${tmdbId} S${seasonStr}E${episodeStr} [Streaming]`;

		const release: ReleaseResult = {
			guid: `cinephage-stream-tv-${tmdbId}-s${season}e${episode}`,
			title,
			// Special download URL format for streaming protocol
			downloadUrl: `stream://tv/${tmdbId}/${season}/${episode}`,
			publishDate: new Date(),
			size: STREAMING_SIZE,
			indexerId: this.id,
			indexerName: this.name,
			protocol: 'streaming',
			categories: [NewznabCategory.TV, NewznabCategory.TVHD],
			// Streaming has no seeders/leechers
			seeders: undefined,
			leechers: undefined,
			// Additional metadata
			tmdbId: tmdbId,
			season,
			episode
		};

		return [release];
	}

	/**
	 * Search for a TV season pack stream
	 *
	 * Note: Stream extraction is deferred to grab time. Search returns a placeholder
	 * release assuming streaming is available.
	 */
	private async searchTvSeasonPack(
		criteria: TvSearchCriteria,
		tmdbId: number,
		season: number
	): Promise<ReleaseResult[]> {
		this.log.info(
			`[CinephageStream] Returning streaming placeholder for TV season pack TMDB ${tmdbId} S${season}`
		);

		// Check cached availability
		const cacheKey = `tv-${tmdbId}-s${season}-pack`;
		const cached = availabilityCache.get(cacheKey);
		if (cached && cached.expiry > Date.now()) {
			if (!cached.available) {
				this.log.debug(
					`[CinephageStream] Cached as unavailable: TV season pack ${tmdbId} S${season}`
				);
				return [];
			}
		}

		// Build release title for season pack
		const seasonStr = season.toString().padStart(2, '0');
		const title = criteria.query
			? `${criteria.query} S${seasonStr} [Streaming Season Pack]`
			: `TV TMDB-${tmdbId} S${seasonStr} [Streaming Season Pack]`;

		const release: ReleaseResult = {
			guid: `cinephage-stream-tv-${tmdbId}-s${season}-pack`,
			title,
			// Season pack URL format (no episode number)
			downloadUrl: `stream://tv/${tmdbId}/${season}`,
			publishDate: new Date(),
			// Season packs have larger placeholder size
			size: STREAMING_SIZE * 10,
			indexerId: this.id,
			indexerName: this.name,
			protocol: 'streaming',
			categories: [NewznabCategory.TV, NewznabCategory.TVHD],
			// Streaming has no seeders/leechers
			seeders: undefined,
			leechers: undefined,
			// Additional metadata
			tmdbId: tmdbId,
			season
			// Note: no episode field for season pack
		};

		return [release];
	}

	/**
	 * Search for a complete TV series stream (all seasons)
	 *
	 * Note: Stream extraction is deferred to grab time. Search returns a placeholder
	 * release for the complete series.
	 */
	private async searchTvSeriesPack(
		criteria: TvSearchCriteria,
		tmdbId: number
	): Promise<ReleaseResult[]> {
		this.log.info(
			`[CinephageStream] Returning streaming placeholder for complete series TMDB ${tmdbId}`
		);

		// Check cached availability
		const cacheKey = `tv-${tmdbId}-complete`;
		const cached = availabilityCache.get(cacheKey);
		if (cached && cached.expiry > Date.now()) {
			if (!cached.available) {
				this.log.debug(`[CinephageStream] Cached as unavailable: complete series ${tmdbId}`);
				return [];
			}
		}

		// Build release title for complete series
		const title = criteria.query
			? `${criteria.query} [Streaming Complete Series]`
			: `TV TMDB-${tmdbId} [Streaming Complete Series]`;

		const release: ReleaseResult = {
			guid: `cinephage-stream-tv-${tmdbId}-complete`,
			title,
			// Complete series URL format: stream://tv/{tmdbId}/all
			downloadUrl: `stream://tv/${tmdbId}/all`,
			publishDate: new Date(),
			// Complete series has larger placeholder size
			size: STREAMING_SIZE * 100,
			indexerId: this.id,
			indexerName: this.name,
			protocol: 'streaming',
			categories: [NewznabCategory.TV, NewznabCategory.TVHD],
			// Streaming has no seeders/leechers
			seeders: undefined,
			leechers: undefined,
			// Additional metadata
			tmdbId: tmdbId
			// Note: no season or episode field for complete series
		};

		return [release];
	}

	/**
	 * Build search requests - not used for streaming indexer
	 */
	protected buildSearchRequests(): SearchRequest[] {
		// Streaming indexer handles search directly, not via HTTP requests
		return [];
	}

	/**
	 * Parse search response - not used for streaming indexer
	 */
	protected parseSearchResponse(): ReleaseResult[] {
		// Streaming indexer handles search directly
		return [];
	}

	/**
	 * Override test to always succeed - streaming is internal
	 */
	override async test(): Promise<void> {
		// Streaming is an internal indexer - always available
		this.log.info('[CinephageStream] Test successful - internal indexer always available');
	}
}

/**
 * Factory function to create CinephageStreamIndexer instances
 */
export function createCinephageStreamIndexer(config: NativeIndexerConfig): CinephageStreamIndexer {
	return new CinephageStreamIndexer(config);
}

/**
 * Update streaming availability cache.
 * Called by resolve API after verifying stream availability.
 */
export function updateStreamAvailabilityCache(
	type: 'movie' | 'tv',
	tmdbId: string | number,
	available: boolean,
	season?: number,
	episode?: number,
	isCompleteSeries?: boolean
): void {
	let cacheKey: string;

	if (type === 'movie') {
		cacheKey = `movie-${tmdbId}`;
	} else if (isCompleteSeries) {
		cacheKey = `tv-${tmdbId}-complete`;
	} else if (episode !== undefined) {
		cacheKey = `tv-${tmdbId}-s${season}e${episode}`;
	} else if (season !== undefined) {
		cacheKey = `tv-${tmdbId}-s${season}-pack`;
	} else {
		// Fallback for complete series when not explicitly set
		cacheKey = `tv-${tmdbId}-complete`;
	}

	availabilityCache.set(cacheKey, {
		available,
		expiry: Date.now() + AVAILABILITY_CACHE_TTL_MS
	});
}
