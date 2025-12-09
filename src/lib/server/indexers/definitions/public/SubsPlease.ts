/**
 * SubsPlease Indexer
 *
 * Public anime indexer - a better HorribleSubs/Erai replacement.
 * Uses JSON API for searching.
 * Ported from Prowlarr's SubsPlease.cs
 *
 * @see https://subsplease.org/
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
import type { IndexerCapabilities } from '../../core/capabilities';
import type {
	SearchCriteria,
	TvSearchCriteria,
	MovieSearchCriteria,
	BasicSearchCriteria
} from '../../core/searchCriteria';
import type { ReleaseResult } from '../../core/releaseResult';

/** SubsPlease API response types */
interface SubsPleaseDownloadInfo {
	res: string; // Resolution: "1080", "720", "480"
	magnet: string;
}

interface SubsPleaseRelease {
	time: string;
	release_date: string; // ISO date string
	show: string;
	episode: string;
	downloads: SubsPleaseDownloadInfo[];
	xdcc: string;
	image_url: string;
	page: string;
}

type SubsPleaseResponse = Record<string, SubsPleaseRelease>;

/**
 * SubsPlease public anime indexer.
 * Uses a JSON API and provides magnet links only (no torrent files).
 */
export class SubsPleaseIndexer extends PublicIndexerBase {
	protected readonly metadata: IndexerMetadata = {
		id: 'subsplease',
		name: 'SubsPlease',
		description: 'SubsPlease - A better HorribleSubs/Erai replacement',
		urls: [
			'https://subsplease.org/',
			'https://subsplease.mrunblock.bond/',
			'https://subsplease.nocensor.click/'
		],
		legacyUrls: ['https://subsplease.nocensor.space/'],
		language: 'en-US',
		privacy: 'public',
		requestDelay: 2
	};

	readonly capabilities: IndexerCapabilities = {
		search: { available: true, supportedParams: ['q'] },
		tvSearch: { available: true, supportedParams: ['q', 'season', 'ep'] },
		movieSearch: { available: true, supportedParams: ['q'] },
		categories: this.buildCategoryMap(),
		supportsPagination: false,
		supportsInfoHash: false,
		limitMax: 100,
		limitDefault: 100
	};

	/** Build category map for capabilities */
	private buildCategoryMap(): Map<number, string> {
		const map = new Map<number, string>();
		map.set(NewznabCategory.TVAnime, 'Anime');
		map.set(NewznabCategory.MoviesOther, 'Movies');
		return map;
	}

	/**
	 * Build search requests for the given criteria.
	 */
	protected buildSearchRequests(criteria: SearchCriteria): SearchRequest[] {
		const params: Record<string, string> = {
			tz: 'UTC'
		};

		// Check if this is an RSS/recent search
		if (!criteria.query && criteria.searchType === 'basic') {
			params.f = 'latest';
		} else {
			let searchTerm = this.getSearchTerm(criteria);

			// Remove [SubsPlease] prefix if present
			searchTerm = searchTerm.replace(/\[?SubsPlease\]?\s*/gi, '').trim();

			// Remove resolution from query (API returns all resolutions)
			searchTerm = searchTerm.replace(/\d{3,4}p/gi, '').trim();

			params.f = 'search';
			params.s = searchTerm;
		}

		const url = `${this.baseUrl.replace(/\/$/, '')}/api/?${buildQueryString(params)}`;

		return [
			{
				url,
				headers: { Accept: 'application/json' }
			}
		];
	}

	/** Get search term from criteria */
	private getSearchTerm(criteria: SearchCriteria): string {
		switch (criteria.searchType) {
			case 'tv': {
				const tvCriteria = criteria as TvSearchCriteria;
				let term = sanitizeSearchTerm(tvCriteria.query);

				// Only include season > 1, format as S2 rather than S02
				if (tvCriteria.season && tvCriteria.season > 1) {
					term += ` S${tvCriteria.season}`;
				}

				// Include episode number
				if (tvCriteria.episode) {
					term += ` ${String(tvCriteria.episode).padStart(2, '0')}`;
				}

				return term;
			}
			case 'movie':
				return sanitizeSearchTerm((criteria as MovieSearchCriteria).query);
			default:
				return sanitizeSearchTerm((criteria as BasicSearchCriteria).query);
		}
	}

