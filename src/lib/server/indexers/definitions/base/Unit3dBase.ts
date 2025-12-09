/**
 * Unit3D Base Indexer
 *
 * Base class for private trackers running Unit3D software.
 * Provides standardized API handling for the Unit3D /api/torrents/filter endpoint.
 *
 * Unit3D is a popular open-source torrent tracker software used by many
 * private trackers. This base class handles:
 * - API token authentication
 * - Standardized search endpoint (/api/torrents/filter)
 * - JSON response parsing
 * - Category mapping
 * - Filter support (freeleech, doubleupload, etc.)
 *
 * To create a Unit3D-based indexer:
 * 1. Extend this class
 * 2. Define metadata (id, name, urls)
 * 3. Configure category mappings
 * 4. Optionally override buildUnit3dParams for tracker-specific params
 *
 * @example
 * ```typescript
 * export class MyTracker extends Unit3dBase {
 *   protected readonly metadata: IndexerMetadata = {
 *     id: 'mytracker',
 *     name: 'My Tracker',
 *     urls: ['https://mytracker.example.com/'],
 *     ...
 *   };
 *
 *   protected getCategoryMappings(): Unit3dCategoryMapping[] {
 *     return [
 *       { name: 'Movies', id: NewznabCategory.Movies },
 *       { name: 'TV', id: NewznabCategory.TV },
 *     ];
 *   }
 * }
 * ```
 *
 * @see https://github.com/HDIndustry/UNIT3D-Community-Edition
 */

import { PrivateIndexerBase, type AuthMethod } from './PrivateIndexerBase';
import { type SearchRequest, sanitizeSearchTerm } from './IndexerBase';
import {
	CategoryMapper,
	isMovieCategory,
	isTvCategory,
	isAudioCategory,
	isBookCategory
} from './Categories';
import type { IndexerCapabilities } from '../../core/capabilities';
import type {
	SearchCriteria,
	TvSearchCriteria,
	MovieSearchCriteria,
	BasicSearchCriteria
} from '../../core/searchCriteria';
import type { ReleaseResult } from '../../core/releaseResult';
import type {
	Unit3dSettings,
	Unit3dResponse,
	Unit3dTorrent,
	Unit3dCategoryMapping,
	Unit3dSearchParams
} from './Unit3dTypes';

/**
 * Abstract base class for Unit3D-based private trackers.
 *
 * Subclasses must implement:
 * - metadata: Indexer identification info
 * - getCategoryMappings(): Category mapping configuration
 *
 * Subclasses may optionally override:
 * - buildUnit3dParams(): Customize search parameters
 * - parseUnit3dTorrent(): Customize result parsing
 * - getApiPath(): Change API endpoint path (default: /api/torrents/filter)
 */
export abstract class Unit3dBase extends PrivateIndexerBase {
	protected readonly authMethod: AuthMethod = 'apikey';

	/** Category mapper instance */
	private _categoryMapper?: CategoryMapper;

	/**
	 * Get Unit3D-specific settings.
	 */
	protected get unit3dSettings(): Unit3dSettings {
		return this.config.settings as unknown as Unit3dSettings;
	}

	/**
	 * Get the category mapper, building it if needed.
	 */
	protected get categoryMapper(): CategoryMapper {
		if (!this._categoryMapper) {
			this._categoryMapper = this.buildCategoryMapper();
		}
		return this._categoryMapper;
	}

	/**
	 * Abstract method: Get category mappings for this tracker.
	 * Each tracker may have different category names/IDs.
	 */
	protected abstract getCategoryMappings(): Unit3dCategoryMapping[];

	/**
	 * Build the CategoryMapper from mappings.
	 */
	private buildCategoryMapper(): CategoryMapper {
		const mapper = new CategoryMapper();
		for (const mapping of this.getCategoryMappings()) {
			mapper.addMapping(mapping.name, mapping.id, mapping.name);
		}
		return mapper;
	}

	/**
	 * Build capabilities from category mappings.
	 */
	protected buildCapabilities(): IndexerCapabilities {
		const categoryMap = new Map<number, string>();
		for (const mapping of this.getCategoryMappings()) {
			categoryMap.set(mapping.id, mapping.name);
		}

		// Determine available search modes based on categories
		// Check category ranges (e.g., 2000-2999 for movies) not just exact parent category
		const categoryIds = Array.from(categoryMap.keys());
		const hasMovies = categoryIds.some(isMovieCategory);
		const hasTV = categoryIds.some(isTvCategory);
		const hasMusic = categoryIds.some(isAudioCategory);
		const hasBooks = categoryIds.some(isBookCategory);

		return {
			search: {
				available: true,
				supportedParams: ['q']
			},
			tvSearch: {
				available: hasTV,
				supportedParams: ['q', 'season', 'ep', 'imdbId', 'tvdbId', 'tmdbId']
			},
			movieSearch: {
				available: hasMovies,
				supportedParams: ['q', 'imdbId', 'tmdbId']
			},
			musicSearch: {
				available: hasMusic,
				supportedParams: ['q']
			},
			bookSearch: {
				available: hasBooks,
				supportedParams: ['q']
			},
			categories: categoryMap,
			supportsPagination: true,
			supportsInfoHash: true,
			limitMax: 100,
			limitDefault: 25
		};
	}

