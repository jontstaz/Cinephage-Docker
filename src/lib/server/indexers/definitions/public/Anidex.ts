/**
 * Anidex Indexer
 *
 * Public torrent tracker and indexer, primarily for English fansub groups of anime.
 * Ported from Prowlarr's Anidex.cs
 *
 * @see https://anidex.info/
 */

import * as cheerio from 'cheerio';
import { PublicIndexerBase } from '../base/PublicIndexerBase';
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

/** Anidex language codes */
export const AnidexLanguage = {
	English: 1,
	Japanese: 2,
	Polish: 3,
	SerboCroatian: 4,
	Dutch: 5,
	Italian: 6,
	Russian: 7,
	German: 8,
	Hungarian: 9,
	French: 10,
	Finnish: 11,
	Vietnamese: 12,
	Greek: 13,
	Bulgarian: 14,
	SpanishSpain: 15,
	PortugueseBrazil: 16,
	PortuguesePortugal: 17,
	Swedish: 18,
	Arabic: 19,
	Danish: 20,
	ChineseSimplified: 21,
	Bengali: 22,
	Romanian: 23,
	Czech: 24,
	Mongolian: 25,
	Turkish: 26,
	Indonesian: 27,
	Korean: 28,
	SpanishLatam: 29,
	Persian: 30,
	Malaysian: 31
} as const;

export type AnidexLanguageCode = (typeof AnidexLanguage)[keyof typeof AnidexLanguage];

/** Anidex-specific settings */
export interface AnidexSettings {
	/** Search authorized torrents only */
	authorizedOnly?: boolean;
	/** Filter by specific languages (empty = all) */
	languagesOnly?: AnidexLanguageCode[];
}

/**
 * Anidex public anime indexer.
 */
export class AnidexIndexer extends PublicIndexerBase {
	protected readonly metadata: IndexerMetadata = {
		id: 'anidex',
		name: 'Anidex',
		description:
			'Anidex is a Public torrent tracker and indexer, primarily for English fansub groups of anime',
		urls: ['https://anidex.info/'],
		language: 'en-US',
		privacy: 'public',
		requestDelay: 2
	};

	private readonly categoryMapper: CategoryMapper;

	/** Anidex-specific settings */
	private get anidexSettings(): AnidexSettings {
		return this.config.settings as AnidexSettings;
	}

	readonly capabilities: IndexerCapabilities = {
		search: { available: true, supportedParams: ['q'] },
		tvSearch: { available: true, supportedParams: ['q', 'season', 'ep'] },
		movieSearch: { available: true, supportedParams: ['q'] },
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
		map.set(NewznabCategory.TVAnime, 'Anime');
		map.set(NewznabCategory.BooksEBook, 'Light Novel');
		map.set(NewznabCategory.BooksComics, 'Manga');
		map.set(NewznabCategory.AudioMP3, 'Music Lossy');
		map.set(NewznabCategory.AudioLossless, 'Music Lossless');
		map.set(NewznabCategory.AudioVideo, 'Music Video');
		map.set(NewznabCategory.PCGames, 'Games');
		map.set(NewznabCategory.PC0day, 'Applications');
		map.set(NewznabCategory.XXXImageSet, 'Pictures');
		map.set(NewznabCategory.XXX, 'Adult Video');
		map.set(NewznabCategory.Other, 'Other');
		return map;
	}

	/** Build category mapper */
	private buildCategoryMapper(): CategoryMapper {
		const mapper = new CategoryMapper();

		// Anidex category IDs -> Newznab categories
		mapper.addMapping('1', NewznabCategory.TVAnime, 'Anime - Sub');
		mapper.addMapping('2', NewznabCategory.TVAnime, 'Anime - Raw');
		mapper.addMapping('3', NewznabCategory.TVAnime, 'Anime - Dub');
		mapper.addMapping('4', NewznabCategory.TVAnime, 'LA - Sub');
		mapper.addMapping('5', NewznabCategory.TVAnime, 'LA - Raw');
		mapper.addMapping('6', NewznabCategory.BooksEBook, 'Light Novel');
		mapper.addMapping('7', NewznabCategory.BooksComics, 'Manga - TLed');
		mapper.addMapping('8', NewznabCategory.BooksComics, 'Manga - Raw');
		mapper.addMapping('9', NewznabCategory.AudioMP3, '♫ - Lossy');
		mapper.addMapping('10', NewznabCategory.AudioLossless, '♫ - Lossless');
		mapper.addMapping('11', NewznabCategory.AudioVideo, '♫ - Video');
		mapper.addMapping('12', NewznabCategory.PCGames, 'Games');
		mapper.addMapping('13', NewznabCategory.PC0day, 'Applications');
		mapper.addMapping('14', NewznabCategory.XXXImageSet, 'Pictures');
		mapper.addMapping('15', NewznabCategory.XXX, 'Adult Video');
		mapper.addMapping('16', NewznabCategory.Other, 'Other');

		return mapper;
	}

	/**
	 * Build search requests for the given criteria.
	 */
	protected buildSearchRequests(criteria: SearchCriteria): SearchRequest[] {
		const term = this.getSearchTerm(criteria);
		const categories = criteria.categories ?? [];

		const params: Record<string, string | number | undefined> = {
			page: 'search',
			s: 'upload_timestamp',
			o: 'desc',
			group_id: '0', // All groups
			q: term
		};

		// Add authorized only filter
		if (this.anidexSettings.authorizedOnly) {
			params.a = '1';
		}

		let url = `${this.baseUrl}?${buildQueryString(params)}`;

		// Add category filter
		const trackerCats = this.categoryMapper.mapNewznabToTracker(categories);
		if (trackerCats.length > 0) {
			const allCats = this.categoryMapper.getAllTrackerCategories();
			// Only add filter if not selecting all categories
			if (trackerCats.length < allCats.length) {
				url += `&id=${trackerCats.join(',')}`;
			}
		}

		// Add language filter
		if (this.anidexSettings.languagesOnly && this.anidexSettings.languagesOnly.length > 0) {
			url += `&lang_id=${this.anidexSettings.languagesOnly.join(',')}`;
		}

		return [{ url }];
	}