	/**
	 * Parse JSON API response into release results.
	 */
	protected parseSearchResponse(response: string): ReleaseResult[] {
		const releases: ReleaseResult[] = [];

		// Empty response or empty array means no results
		if (!response || response.trim() === '' || response.trim() === '[]') {
			return releases;
		}

		try {
			const data = JSON.parse(response) as SubsPleaseResponse;

			for (const release of Object.values(data)) {
				for (const download of release.downloads) {
					try {
						const result = this.parseRelease(release, download);
						if (result) {
							releases.push(result);
						}
					} catch (error) {
						this.log.debug('Failed to parse release', { show: release.show, error });
					}
				}
			}
		} catch (error) {
			this.log.warn('Failed to parse JSON response', { error });
		}

		return releases;
	}

	/** Parse a single release from the API response */
	private parseRelease(
		release: SubsPleaseRelease,
		download: SubsPleaseDownloadInfo
	): ReleaseResult | null {
		if (!download.magnet) {
			return null;
		}

		// Determine categories
		const categories: number[] = [NewznabCategory.TVAnime];
		if (release.episode.toLowerCase() === 'movie') {
			categories.push(NewznabCategory.MoviesOther);
		}

		// Build title: [SubsPlease] Show Name - Episode (Resolution)
		const title = `[SubsPlease] ${release.show} - ${release.episode} (${download.res}p)`;

		// Parse publish date
		let publishDate: Date;
		try {
			publishDate = new Date(release.release_date);
			if (isNaN(publishDate.getTime())) {
				publishDate = new Date();
			}
		} catch {
			publishDate = new Date();
		}

		// Extract size from magnet URL or estimate based on resolution
		const size = this.getReleaseSize(download);

		// Build info URL
		const infoUrl = `${this.baseUrl}shows/${release.page}/`;

		return {
			guid: download.magnet,
			title,
			downloadUrl: download.magnet,
			magnetUrl: download.magnet,
			commentsUrl: infoUrl,
			publishDate,
			size,
			indexerId: this.id,
			indexerName: this.name,
			protocol: 'torrent',
			categories,
			seeders: 1, // API doesn't provide seeder counts
			leechers: 1
		};
	}

	/** Get release size from magnet URL or estimate based on resolution */
	private getReleaseSize(download: SubsPleaseDownloadInfo): number {
		// Try to extract size from magnet URL (&xl=SIZE)
		if (download.magnet) {
			const match = download.magnet.match(/&xl=(\d+)/);
			if (match) {
				const size = parseInt(match[1], 10);
				if (size > 0) {
					return size;
				}
			}
		}

		// Estimate size based on resolution
		const GB = 1024 * 1024 * 1024;
		const MB = 1024 * 1024;

		switch (download.res) {
			case '1080':
				return Math.floor(1.3 * GB);
			case '720':
				return Math.floor(700 * MB);
			case '480':
				return Math.floor(350 * MB);
			default:
				return Math.floor(1 * GB);
		}
	}

	/** Override to handle JSON response validation */
	protected override validateTestResponse(response: string): boolean {
		// Check for Cloudflare
		if (response.includes('cf-browser-verification') || response.includes('Just a moment...')) {
			throw new Error('Cloudflare protection detected');
		}

		// Should be valid JSON (either object or empty array)
		try {
			JSON.parse(response);
			return true;
		} catch {
			return false;
		}
	}

	/** Get test URL - use API endpoint */
	protected override getTestUrl(): string {
		return `${this.baseUrl.replace(/\/$/, '')}/api/?f=latest&tz=UTC`;
	}
}

/** Factory function to create SubsPlease indexer */
export function createSubsPleaseIndexer(config: NativeIndexerConfig): SubsPleaseIndexer {
	return new SubsPleaseIndexer(config);
}

/** SubsPlease definition ID for registration */
export const SUBSPLEASE_DEFINITION_ID = 'subsplease';