	/**
	 * Get the API endpoint path.
	 * Override if the tracker uses a different path.
	 */
	protected getApiPath(): string {
		return '/api/torrents/filter';
	}

	/**
	 * Build search requests for the Unit3D API.
	 * @see https://hdinnovations.github.io/UNIT3D/torrent_api.html
	 */
	protected buildSearchRequests(criteria: SearchCriteria): SearchRequest[] {
		const settings = this.unit3dSettings;
		const baseUrl = this.config.baseUrl || this.metadata.urls[0];
		const apiPath = this.getApiPath();

		// Build search parameters
		const params = this.buildUnit3dParams(criteria);

		// Add API token
		params.api_token = settings.apiKey;

		// Build query string using URLSearchParams for proper encoding
		const queryParts: string[] = [];

		// Required: API token
		queryParts.push(`api_token=${encodeURIComponent(params.api_token)}`);

		// Text search filters
		if (params.name) {
			queryParts.push(`name=${encodeURIComponent(params.name)}`);
		}

		// Categories array (Unit3D expects categories[]=X&categories[]=Y format)
		if (params.categories && params.categories.length > 0) {
			for (const cat of params.categories) {
				queryParts.push(`categories[]=${cat}`);
			}
		}

		// Types array
		if (params.types && params.types.length > 0) {
			for (const t of params.types) {
				queryParts.push(`types[]=${t}`);
			}
		}

		// Resolutions array
		if (params.resolutions && params.resolutions.length > 0) {
			for (const r of params.resolutions) {
				queryParts.push(`resolutions[]=${r}`);
			}
		}

		// External ID filters
		if (params.imdbId) {
			// IMDB ID should be numeric only per the docs
			const imdbNum =
				typeof params.imdbId === 'string' ? params.imdbId.replace(/^tt/i, '') : params.imdbId;
			queryParts.push(`imdbId=${imdbNum}`);
		}
		if (params.tmdbId) {
			queryParts.push(`tmdbId=${params.tmdbId}`);
		}
		if (params.tvdbId) {
			queryParts.push(`tvdbId=${params.tvdbId}`);
		}
		if (params.malId) {
			queryParts.push(`malId=${params.malId}`);
		}

		// TV episode filters
		if (params.seasonNumber !== undefined) {
			queryParts.push(`seasonNumber=${params.seasonNumber}`);
		}
		if (params.episodeNumber !== undefined) {
			queryParts.push(`episodeNumber=${params.episodeNumber}`);
		}

		// Promo filters (free is 0-100 integer, others are boolean as 1/0)
		if (settings.freeleechOnly) {
			queryParts.push('free=100'); // 100% freeleech
		} else if (params.free !== undefined) {
			queryParts.push(`free=${params.free}`);
		}
		if (settings.doubleUploadOnly || params.doubleup) {
			queryParts.push('doubleup=1');
		}
		if (settings.internalOnly || params.internal) {
			queryParts.push('internal=1');
		}
		if (settings.personalReleaseOnly || params.personalRelease) {
			queryParts.push('personalRelease=1');
		}

		// Seeder status filters
		if (params.alive) {
			queryParts.push('alive=1');
		}
		if (params.dying) {
			queryParts.push('dying=1');
		}
		if (params.dead) {
			queryParts.push('dead=1');
		}

		// Pagination and sorting
		if (params.perPage) {
			queryParts.push(`perPage=${params.perPage}`);
		}
		if (params.sortField) {
			queryParts.push(`sortField=${encodeURIComponent(params.sortField)}`);
		}
		if (params.sortDirection) {
			queryParts.push(`sortDirection=${params.sortDirection}`);
		}

		const searchUrl = `${baseUrl.replace(/\/$/, '')}${apiPath}?${queryParts.join('&')}`;

		return [
			{
				url: searchUrl,
				method: 'GET',
				headers: {
					Accept: 'application/json'
				}
			}
		];
	}

