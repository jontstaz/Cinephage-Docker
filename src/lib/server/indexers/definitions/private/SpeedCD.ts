/**
 * SpeedCD Indexer
 *
 * Private general tracker - "Your home now!"
 * Uses cookie-based authentication.
 * Ported from Prowlarr's SpeedCD.cs
 *
 * @see https://speed.cd/
 */

import * as cheerio from 'cheerio';
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

/** SpeedCD-specific settings */
export interface SpeedCDSettings {
	/** Cookie string for authentication */
	cookie: string;
	/** Search freeleech only */
	freeleechOnly?: boolean;
	/** Exclude archives (RAR files) */
	excludeArchives?: boolean;
}

/** Definition ID for registry */
export const SPEEDCD_DEFINITION_ID = 'speedcd';

/**
 * Parse size string to bytes
 */
function parseSize(sizeStr: string): number {
	if (!sizeStr) return 0;

	const match = sizeStr.trim().match(/^([\d.]+)\s*([KMGT]?B?)$/i);
	if (!match) return 0;

	const value = parseFloat(match[1]);
	const unit = match[2].toUpperCase();

	const multipliers: Record<string, number> = {
		B: 1,
		KB: 1024,
		MB: 1024 * 1024,
		GB: 1024 * 1024 * 1024,
		TB: 1024 * 1024 * 1024 * 1024,
		K: 1024,
		M: 1024 * 1024,
		G: 1024 * 1024 * 1024,
		T: 1024 * 1024 * 1024 * 1024
	};

	return Math.floor(value * (multipliers[unit] || 1));
}

/**
 * SpeedCD Indexer Implementation
 */
export class SpeedCDIndexer extends PrivateIndexerBase {
	protected readonly authMethod: AuthMethod = 'cookie';

	protected readonly metadata: IndexerMetadata = {
		id: SPEEDCD_DEFINITION_ID,
		name: 'SpeedCD',
		description: 'Your home now! - Private general tracker',
		urls: ['https://speed.cd/', 'https://speed.click/', 'https://speeders.me/'],
		language: 'en-US',
		privacy: 'private',
		supportsPagination: true,
		requestDelay: 2
	};

	/** Category mapper for SpeedCD categories */
	private readonly categoryMapper: CategoryMapper;

	/** SpeedCD-specific settings */
	private get scdSettings(): SpeedCDSettings {
		return this.config.settings as unknown as SpeedCDSettings;
	}

	readonly capabilities: IndexerCapabilities = {
		search: { available: true, supportedParams: ['q'] },
		tvSearch: { available: true, supportedParams: ['q', 'season', 'ep', 'imdbId'] },
		movieSearch: { available: true, supportedParams: ['q', 'imdbId'] },
		musicSearch: { available: true, supportedParams: ['q'] },
		bookSearch: { available: true, supportedParams: ['q'] },
		categories: this.buildCategoryMap(),
		supportsPagination: true,
		supportsInfoHash: false,
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
		map.set(NewznabCategory.MoviesHD, 'Movies/HD');
		map.set(NewznabCategory.MoviesBluRay, 'Movies/BluRay');
		map.set(NewznabCategory.MoviesDVD, 'Movies/DVD');
		map.set(NewznabCategory.Movies3D, 'Movies/3D');
		map.set(NewznabCategory.TV, 'TV');
		map.set(NewznabCategory.TVHD, 'TV/HD');
		map.set(NewznabCategory.TVSD, 'TV/SD');
		map.set(NewznabCategory.TVAnime, 'TV/Anime');
		map.set(NewznabCategory.TVSport, 'TV/Sports');
		map.set(NewznabCategory.PCISO, 'Games/PC');
		map.set(NewznabCategory.Console, 'Console');
		map.set(NewznabCategory.PC0day, 'Apps');
		map.set(NewznabCategory.PCMac, 'Mac');
		map.set(NewznabCategory.Audio, 'Music');
		map.set(NewznabCategory.Books, 'Books');
		return map;
	}

