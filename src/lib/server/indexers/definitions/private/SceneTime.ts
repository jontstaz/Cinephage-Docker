/**
 * SceneTime Indexer
 *
 * Private torrent tracker - "Always on time"
 * Uses cookie authentication and HTML parsing.
 * Ported from Prowlarr's SceneTime.cs
 *
 * @see https://www.scenetime.com/
 */

import * as cheerio from 'cheerio';
import { PrivateIndexerBase, type AuthMethod } from '../base/PrivateIndexerBase';
import {
	type NativeIndexerConfig,
	type IndexerMetadata,
	type SearchRequest,
	buildQueryString,
	sanitizeSearchTerm
} from '../base/IndexerBase';
import { NewznabCategory, CategoryMapper } from '../base/Categories';
import type { IndexerCapabilities } from '../../core/capabilities';
import type {
	SearchCriteria,
	TvSearchCriteria,
	MovieSearchCriteria,
	MusicSearchCriteria,
	BookSearchCriteria,
	BasicSearchCriteria
} from '../../core/searchCriteria';
import type { ReleaseResult } from '../../core/releaseResult';

/** SceneTime-specific settings */
export interface SceneTimeSettings {
	/** Cookie string for authentication */
	cookie: string;
	/** Search freeleech only */
	freeleechOnly?: boolean;
}

/** Definition ID for registry */
export const SCENETIME_DEFINITION_ID = 'scenetime';

/**
 * SceneTime Indexer Implementation
 */
export class SceneTimeIndexer extends PrivateIndexerBase {
	protected readonly authMethod: AuthMethod = 'cookie';

	protected readonly metadata: IndexerMetadata = {
		id: SCENETIME_DEFINITION_ID,
		name: 'SceneTime',
		description: 'Always on time - Private general tracker',
		urls: ['https://www.scenetime.com/'],
		language: 'en-US',
		privacy: 'private',
		supportsPagination: false,
		requestDelay: 2
	};

	private readonly categoryMapper: CategoryMapper;

	/** SceneTime-specific settings */
	private get stSettings(): SceneTimeSettings {
		return this.config.settings as unknown as SceneTimeSettings;
	}

	readonly capabilities: IndexerCapabilities = {
		search: { available: true, supportedParams: ['q'] },
		tvSearch: { available: true, supportedParams: ['q', 'season', 'ep', 'imdbId'] },
		movieSearch: { available: true, supportedParams: ['q', 'imdbId'] },
		musicSearch: { available: true, supportedParams: ['q'] },
		bookSearch: { available: true, supportedParams: ['q'] },
		categories: this.buildCategoryMap(),
		supportsPagination: false,
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
		// Movies
		map.set(NewznabCategory.Movies, 'Movie Packs');
		map.set(NewznabCategory.MoviesSD, 'Movies SD');
		map.set(NewznabCategory.MoviesHD, 'Movies HD');
		map.set(NewznabCategory.Movies3D, 'Movies 3D');
		map.set(NewznabCategory.MoviesUHD, 'Movies UHD');
		map.set(NewznabCategory.MoviesOther, 'Movies CAM/TS');
		// TV
		map.set(NewznabCategory.TV, 'TV Packs');
		map.set(NewznabCategory.TVHD, 'TV HD');
		map.set(NewznabCategory.TVSD, 'TV SD');
		map.set(NewznabCategory.TVUHD, 'TV UHD');
		map.set(NewznabCategory.TVAnime, 'TV Anime');
		// Games
		map.set(NewznabCategory.PCGames, 'Games PC-ISO');
		map.set(NewznabCategory.ConsoleXBox, 'Games XBOX');
		map.set(NewznabCategory.ConsoleWii, 'Games Wii');
		map.set(NewznabCategory.ConsoleNDS, 'Games Nintendo');
		map.set(NewznabCategory.ConsolePS4, 'Games PS');
		map.set(NewznabCategory.ConsoleOther, 'Games Dreamcast');
		// Software
		map.set(NewznabCategory.PCMac, 'Mac/Linux');
		map.set(NewznabCategory.PC0day, 'Apps');
		map.set(NewznabCategory.PCMobileOther, 'Mobile Apps');
		// Books & Audio
		map.set(NewznabCategory.Books, 'Books and Magazines');
		map.set(NewznabCategory.BooksComics, 'Books Comics');
		map.set(NewznabCategory.Audio, 'Music');
		return map;
	}