	/**
	 * Build Unit3D-specific search parameters.
	 * Override to customize for specific tracker requirements.
	 * @see https://hdinnovations.github.io/UNIT3D/torrent_api.html
	 */
	protected buildUnit3dParams(criteria: SearchCriteria): Unit3dSearchParams {
		const params: Unit3dSearchParams = {
			api_token: '', // Will be set in buildSearchRequests
			perPage: criteria.limit ?? 100,
			sortField: 'created_at',
			sortDirection: 'desc' // Newest first
		};

		// Handle search based on criteria type
		if (this.isTvSearch(criteria)) {
			const tvCriteria = criteria as TvSearchCriteria;
			params.name = sanitizeSearchTerm(tvCriteria.query);

			// Unit3D has native season/episode filters
			if (tvCriteria.season !== undefined) {
				params.seasonNumber = tvCriteria.season;
			}
			if (tvCriteria.episode !== undefined) {
				params.episodeNumber = tvCriteria.episode;
			}

			// External IDs
			if (tvCriteria.imdbId) {
				params.imdbId = this.normalizeImdbIdForSearch(tvCriteria.imdbId);
			}
			if (tvCriteria.tmdbId) {
				params.tmdbId = tvCriteria.tmdbId;
			}
			if (tvCriteria.tvdbId) {
				params.tvdbId = tvCriteria.tvdbId;
			}
		} else if (this.isMovieSearch(criteria)) {
			const movieCriteria = criteria as MovieSearchCriteria;
			params.name = sanitizeSearchTerm(movieCriteria.query);

			if (movieCriteria.imdbId) {
				params.imdbId = this.normalizeImdbIdForSearch(movieCriteria.imdbId);
			}
			if (movieCriteria.tmdbId) {
				params.tmdbId = movieCriteria.tmdbId;
			}
		} else {
			const basicCriteria = criteria as BasicSearchCriteria;
			params.name = sanitizeSearchTerm(basicCriteria.query);
		}

		// Map categories to Unit3D category IDs
		if (criteria.categories && criteria.categories.length > 0) {
			params.categories = this.mapCategoriesToUnit3d(criteria.categories);
		}

		return params;
	}

	/**
	 * Normalize IMDB ID for search - strip 'tt' prefix as Unit3D expects numeric only.
	 */
	protected normalizeImdbIdForSearch(imdbId: string | undefined): number | undefined {
		if (!imdbId) return undefined;
		const numericStr = imdbId.replace(/^tt/i, '');
		const num = parseInt(numericStr, 10);
		return isNaN(num) ? undefined : num;
	}

	/**
	 * Map Newznab categories to Unit3D category IDs.
	 * Override if tracker uses different category IDs.
	 */
	protected mapCategoriesToUnit3d(categories: number[]): number[] {
		// Default: return categories as-is (assuming tracker uses Newznab IDs)
		// Subclasses can override to map to tracker-specific IDs
		return categories;
	}

	/**
	 * Parse Unit3D API response.
	 */
	protected parseSearchResponse(responseText: string): ReleaseResult[] {
		const results: ReleaseResult[] = [];

		// Check for common auth error messages
		if (this.checkAuthError(responseText)) {
			throw new Error('Authentication failed - invalid API key');
		}

		let data: Unit3dResponse;
		try {
			data = JSON.parse(responseText);
		} catch (error) {
			this.log.error('Failed to parse Unit3D response', {
				error,
				responsePreview: responseText.slice(0, 200)
			});
			return results;
		}

		if (!data.data || !Array.isArray(data.data)) {
			this.log.warn('Unit3D response has no data array');
			return results;
		}

		for (const torrent of data.data) {
			try {
				const result = this.parseUnit3dTorrent(torrent);
				if (result) {
					results.push(result);
				}
			} catch (error) {
				this.log.debug('Failed to parse Unit3D torrent', {
					error,
					torrentId: torrent.id,
					name: torrent.attributes?.name
				});
			}
		}

		this.log.debug('Parsed Unit3D results', { count: results.length });
		return results;
	}

	/**
	 * Check for authentication error in response.
	 */
	private checkAuthError(responseText: string): boolean {
		const lower = responseText.toLowerCase();
		return (
			lower.includes('unauthenticated') ||
			lower.includes('invalid api') ||
			lower.includes('api key') ||
			lower.includes('"message":"unauthenticated"')
		);
	}