	private buildCategoryMapper(): CategoryMapper {
		const mapper = new CategoryMapper();

		// Movies
		mapper.addMapping('1', NewznabCategory.MoviesOther, 'Movies/XviD');
		mapper.addMapping('42', NewznabCategory.Movies, 'Movies/Packs');
		mapper.addMapping('32', NewznabCategory.Movies, 'Movies/Kids');
		mapper.addMapping('43', NewznabCategory.MoviesHD, 'Movies/HD');
		mapper.addMapping('47', NewznabCategory.Movies, 'Movies/DiVERSiTY');
		mapper.addMapping('28', NewznabCategory.MoviesBluRay, 'Movies/B-Ray');
		mapper.addMapping('48', NewznabCategory.Movies3D, 'Movies/3D');
		mapper.addMapping('40', NewznabCategory.MoviesDVD, 'Movies/DVD-R');
		mapper.addMapping('56', NewznabCategory.Movies, 'Movies/Anime');

		// TV
		mapper.addMapping('50', NewznabCategory.TVSport, 'TV/Sports');
		mapper.addMapping('52', NewznabCategory.TVHD, 'TV/B-Ray');
		mapper.addMapping('53', NewznabCategory.TVSD, 'TV/DVD-R');
		mapper.addMapping('41', NewznabCategory.TV, 'TV/Packs');
		mapper.addMapping('55', NewznabCategory.TV, 'TV/Kids');
		mapper.addMapping('57', NewznabCategory.TV, 'TV/DiVERSiTY');
		mapper.addMapping('49', NewznabCategory.TVHD, 'TV/HD');
		mapper.addMapping('2', NewznabCategory.TVSD, 'TV/Episodes');
		mapper.addMapping('30', NewznabCategory.TVAnime, 'TV/Anime');

		// Games
		mapper.addMapping('25', NewznabCategory.PCISO, 'Games/PC ISO');
		mapper.addMapping('39', NewznabCategory.ConsoleWii, 'Games/Wii');
		mapper.addMapping('45', NewznabCategory.ConsolePS3, 'Games/PS3');
		mapper.addMapping('35', NewznabCategory.Console, 'Games/Nintendo');
		mapper.addMapping('33', NewznabCategory.ConsoleXBox360, 'Games/XboX360');

		// Apps
		mapper.addMapping('46', NewznabCategory.PCMobileOther, 'Mobile');
		mapper.addMapping('24', NewznabCategory.PC0day, 'Apps/0DAY');
		mapper.addMapping('51', NewznabCategory.PCMac, 'Mac');

		// Books
		mapper.addMapping('54', NewznabCategory.Books, 'Educational');
		mapper.addMapping('27', NewznabCategory.Books, 'Books-Mags');

		// Audio
		mapper.addMapping('26', NewznabCategory.Audio, 'Music/Audio');
		mapper.addMapping('3', NewznabCategory.Audio, 'Music/Flac');
		mapper.addMapping('44', NewznabCategory.Audio, 'Music/Pack');
		mapper.addMapping('29', NewznabCategory.AudioVideo, 'Music/Video');

		return mapper;
	}

	protected buildSearchRequests(criteria: SearchCriteria): SearchRequest[] {
		const settings = this.scdSettings;
		const baseUrl = this.config.baseUrl || this.metadata.urls[0];

		const pathParts: string[] = [];

		// Map categories to tracker IDs
		const trackerCats = this.mapCategoriesToTracker(criteria.categories || []);
		trackerCats.forEach((cat) => pathParts.push(cat));

		// Add filters
		if (settings.freeleechOnly) {
			pathParts.push('freeleech');
		}

		if (settings.excludeArchives) {
			pathParts.push('norar');
		}

		// Determine search term and if we need deep search
		let searchTerm = '';
		let useDeepSearch = false;

		if (this.isMovieSearch(criteria)) {
			const movieCriteria = criteria as MovieSearchCriteria;
			if (movieCriteria.imdbId) {
				searchTerm = movieCriteria.imdbId.startsWith('tt')
					? movieCriteria.imdbId
					: `tt${movieCriteria.imdbId}`;
				useDeepSearch = true;
			} else {
				searchTerm = sanitizeSearchTerm(movieCriteria.query || '');
			}
		} else if (this.isTvSearch(criteria)) {
			const tvCriteria = criteria as TvSearchCriteria;
			if (tvCriteria.imdbId) {
				searchTerm = tvCriteria.imdbId.startsWith('tt')
					? tvCriteria.imdbId
					: `tt${tvCriteria.imdbId}`;

				// Append episode search string if present
				if (tvCriteria.season != null) {
					const seasonStr = tvCriteria.season.toString().padStart(2, '0');
					if (tvCriteria.episode != null) {
						searchTerm += ` S${seasonStr}E${tvCriteria.episode.toString().padStart(2, '0')}`;
					} else {
						searchTerm += ` S${seasonStr}*`;
					}
				}
				useDeepSearch = true;
			} else {
				searchTerm = sanitizeSearchTerm(tvCriteria.query || '');
				if (tvCriteria.season != null) {
					const seasonStr = tvCriteria.season.toString().padStart(2, '0');
					if (tvCriteria.episode != null) {
						searchTerm += ` S${seasonStr}E${tvCriteria.episode.toString().padStart(2, '0')}`;
					} else {
						searchTerm += ` S${seasonStr}`;
					}
				}
			}
		} else {
			searchTerm = sanitizeSearchTerm((criteria as BasicSearchCriteria).query || '');
		}

		if (useDeepSearch) {
			pathParts.push('deep');
		}

		if (searchTerm.trim()) {
			pathParts.push('q');
			pathParts.push(encodeURIComponent(searchTerm.trim()));
		}

		const searchUrl = `${baseUrl.replace(/\/$/, '')}/browse/${pathParts.join('/')}`;

		return [
			{
				url: searchUrl,
				method: 'GET',
				headers: {
					Accept: 'text/html,application/xhtml+xml',
					Cookie: settings.cookie || ''
				}
			}
		];
	}

