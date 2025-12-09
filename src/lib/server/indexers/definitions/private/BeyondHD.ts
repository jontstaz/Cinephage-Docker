/**
 * BeyondHD Indexer
 *
 * Private HD tracker with JSON API.
 * Supports IMDB/TMDB search, freeleech/limited filtering.
 * Ported from Prowlarr's BeyondHD.cs
 *
 * @see https://beyond-hd.me/
 */

import { PrivateIndexerBase, type AuthMethod } from '../base/PrivateIndexerBase';
import {
	type NativeIndexerConfig,
	type IndexerMetadata,
	type SearchRequest,
	sanitizeSearchTerm
} from '../base/IndexerBase';
import { NewznabCategory, CategoryMapper } from '../base/Categories';
import type { IndexerCapabilities } from '../../core/capabilities';
import type {
	SearchCriteria,
	TvSearchCriteria,
	MovieSearchCriteria,
	BasicSearchCriteria
} from '../../core/searchCriteria';
import type { ReleaseResult } from '../../core/releaseResult';

/** BeyondHD-specific settings */
export interface BeyondHDSettings {
	/** API key for authentication (32 characters) */
	apiKey: string;
	/** RSS key for feeds (32 characters) */
	rssKey: string;
	/** Search freeleech only */
	freeleechOnly?: boolean;
	/** Search limited only */
	limitedOnly?: boolean;
	/** Search refund only */
	refundOnly?: boolean;
	/** Search rewind only */
	rewindOnly?: boolean;
	/** Search types (resolution/format filters) */
	searchTypes?: BeyondHDSearchType[];
}

/** Available search type filters */
export enum BeyondHDSearchType {
	UHD_100 = 'UHD 100',
	UHD_66 = 'UHD 66',
	UHD_50 = 'UHD 50',
	UHD_REMUX = 'UHD Remux',
	BD_50 = 'BD 50',
	BD_25 = 'BD 25',
	BD_REMUX = 'BD Remux',
	RES_2160P = '2160p',
	RES_1080P = '1080p',
	RES_1080I = '1080i',
	RES_720P = '720p',
	RES_576P = '576p',
	RES_540P = '540p',
	DVD_9 = 'DVD 9',
	DVD_5 = 'DVD 5',
	DVD_REMUX = 'DVD Remux',
	RES_480P = '480p',
	OTHER = 'Other'
}

/** Definition ID for registry */
export const BEYONDHD_DEFINITION_ID = 'beyondhd';

/** BeyondHD API response format */
interface BeyondHDResponse {
	status_code: number;
	status_message?: string;
	results: BeyondHDTorrent[];
}

/** Individual torrent result from API */
interface BeyondHDTorrent {
	name: string;
	info_hash: string;
	category: string;
	type: string;
	size: number;
	times_completed: number;
	seeders: number;
	leechers: number;
	audios?: string;
	subtitles?: string;
	created_at: string;
	download_url: string;
	url: string;
	imdb_id?: string;
	tmdb_id?: string;
	freeleech: boolean;
	promo25: boolean;
	promo50: boolean;
	promo75: boolean;
	limited: boolean;
	exclusive: boolean;
	internal: boolean;
}

/**
 * BeyondHD Indexer Implementation
 */
export class BeyondHDIndexer extends PrivateIndexerBase {
	protected readonly authMethod: AuthMethod = 'apikey';

	protected readonly metadata: IndexerMetadata = {
		id: BEYONDHD_DEFINITION_ID,
		name: 'BeyondHD',
		description: 'Private HD tracker - Movies and TV',
		urls: ['https://beyond-hd.me/'],
		language: 'en-US',
		privacy: 'private',
		supportsPagination: true,
		requestDelay: 2
	};

	/** Category mapper for BeyondHD categories */
	private readonly categoryMapper: CategoryMapper;

	/** BeyondHD-specific settings */
	private get bhdSettings(): BeyondHDSettings {
		return this.config.settings as unknown as BeyondHDSettings;
	}

	readonly capabilities: IndexerCapabilities = {
		search: { available: true, supportedParams: ['q'] },
		tvSearch: { available: true, supportedParams: ['q', 'season', 'ep', 'imdbId'] },
		movieSearch: { available: true, supportedParams: ['q', 'imdbId', 'tmdbId'] },
		musicSearch: { available: false, supportedParams: [] },
		bookSearch: { available: false, supportedParams: [] },
		categories: this.buildCategoryMap(),
		supportsPagination: true,
		supportsInfoHash: true,
		limitMax: 100,
		limitDefault: 100
	};

	constructor(config: NativeIndexerConfig) {
		super(config);
		this.categoryMapper = this.buildCategoryMapper();
	}

	/** Build category map for capabilities */
	private buildCategoryMap(): Map<number, string> {
		const map = new Map<number, string>();
		map.set(NewznabCategory.Movies, 'Movies');
		map.set(NewznabCategory.TV, 'TV');
		return map;
	}

	private buildCategoryMapper(): CategoryMapper {
		const mapper = new CategoryMapper();
		mapper.addMapping('Movies', NewznabCategory.Movies, 'Movies');
		mapper.addMapping('TV', NewznabCategory.TV, 'TV');
		return mapper;
	}