	/**
	 * Parse a single Unit3D torrent into a ReleaseResult.
	 * Override to customize parsing for specific trackers.
	 */
	protected parseUnit3dTorrent(torrent: Unit3dTorrent): ReleaseResult | null {
		const attr = torrent.attributes;

		if (!attr || !attr.name) {
			return null;
		}

		// Map category to Newznab
		const categories = this.categoryMapper.mapTrackerToNewznab(attr.category);

		// Parse IDs
		const imdbId = this.normalizeImdbId(attr.imdb_id);
		const tmdbId = this.parseNumericId(attr.tmdb_id);
		const tvdbId = this.parseNumericId(attr.tvdb_id);

		// Parse publish date
		const publishDate = this.parseDate(attr.created_at);

		const result: ReleaseResult = {
			indexerId: this.id,
			indexerName: this.name,
			protocol: 'torrent',
			title: attr.name,
			guid: attr.details_link || `unit3d-${torrent.id}`,
			downloadUrl: attr.download_link,
			commentsUrl: attr.details_link,
			categories,
			size: attr.size || 0,
			seeders: attr.seeders || 0,
			leechers: attr.leechers || 0,
			grabs: attr.times_completed || 0,
			publishDate,
			infoHash: attr.info_hash?.toLowerCase(),
			imdbId,
			tmdbId,
			tvdbId
		};

		return result;
	}

	/**
	 * Normalize IMDB ID to tt-prefixed format.
	 * Handles both string and number inputs from API responses.
	 */
	protected normalizeImdbId(imdbId: string | number | undefined | null): string | undefined {
		if (imdbId === undefined || imdbId === null || imdbId === '') return undefined;

		// Convert to string for consistent handling
		const idStr = String(imdbId);

		// Already has tt prefix
		if (idStr.startsWith('tt')) return idStr;

		// Numeric only - add prefix with zero-padding
		if (/^\d+$/.test(idStr)) {
			return `tt${idStr.padStart(7, '0')}`;
		}

		return idStr;
	}

	/**
	 * Parse freeleech value from API response.
	 * Can be boolean (true/false) or string percentage ("100%", "50%", "25%", etc.)
	 * Returns the download volume factor (0 = 100% free, 0.5 = 50% free, 1 = no discount)
	 */
	protected parseFreeleech(freeleech: boolean | string | undefined): number {
		if (freeleech === undefined || freeleech === null) return 1;

		// Boolean true = 100% freeleech
		if (freeleech === true) return 0;
		if (freeleech === false) return 1;

		// String percentage like "100%", "50%", "25%"
		if (typeof freeleech === 'string') {
			const match = freeleech.match(/^(\d+)%?$/);
			if (match) {
				const percent = parseInt(match[1], 10);
				// 100% freeleech = 0 download factor, 50% = 0.5, 0% = 1
				return 1 - percent / 100;
			}
		}

		// Default: no discount
		return 1;
	}

	/**
	 * Parse a potentially string numeric ID.
	 */
	protected parseNumericId(id: string | number | undefined): number | undefined {
		if (id === undefined || id === null || id === '') return undefined;

		const parsed = typeof id === 'number' ? id : parseInt(String(id), 10);
		return isNaN(parsed) ? undefined : parsed;
	}

	/**
	 * Parse date string to Date object.
	 */
	protected parseDate(dateStr: string | undefined): Date {
		if (!dateStr) return new Date();

		try {
			const parsed = new Date(dateStr);
			return isNaN(parsed.getTime()) ? new Date() : parsed;
		} catch {
			return new Date();
		}
	}

	/**
	 * Type guard for TV search criteria.
	 */
	protected isTvSearch(criteria: SearchCriteria): criteria is TvSearchCriteria {
		return criteria.searchType === 'tv';
	}

	/**
	 * Type guard for Movie search criteria.
	 */
	protected isMovieSearch(criteria: SearchCriteria): criteria is MovieSearchCriteria {
		return criteria.searchType === 'movie';
	}

	/**
	 * Validate test response - check for valid Unit3D API response.
	 */
	protected override validateTestResponse(html: string): boolean {
		// Check for auth error
		if (this.checkAuthError(html)) {
			throw new Error('Authentication failed - invalid API key');
		}

		// Try to parse as JSON
		try {
			const data = JSON.parse(html);
			// Valid Unit3D response should have a data array
			return Array.isArray(data.data);
		} catch {
			// Not JSON - might be HTML error page
			return false;
		}
	}

	/**
	 * Get test URL - use the API endpoint with minimal params.
	 */
	protected override getTestUrl(): string {
		const baseUrl = this.config.baseUrl || this.metadata.urls[0];
		const apiPath = this.getApiPath();
		const apiKey = this.unit3dSettings.apiKey;

		return `${baseUrl.replace(/\/$/, '')}${apiPath}?api_token=${encodeURIComponent(apiKey)}&perPage=1`;
	}
}