	/** Build category mapper for SceneTime's category IDs */
	private buildCategoryMapper(): CategoryMapper {
		const mapper = new CategoryMapper();
		// Movies
		mapper.addMapping(47, NewznabCategory.Movies, 'Movie Packs');
		mapper.addMapping(57, NewznabCategory.MoviesSD, 'Movies SD');
		mapper.addMapping(59, NewznabCategory.MoviesHD, 'Movies HD');
		mapper.addMapping(64, NewznabCategory.Movies3D, 'Movies 3D');
		mapper.addMapping(16, NewznabCategory.MoviesUHD, 'Movies UHD');
		mapper.addMapping(82, NewznabCategory.MoviesOther, 'Movies CAM/TS');
		// TV
		mapper.addMapping(43, NewznabCategory.TV, 'TV Packs');
		mapper.addMapping(9, NewznabCategory.TVHD, 'TV HD');
		mapper.addMapping(77, NewznabCategory.TVSD, 'TV SD');
		mapper.addMapping(2, NewznabCategory.TVUHD, 'TV UHD');
		mapper.addMapping(1, NewznabCategory.TVAnime, 'TV ANIME');
		// Games
		mapper.addMapping(6, NewznabCategory.PCGames, 'Games PC-ISO');
		mapper.addMapping(48, NewznabCategory.ConsoleXBox, 'Games XBOX');
		mapper.addMapping(51, NewznabCategory.ConsoleWii, 'Games Wii');
		mapper.addMapping(55, NewznabCategory.ConsoleNDS, 'Games Nintendo');
		mapper.addMapping(12, NewznabCategory.ConsolePS4, 'Games PS');
		mapper.addMapping(15, NewznabCategory.ConsoleOther, 'Games Dreamcast');
		// Software
		mapper.addMapping(52, NewznabCategory.PCMac, 'Mac/Linux');
		mapper.addMapping(53, NewznabCategory.PC0day, 'Apps');
		mapper.addMapping(24, NewznabCategory.PCMobileOther, 'Mobile Apps');
		// Books & Audio
		mapper.addMapping(7, NewznabCategory.Books, 'Books and Magazines');
		mapper.addMapping(65, NewznabCategory.BooksComics, 'Books Comics');
		mapper.addMapping(4, NewznabCategory.Audio, 'Music');
		mapper.addMapping(116, NewznabCategory.Audio, 'Music Packs');
		// XXX (map to other)
		mapper.addMapping(10, NewznabCategory.Other, 'Movies Adult');

		return mapper;
	}

	/** Get cookie for authentication */
	protected getCookie(): string {
		return this.stSettings.cookie;
	}

	/**
	 * Build search requests for SceneTime
	 */
	protected buildSearchRequests(criteria: SearchCriteria): SearchRequest[] {
		let term = '';
		let imdbId = '';

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
				if (tvCriteria.imdbId) {
					imdbId = tvCriteria.imdbId;
				}
				break;
			}
			case 'movie': {
				const movieCriteria = criteria as MovieSearchCriteria;
				term = movieCriteria.query || '';
				if (movieCriteria.imdbId) {
					imdbId = movieCriteria.imdbId;
				}
				break;
			}
			case 'music': {
				const musicCriteria = criteria as MusicSearchCriteria;
				term = musicCriteria.query || '';
				if (musicCriteria.artist) {
					term = musicCriteria.artist + (term ? ` ${term}` : '');
				}
				break;
			}
			case 'book': {
				const bookCriteria = criteria as BookSearchCriteria;
				term = bookCriteria.query || '';
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

		// Build query params
		const params: Record<string, string> = {
			cata: 'yes'
		};

		// Map categories
		const categories = criteria.categories ?? [];
		const trackerCats = this.categoryMapper.mapNewznabToTracker(categories);
		if (trackerCats.length > 0) {
			for (const cat of trackerCats) {
				params[`c${cat}`] = '1';
			}
		} else {
			// Select all categories if none specified
			const allCats = this.categoryMapper.getAllTrackerCategories();
			for (const cat of allCats) {
				params[`c${cat}`] = '1';
			}
		}

		if (imdbId) {
			params.imdb = imdbId;
		}

		if (term) {
			params.search = term;
		}

		if (this.stSettings.freeleechOnly) {
			params.freeleech = 'on';
		}

		return [
			{
				url: `${this.baseUrl}browse.php?${buildQueryString(params)}`,
				method: 'GET',
				headers: {
					Accept: 'text/html',
					Cookie: this.getCookie()
				}
			}
		];
	}