	protected parseSearchResponse(html: string): ReleaseResult[] {
		const results: ReleaseResult[] = [];
		const baseUrl = this.config.baseUrl || this.metadata.urls[0];

		// Check if login is needed
		if (!html.includes('/browse.php')) {
			this.log.warn('SpeedCD requires login - cookie may be expired');
			return results;
		}

		const $ = cheerio.load(html);
		const rows = $('div.boxContent > table > tbody > tr');

		rows.each((_, row) => {
			try {
				const $row = $(row);

				// Get title
				const titleEl = $row.find('td:nth-child(2) > div > a[href^="/t/"]');
				const rawTitle = titleEl.text().trim();
				const title = this.cleanTitle(rawTitle);

				if (!title) {
					return;
				}

				// Get URLs
				const downloadPath = $row.find('td:nth-child(4) a[href^="/download/"]').attr('href');
				const infoPath = titleEl.attr('href');

				if (!downloadPath || !infoPath) {
					return;
				}

				const downloadUrl = `${baseUrl.replace(/\/$/, '')}${downloadPath.startsWith('/') ? '' : '/'}${downloadPath}`;
				const infoUrl = `${baseUrl.replace(/\/$/, '')}${infoPath.startsWith('/') ? '' : '/'}${infoPath}`;

				// Get stats
				const seeders = parseInt($row.find('td:nth-child(8)').text().trim(), 10) || 0;
				const leechers = parseInt($row.find('td:nth-child(9)').text().trim(), 10) || 0;
				const grabs = parseInt($row.find('td:nth-child(7)').text().trim(), 10) || 0;
				const sizeText = $row.find('td:nth-child(6)').text().trim();
				const size = parseSize(sizeText);

				// Get category
				const catPath = $row.find('td:nth-child(1) a').attr('href');
				const catId = catPath ? catPath.split('/').pop() : undefined;
				const categories = catId
					? this.categoryMapper.mapTrackerToNewznab(catId)
					: [NewznabCategory.Other];

				// Get date
				const dateStr = $row
					.find('td:nth-child(2) span[class^="elapsedDate"]')
					.attr('title')
					?.replace(' at', '');
				let publishDate = new Date();
				if (dateStr) {
					try {
						// Format: "Friday, January 10, 2025 5:30PM"
						publishDate = new Date(dateStr);
					} catch {
						// Use current date as fallback
					}
				}

				const result: ReleaseResult = {
					indexerId: this.id,
					indexerName: this.name,
					protocol: 'torrent',
					title: title,
					guid: infoUrl,
					downloadUrl: downloadUrl,
					commentsUrl: infoUrl,
					categories: categories,
					size: size,
					seeders: seeders,
					leechers: leechers,
					grabs: grabs,
					publishDate: publishDate
				};

				results.push(result);
			} catch (error) {
				this.log.debug('Failed to parse SpeedCD row', { error });
			}
		});

		return results;
	}

	/**
	 * Clean up title by removing request tags.
	 */
	private cleanTitle(title: string): string {
		return title
			.replace(/\[REQ(UEST)?\]/gi, '')
			.trim()
			.replace(/^[. ]+|[. ]+$/g, '');
	}

	/**
	 * Map Newznab categories to SpeedCD tracker category IDs.
	 */
	private mapCategoriesToTracker(categories: number[]): string[] {
		const trackerCats: string[] = [];

		// Reverse mapping from Newznab to tracker IDs
		const reverseMap: Record<number, string[]> = {
			[NewznabCategory.Movies]: ['42', '32', '47'],
			[NewznabCategory.MoviesOther]: ['1'],
			[NewznabCategory.MoviesHD]: ['43'],
			[NewznabCategory.MoviesBluRay]: ['28'],
			[NewznabCategory.Movies3D]: ['48'],
			[NewznabCategory.MoviesDVD]: ['40'],
			[NewznabCategory.TV]: ['41', '55', '57'],
			[NewznabCategory.TVHD]: ['52', '49'],
			[NewznabCategory.TVSD]: ['53', '2'],
			[NewznabCategory.TVAnime]: ['30'],
			[NewznabCategory.TVSport]: ['50'],
			[NewznabCategory.PCISO]: ['25'],
			[NewznabCategory.ConsoleWii]: ['39'],
			[NewznabCategory.ConsolePS3]: ['45'],
			[NewznabCategory.Console]: ['35'],
			[NewznabCategory.ConsoleXBox360]: ['33'],
			[NewznabCategory.PCMobileOther]: ['46'],
			[NewznabCategory.PC0day]: ['24'],
			[NewznabCategory.PCMac]: ['51'],
			[NewznabCategory.Books]: ['54', '27'],
			[NewznabCategory.Audio]: ['26', '3', '44'],
			[NewznabCategory.AudioVideo]: ['29']
		};

		for (const cat of categories) {
			const mapped = reverseMap[cat];
			if (mapped) {
				trackerCats.push(...mapped);
			}
		}

		return [...new Set(trackerCats)]; // Remove duplicates
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
 * Factory function to create a SpeedCD indexer.
 */
export function createSpeedCDIndexer(config: NativeIndexerConfig): SpeedCDIndexer {
	return new SpeedCDIndexer(config);
}
