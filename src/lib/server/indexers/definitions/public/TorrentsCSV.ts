/**
 * TorrentsCSV Indexer
 *
 * Public self-hostable open source torrent search engine and database.
 * Uses JSON API for searching, returns magnet links via info hash.
 * Ported from Prowlarr's TorrentsCSV.cs
 *
 * @see https://torrents-csv.com/
 */

import { PublicIndexerBase } from '../base/PublicIndexerBase';
import {
	type NativeIndexerConfig,
	type IndexerMetadata,
	type SearchRequest,
	buildQueryString,
	sanitizeSearchTerm
} from '../base/IndexerBase';
import { NewznabCategory } from '../base/Categories';
import { Category } from '../../core/types';
import type { IndexerCapabilities } from '../../core/capabilities';
import type {
	SearchCriteria,
	TvSearchCriteria,
	MovieSearchCriteria,
	BasicSearchCriteria
} from '../../core/searchCriteria';
import type { ReleaseResult } from '../../core/releaseResult';

/** TorrentsCSV API response types */
interface TorrentsCSVTorrent {
	infohash: string;
	name: string;
	size_bytes: number;
	created_unix: number;
	leechers?: number;
	seeders?: number;
	completed?: number;
}

interface TorrentsCSVResponse {
	torrents: TorrentsCSVTorrent[];
}

/** Definition ID for registry */
export const TORRENTSCSV_DEFINITION_ID = 'torrentscsv';

/**
 * TorrentsCSV Indexer Implementation
 */
export class TorrentsCSVIndexer extends PublicIndexerBase {
	protected readonly metadata: IndexerMetadata = {
		id: TORRENTSCSV_DEFINITION_ID,
		name: 'TorrentsCSV',
		description: 'Torrents.csv is a self-hostable open source torrent search engine and database',
		urls: ['https://torrents-csv.com/'],
		legacyUrls: ['https://torrents-csv.ml/'],
		language: 'en-US',
		privacy: 'public',
		supportsPagination: false,
		requestDelay: 1
	};

	readonly capabilities: IndexerCapabilities = {
		search: { available: true, supportedParams: ['q'] },
		tvSearch: { available: true, supportedParams: ['q', 'season', 'ep'] },
		movieSearch: { available: true, supportedParams: ['q'] },
		musicSearch: { available: false, supportedParams: [] },
		bookSearch: { available: false, supportedParams: [] },
		categories: this.buildCategoryMap(),
		supportsPagination: false,
		supportsInfoHash: true,
		limitMax: 100,
		limitDefault: 100
	};

	constructor(config: NativeIndexerConfig) {
		super(config);
	}

	/** Build category map for capabilities */
	private buildCategoryMap(): Map<number, string> {
		const map = new Map<number, string>();
		// TorrentsCSV doesn't have categories, everything maps to "Other"
		map.set(NewznabCategory.Other, 'Other');
		return map;
	}

	/**
	 * Build search requests for TorrentsCSV API
	 */
	protected buildSearchRequests(criteria: SearchCriteria): SearchRequest[] {
		let term = '';

		switch (criteria.searchType) {
			case 'tv': {
				const tvCriteria = criteria as TvSearchCriteria;
				term = tvCriteria.query || '';
				if (tvCriteria.season) {
					term += ` S${String(tvCriteria.season).padStart(2, '0')}`;
					if (tvCriteria.episode) {
						term += `E${String(tvCriteria.episode).padStart(2, '0')}`;
					}
				}
				break;
			}
			case 'movie': {
				const movieCriteria = criteria as MovieSearchCriteria;
				term = movieCriteria.query || '';
				if (movieCriteria.year) {
					term += ` ${movieCriteria.year}`;
				}
				break;
			}
			case 'basic':
			default: {
				const basicCriteria = criteria as BasicSearchCriteria;
				term = basicCriteria.query || '';
				break;
			}
		}

		term = sanitizeSearchTerm(term);

		// TorrentsCSV requires at least 3 characters
		if (!term || term.length < 3) {
			this.log.debug('Search term too short (min 3 chars required)');
			return [];
		}

		const params: Record<string, string> = {
			q: term,
			size: '100'
		};

		return [
			{
				url: `${this.baseUrl}service/search?${buildQueryString(params)}`,
				method: 'GET',
				headers: {
					Accept: 'application/json'
				}
			}
		];
	}

	/**
	 * Parse TorrentsCSV JSON response
	 */
	protected parseSearchResponse(responseText: string): ReleaseResult[] {
		const results: ReleaseResult[] = [];

		let data: TorrentsCSVResponse;
		try {
			data = JSON.parse(responseText);
		} catch {
			this.log.error('Failed to parse TorrentsCSV JSON response');
			return results;
		}

		if (!data.torrents || !Array.isArray(data.torrents)) {
			return results;
		}

		for (const torrent of data.torrents) {
			if (!torrent || !torrent.infohash) {
				continue;
			}

			const infoHash = torrent.infohash;
			const title = torrent.name;
			const seeders = torrent.seeders ?? 0;
			const leechers = torrent.leechers ?? 0;
			const grabs = torrent.completed ?? 0;
			const publishDate = new Date(torrent.created_unix * 1000);

			// Generate magnet URL from info hash
			const magnetUrl = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}`;

			const release: ReleaseResult = {
				guid: magnetUrl,
				title,
				commentsUrl: `${this.baseUrl}search?q=${encodeURIComponent(title)}`,
				downloadUrl: magnetUrl,
				magnetUrl,
				infoHash,
				categories: [Category.MOVIE], // TorrentsCSV is general, default to movies
				publishDate,
				size: torrent.size_bytes,
				seeders,
				leechers,
				protocol: 'torrent',
				indexerId: this.id,
				indexerName: this.name,
				grabs
			};

			results.push(release);
		}

		// Sort by publish date descending
		results.sort((a, b) => (b.publishDate?.getTime() ?? 0) - (a.publishDate?.getTime() ?? 0));

		return results;
	}
}

/**
 * Factory function for creating TorrentsCSV indexer instances
 */
export function createTorrentsCSVIndexer(config: NativeIndexerConfig): TorrentsCSVIndexer {
	return new TorrentsCSVIndexer(config);
}