	/** Get search term from criteria */
	private getSearchTerm(criteria: SearchCriteria): string {
		switch (criteria.searchType) {
			case 'tv': {
				const tvCriteria = criteria as TvSearchCriteria;
				let term = sanitizeSearchTerm(tvCriteria.query);
				if (tvCriteria.season) {
					term += ` S${String(tvCriteria.season).padStart(2, '0')}`;
				}
				if (tvCriteria.episode) {
					term += `E${String(tvCriteria.episode).padStart(2, '0')}`;
				}
				return term;
			}
			case 'movie':
				return sanitizeSearchTerm((criteria as MovieSearchCriteria).query);
			case 'music':
				return sanitizeSearchTerm((criteria as MusicSearchCriteria).query);
			case 'book':
				return sanitizeSearchTerm((criteria as BookSearchCriteria).query);
			default:
				return sanitizeSearchTerm((criteria as BasicSearchCriteria).query);
		}
	}

	/**
	 * Parse search response HTML into release results.
	 */
	protected parseSearchResponse(html: string): ReleaseResult[] {
		const releases: ReleaseResult[] = [];
		const $ = cheerio.load(html);

		const rows = $('div#content table > tbody > tr');

		rows.each((_, row) => {
			try {
				const $row = $(row);

				// Get download URL
				const dlHref = $row.find('a[href^="/dl/"]').attr('href');
				const downloadUrl = dlHref ? `${this.baseUrl}${dlHref}` : undefined;

				// Get info URL
				const infoHref = $row.find('td:nth-child(3) a').attr('href');
				const infoUrl = infoHref ? `${this.baseUrl}${infoHref}` : undefined;

				// Get title and language
				let title = $row.find('td:nth-child(3) span').attr('title')?.trim() ?? '';
				const language = $row.find('td:nth-child(1) img').attr('title')?.trim();
				if (language) {
					title += ` [${language}]`;
				}

				if (!title || !downloadUrl) {
					return; // Skip invalid rows
				}

				// Get category
				const categoryLink = $row.find('td:nth-child(1) a').attr('href') ?? '';
				const catMatch = categoryLink.match(/[?&]id=(\d+)/);
				const catId = catMatch ? catMatch[1] : '16';
				const categories = this.categoryMapper.mapTrackerToNewznab(catId);

				// Get seeders/leechers
				const seeders = parseInt($row.find('td:nth-child(9)').text().trim(), 10) || 0;
				const leechers = parseInt($row.find('td:nth-child(10)').text().trim(), 10) || 0;

				// Get size
				const sizeText = $row.find('td:nth-child(7)').text().trim();
				const size = this.parseSize(sizeText);

				// Get grabs
				const grabs = parseInt($row.find('td:nth-child(11)').text().trim(), 10) || 0;

				// Get publish date
				const dateStr = $row.find('td:nth-child(8)').attr('title')?.trim() ?? '';
				const publishDate = this.parseDate(dateStr);

				// Get magnet URL
				const magnetUrl = $row.find('a[href^="magnet:?"]').attr('href');

				const release: ReleaseResult = {
					guid: infoUrl ?? downloadUrl,
					title,
					downloadUrl,
					magnetUrl,
					commentsUrl: infoUrl,
					publishDate,
					size,
					indexerId: this.id,
					indexerName: this.name,
					protocol: 'torrent',
					categories,
					seeders,
					leechers,
					grabs
				};

				releases.push(release);
			} catch (error) {
				this.log.debug('Failed to parse row', { error });
			}
		});

		return releases;
	}

	/** Parse size string to bytes */
	private parseSize(sizeStr: string): number {
		if (!sizeStr) return 0;

		const match = sizeStr.match(/^([\d.]+)\s*(B|KB|KiB|MB|MiB|GB|GiB|TB|TiB)$/i);
		if (!match) return 0;

		const value = parseFloat(match[1]);
		const unit = match[2].toUpperCase();

		const multipliers: Record<string, number> = {
			B: 1,
			KB: 1000,
			KIB: 1024,
			MB: 1000 * 1000,
			MIB: 1024 * 1024,
			GB: 1000 * 1000 * 1000,
			GIB: 1024 * 1024 * 1024,
			TB: 1000 * 1000 * 1000 * 1000,
			TIB: 1024 * 1024 * 1024 * 1024
		};

		return Math.floor(value * (multipliers[unit] ?? 1));
	}

	/** Parse date string to Date */
	private parseDate(dateStr: string): Date {
		if (!dateStr) return new Date();

		// Expected format: "yyyy-MM-dd HH:mm:ss UTC"
		try {
			const date = new Date(dateStr.replace(' UTC', 'Z'));
			return isNaN(date.getTime()) ? new Date() : date;
		} catch {
			return new Date();
		}
	}

	/** Get test URL */
	protected override getTestUrl(): string {
		return this.baseUrl;
	}
}

/** Factory function to create Anidex indexer */
export function createAnidexIndexer(config: NativeIndexerConfig): AnidexIndexer {
	return new AnidexIndexer(config);
}

/** Anidex definition ID for registration */
export const ANIDEX_DEFINITION_ID = 'anidex';