	protected buildSearchRequests(criteria: SearchCriteria): SearchRequest[] {
		const settings = this.bhdSettings;
		const baseUrl = this.config.baseUrl || this.metadata.urls[0];

		// Build search body
		const body: Record<string, unknown> = {
			action: 'search'
		};

		// Determine search term based on criteria type
		let searchTerm = '';
		let imdbId: string | undefined;
		let tmdbId: number | undefined;

		if (this.isTvSearch(criteria)) {
			const tvCriteria = criteria as TvSearchCriteria;
			searchTerm = sanitizeSearchTerm(tvCriteria.query || '');

			// Handle date-based shows
			if (tvCriteria.season && tvCriteria.episode) {
				// Try parsing as date format (YYYY MM/DD)
				const dateMatch = `${tvCriteria.season} ${tvCriteria.episode}`.match(
					/^(\d{4})\s+(\d{2})\/(\d{2})$/
				);
				if (dateMatch) {
					const [, year, month, day] = dateMatch;
					searchTerm = `${sanitizeSearchTerm(tvCriteria.query || '')} ${year}-${month}-${day}`;
				}
			}

			imdbId = tvCriteria.imdbId;
		} else if (this.isMovieSearch(criteria)) {
			const movieCriteria = criteria as MovieSearchCriteria;
			searchTerm = sanitizeSearchTerm(movieCriteria.query || '');
			imdbId = movieCriteria.imdbId;
			tmdbId = movieCriteria.tmdbId;
		} else {
			searchTerm = sanitizeSearchTerm((criteria as BasicSearchCriteria).query || '');
		}

		if (searchTerm) {
			body.search = searchTerm;
		}

		// Add IMDB ID
		if (imdbId) {
			body.imdb_id = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
		}

		// Add TMDB ID
		if (tmdbId) {
			body.tmdb_id = tmdbId;
		}

		// Add category filter
		const categoryMap: Record<number, string> = {
			[NewznabCategory.Movies]: 'Movies',
			[NewznabCategory.TV]: 'TV'
		};

		const mappedCategories = (criteria.categories || [])
			.map((cat) => categoryMap[cat])
			.filter((c): c is string => c !== undefined);

		if (mappedCategories.length > 0) {
			body.categories = mappedCategories;
		}

		// Add freeleech/limited/etc filters
		if (settings.freeleechOnly) {
			body.freeleech = 1;
		}
		if (settings.limitedOnly) {
			body.limited = 1;
		}
		if (settings.refundOnly) {
			body.refund = 1;
		}
		if (settings.rewindOnly) {
			body.rewind = 1;
		}

		// Add search type filters
		if (settings.searchTypes && settings.searchTypes.length > 0) {
			body.types = settings.searchTypes;
		}

		// Build URL with API key
		const searchUrl = `${baseUrl.replace(/\/$/, '')}/api/torrents/${settings.apiKey}`;

		return [
			{
				url: searchUrl,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify(body)
			}
		];
	}

	protected parseSearchResponse(responseText: string): ReleaseResult[] {
		const settings = this.bhdSettings;
		const results: ReleaseResult[] = [];

		let data: BeyondHDResponse;
		try {
			// Check for invalid API key
			if (responseText.toLowerCase().includes('invalid api key')) {
				throw new Error('API Key invalid or not authorized');
			}

			data = JSON.parse(responseText);
		} catch (error) {
			this.log.error('Failed to parse BeyondHD response', { error });
			return results;
		}

		if (data.status_code === 0) {
			this.log.warn('BeyondHD API error', { message: data.status_message });
			return results;
		}

		if (!data.results || !Array.isArray(data.results)) {
			return results;
		}

		for (const row of data.results) {
			try {
				// Skip if filters don't match
				if (settings.freeleechOnly && !row.freeleech) {
					continue;
				}
				if (settings.limitedOnly && !row.limited) {
					continue;
				}

				// Parse TMDB ID (BHD returns weird formats like "movie/12345")
				let tmdbId: number | undefined;
				if (row.tmdb_id) {
					const tmdbMatch = row.tmdb_id.split('/')[1];
					if (tmdbMatch) {
						const parsed = parseInt(tmdbMatch, 10);
						if (!isNaN(parsed)) {
							tmdbId = parsed;
						}
					}
				}

				// Parse IMDB ID
				let imdbId: string | undefined;
				if (row.imdb_id) {
					imdbId = row.imdb_id.startsWith('tt') ? row.imdb_id : `tt${row.imdb_id}`;
				}

				// Map category
				const categories = this.categoryMapper.mapTrackerToNewznab(row.category);

				const result: ReleaseResult = {
					indexerId: this.id,
					indexerName: this.name,
					protocol: 'torrent',
					title: row.name,
					guid: row.url,
					downloadUrl: row.download_url,
					commentsUrl: row.url,
					categories: categories,
					size: row.size,
					seeders: row.seeders,
					leechers: row.leechers,
					grabs: row.times_completed,
					publishDate: new Date(row.created_at),
					infoHash: row.info_hash,
					imdbId: imdbId,
					tmdbId: tmdbId
				};

				results.push(result);
			} catch (error) {
				this.log.debug('Failed to parse BeyondHD result', { error, name: row.name });
			}
		}

		// Sort by publish date descending
		results.sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());

		return results;
	}

	// Type guard helpers
	private isTvSearch(criteria: SearchCriteria): boolean {
		return criteria.searchType === 'tv';
	}

	private isMovieSearch(criteria: SearchCriteria): boolean {
		return criteria.searchType === 'movie';
	}
}

/**
 * Factory function to create a BeyondHD indexer.
 */
export function createBeyondHDIndexer(config: NativeIndexerConfig): BeyondHDIndexer {
	return new BeyondHDIndexer(config);
}