	/**
	 * Parse SceneTime HTML response
	 */
	protected parseSearchResponse(html: string): ReleaseResult[] {
		const results: ReleaseResult[] = [];
		const $ = cheerio.load(html);

		const table = $('table.movehere');
		if (table.length === 0) {
			return results; // No results
		}

		// Get header columns to find indices
		const headerColumns: string[] = [];
		table.find('tbody > tr > td.cat_Head').each((_, el) => {
			headerColumns.push($(el).text().trim());
		});

		const categoryIndex = headerColumns.findIndex((x) => x === 'Type');
		const nameIndex = headerColumns.findIndex((x) => x === 'Name');
		const sizeIndex = headerColumns.findIndex((x) => x === 'Size');
		const seedersIndex = headerColumns.findIndex((x) => x === 'Seeders');
		const leechersIndex = headerColumns.findIndex((x) => x === 'Leechers');

		const rows = $('tr.browse');
		rows.each((_, row) => {
			try {
				const $row = $(row);
				const cells = $row.find('td');

				const descCol = cells.eq(nameIndex);
				const link = descCol.find('a').first();

				// Clean up title - remove green font elements
				link.find('font[color="green"]').remove();
				const title = link.text().trim();

				const infoUrl = this.baseUrl + (link.attr('href')?.replace(/^\//, '') ?? '');
				const torrentIdMatch = infoUrl.match(/[?&]id=(\d+)/);
				const torrentId = torrentIdMatch ? torrentIdMatch[1] : '';

				const seeders = parseInt(cells.eq(seedersIndex).text().trim(), 10) || 0;
				const leechers = parseInt(cells.eq(leechersIndex).text().trim(), 10) || 0;

				// Get category
				const categoryLink = cells.eq(categoryIndex).find('a').attr('href') ?? '';
				const catMatch = categoryLink.match(/[?&]cat=(\d+)/);
				const catId = catMatch ? catMatch[1] : '82';
				const categories = this.categoryMapper.mapTrackerToNewznab(catId);

				// Parse size
				const sizeText = cells.eq(sizeIndex).text().trim();
				const size = this.parseSize(sizeText);

				// Parse date
				const dateSpan = descCol.find('span.elapsedDate');
				const dateTitle = dateSpan.attr('title')?.trim() ?? '';
				const publishDate = this.parseDate(dateTitle) ?? this.parseTimeAgo(dateSpan.text().trim());

				const release: ReleaseResult = {
					guid: infoUrl,
					title,
					commentsUrl: infoUrl,
					downloadUrl: `${this.baseUrl}download.php/${torrentId}/download.torrent`,
					categories: categories,
					publishDate,
					size,
					seeders,
					leechers,
					protocol: 'torrent',
					indexerId: this.id,
					indexerName: this.name
				};

				results.push(release);
			} catch (error) {
				this.log.debug('Failed to parse row', { error });
			}
		});

		return results;
	}

	/** Parse size string to bytes */
	private parseSize(sizeStr: string): number {
		if (!sizeStr) return 0;
		const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|TB|B)/i);
		if (!match) return 0;
		const value = parseFloat(match[1]);
		const unit = match[2].toUpperCase();
		switch (unit) {
			case 'TB':
				return value * 1024 * 1024 * 1024 * 1024;
			case 'GB':
				return value * 1024 * 1024 * 1024;
			case 'MB':
				return value * 1024 * 1024;
			case 'KB':
				return value * 1024;
			default:
				return value;
		}
	}

	/** Parse date string */
	private parseDate(dateStr: string): Date | null {
		if (!dateStr) return null;
		// Format: "Friday, December 1, 2023 at 5:30pm"
		const match = dateStr.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d+)\s+at\s+(\d+):(\d+)(am|pm)/i);
		if (!match) return null;
		try {
			const [, , month, day, year, hour, minute, ampm] = match;
			const months: Record<string, number> = {
				january: 0,
				february: 1,
				march: 2,
				april: 3,
				may: 4,
				june: 5,
				july: 6,
				august: 7,
				september: 8,
				october: 9,
				november: 10,
				december: 11
			};
			let h = parseInt(hour, 10);
			if (ampm.toLowerCase() === 'pm' && h !== 12) h += 12;
			if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
			return new Date(
				parseInt(year, 10),
				months[month.toLowerCase()],
				parseInt(day, 10),
				h,
				parseInt(minute, 10)
			);
		} catch {
			return null;
		}
	}

	/** Parse "time ago" string */
	private parseTimeAgo(timeAgo: string): Date {
		const now = new Date();
		const match = timeAgo.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i);
		if (!match) return now;
		const value = parseInt(match[1], 10);
		const unit = match[2].toLowerCase();
		switch (unit) {
			case 'second':
				return new Date(now.getTime() - value * 1000);
			case 'minute':
				return new Date(now.getTime() - value * 60 * 1000);
			case 'hour':
				return new Date(now.getTime() - value * 60 * 60 * 1000);
			case 'day':
				return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
			case 'week':
				return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
			case 'month':
				return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
			case 'year':
				return new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000);
			default:
				return now;
		}
	}
}

/**
 * Factory function for creating SceneTime indexer instances
 */
export function createSceneTimeIndexer(config: NativeIndexerConfig): SceneTimeIndexer {
	return new SceneTimeIndexer(config);
}
