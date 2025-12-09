/**
 * IPTorrents Indexer
 *
 * Private torrent tracker for 0DAY / GENERAL content.
 * Uses cookie-based authentication.
 * Ported from Prowlarr's IPTorrents.cs
 *
 * @see https://iptorrents.com/
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
	MusicSearchCriteria,
	BookSearchCriteria,
	BasicSearchCriteria
} from '../../core/searchCriteria';
import type { ReleaseResult } from '../../core/releaseResult';

/** IPTorrents-specific settings */
export interface IPTorrentsSettings {
	/** Cookie string for authentication */
	cookie: string;
	/** User-Agent string (required) */
	userAgent?: string;
	/** Search freeleech only */
	freeLeechOnly?: boolean;
}

/**
 * IPTorrents private tracker.
 * Requires cookie authentication.
 */
export class IPTorrentsIndexer extends PrivateIndexerBase {
	protected readonly authMethod: AuthMethod = 'cookie';

	protected readonly metadata: IndexerMetadata = {
		id: 'iptorrents',
		name: 'IPTorrents',
		description: 'IPTorrents (IPT) is a Private Torrent Tracker for 0DAY / GENERAL.',
		urls: [
			'https://iptorrents.com/',
			'https://iptorrents.me/',
			'https://nemo.iptorrents.com/',
			'https://ipt.getcrazy.me/',
			'https://ipt.findnemo.net/',
			'https://ipt.beelyrics.net/',
			'https://ipt.venom.global/',
			'https://ipt.workisboring.net/',
			'https://ipt.lol/',
			'https://ipt.cool/',
			'https://ipt.world/',
			'https://ipt.octopus.town/'
		],
		language: 'en-US',
		privacy: 'private',
		supportsPagination: true,
		requestDelay: 2
	};

	private readonly categoryMapper: CategoryMapper;

	/** IPTorrents-specific settings */
	private get iptSettings(): IPTorrentsSettings {
		return this.config.settings as unknown as IPTorrentsSettings;
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
		// Movies
		map.set(NewznabCategory.Movies, 'Movies');
		map.set(NewznabCategory.Movies3D, 'Movie/3D');
		map.set(NewznabCategory.MoviesSD, 'Movie/SD');
		map.set(NewznabCategory.MoviesUHD, 'Movie/4K');
		map.set(NewznabCategory.MoviesHD, 'Movie/HD');
		map.set(NewznabCategory.MoviesBluRay, 'Movie/Bluray');
		map.set(NewznabCategory.MoviesDVD, 'Movie/DVD-R');
		map.set(NewznabCategory.MoviesForeign, 'Movie/Non-English');
		map.set(NewznabCategory.MoviesWEBDL, 'Movie/Web-DL');
		// TV
		map.set(NewznabCategory.TV, 'TV');
		map.set(NewznabCategory.TVDocumentary, 'TV/Documentaries');
		map.set(NewznabCategory.TVSport, 'Sports');
		map.set(NewznabCategory.TVSD, 'TV/SD');
		map.set(NewznabCategory.TVHD, 'TV/HD');
		map.set(NewznabCategory.TVForeign, 'TV/Non-English');
		map.set(NewznabCategory.TVWEBDL, 'TV/Web-DL');
		map.set(NewznabCategory.TVAnime, 'Anime');
		// Other
		map.set(NewznabCategory.Console, 'Games');
		map.set(NewznabCategory.Audio, 'Music');
		map.set(NewznabCategory.AudioLossless, 'Music/Flac');
		map.set(NewznabCategory.PC0day, 'Appz');
		map.set(NewznabCategory.Books, 'Books');
		map.set(NewznabCategory.AudioAudiobook, 'AudioBook');
		map.set(NewznabCategory.XXX, 'XXX');
		return map;
	}

	/** Build category mapper */
	private buildCategoryMapper(): CategoryMapper {
		const mapper = new CategoryMapper();

		// Movies
		mapper.addMapping('72', NewznabCategory.Movies, 'Movies');
		mapper.addMapping('87', NewznabCategory.Movies3D, 'Movie/3D');
		mapper.addMapping('77', NewznabCategory.MoviesSD, 'Movie/480p');
		mapper.addMapping('101', NewznabCategory.MoviesUHD, 'Movie/4K');
		mapper.addMapping('89', NewznabCategory.MoviesHD, 'Movie/BD-R');
		mapper.addMapping('90', NewznabCategory.MoviesSD, 'Movie/BD-Rip');
		mapper.addMapping('96', NewznabCategory.MoviesSD, 'Movie/Cam');
		mapper.addMapping('6', NewznabCategory.MoviesDVD, 'Movie/DVD-R');
		mapper.addMapping('48', NewznabCategory.MoviesBluRay, 'Movie/HD/Bluray');
		mapper.addMapping('54', NewznabCategory.Movies, 'Movie/Kids');
		mapper.addMapping('62', NewznabCategory.MoviesSD, 'Movie/MP4');
		mapper.addMapping('38', NewznabCategory.MoviesForeign, 'Movie/Non-English');
		mapper.addMapping('68', NewznabCategory.Movies, 'Movie/Packs');
		mapper.addMapping('20', NewznabCategory.MoviesWEBDL, 'Movie/Web-DL');
		mapper.addMapping('7', NewznabCategory.MoviesSD, 'Movie/Xvid');
		mapper.addMapping('100', NewznabCategory.Movies, 'Movie/x265');

		// TV
		mapper.addMapping('73', NewznabCategory.TV, 'TV');
		mapper.addMapping('26', NewznabCategory.TVDocumentary, 'TV/Documentaries');
		mapper.addMapping('55', NewznabCategory.TVSport, 'Sports');
		mapper.addMapping('78', NewznabCategory.TVSD, 'TV/480p');
		mapper.addMapping('23', NewznabCategory.TVHD, 'TV/BD');
		mapper.addMapping('24', NewznabCategory.TVSD, 'TV/DVD-R');
		mapper.addMapping('25', NewznabCategory.TVSD, 'TV/DVD-Rip');
		mapper.addMapping('66', NewznabCategory.TVSD, 'TV/Mobile');
		mapper.addMapping('82', NewznabCategory.TVForeign, 'TV/Non-English');
		mapper.addMapping('65', NewznabCategory.TV, 'TV/Packs');
		mapper.addMapping('83', NewznabCategory.TVForeign, 'TV/Packs/Non-English');
		mapper.addMapping('79', NewznabCategory.TVSD, 'TV/SD/x264');
		mapper.addMapping('22', NewznabCategory.TVWEBDL, 'TV/Web-DL');
		mapper.addMapping('5', NewznabCategory.TVHD, 'TV/x264');
		mapper.addMapping('99', NewznabCategory.TVHD, 'TV/x265');
		mapper.addMapping('4', NewznabCategory.TVSD, 'TV/Xvid');

		// Games
		mapper.addMapping('74', NewznabCategory.Console, 'Games');
		mapper.addMapping('2', NewznabCategory.ConsoleOther, 'Games/Mixed');
		mapper.addMapping('47', NewznabCategory.ConsoleNDS, 'Games/Nintendo DS');
		mapper.addMapping('43', NewznabCategory.PCISO, 'Games/PC-ISO');
		mapper.addMapping('45', NewznabCategory.PCGames, 'Games/PC-Rip');
		mapper.addMapping('71', NewznabCategory.ConsolePS3, 'Games/PS3');
		mapper.addMapping('50', NewznabCategory.ConsoleWii, 'Games/Wii');
		mapper.addMapping('44', NewznabCategory.ConsoleXBox360, 'Games/Xbox-360');

		// Music
		mapper.addMapping('75', NewznabCategory.Audio, 'Music');
		mapper.addMapping('3', NewznabCategory.AudioMP3, 'Music/Audio');
		mapper.addMapping('80', NewznabCategory.AudioLossless, 'Music/Flac');
		mapper.addMapping('93', NewznabCategory.Audio, 'Music/Packs');
		mapper.addMapping('37', NewznabCategory.AudioVideo, 'Music/Video');
		mapper.addMapping('21', NewznabCategory.AudioVideo, 'Podcast');

		// Other
		mapper.addMapping('76', NewznabCategory.Other, 'Other/Miscellaneous');
		mapper.addMapping('60', NewznabCategory.TVAnime, 'Anime');
		mapper.addMapping('1', NewznabCategory.PC0day, 'Appz');
		mapper.addMapping('86', NewznabCategory.PC0day, 'Appz/Non-English');
		mapper.addMapping('64', NewznabCategory.AudioAudiobook, 'AudioBook');
		mapper.addMapping('35', NewznabCategory.Books, 'Books');
		mapper.addMapping('102', NewznabCategory.Books, 'Books/Non-English');
		mapper.addMapping('94', NewznabCategory.BooksComics, 'Books/Comics');
		mapper.addMapping('95', NewznabCategory.BooksOther, 'Books/Educational');
		mapper.addMapping('98', NewznabCategory.Other, 'Other/Fonts');
		mapper.addMapping('69', NewznabCategory.PCMac, 'Appz/Mac');
		mapper.addMapping('92', NewznabCategory.BooksMags, 'Books/Magazines & Newspapers');
		mapper.addMapping('58', NewznabCategory.PCMobileOther, 'Appz/Mobile');
		mapper.addMapping('36', NewznabCategory.Other, 'Other/Pics/Wallpapers');

		// XXX
		mapper.addMapping('88', NewznabCategory.XXX, 'XXX');
		mapper.addMapping('85', NewznabCategory.XXXOther, 'XXX/Magazines');
		mapper.addMapping('8', NewznabCategory.XXX, 'XXX/Movie');
		mapper.addMapping('81', NewznabCategory.XXX, 'XXX/Movie/0Day');
		mapper.addMapping('91', NewznabCategory.XXXPack, 'XXX/Packs');
		mapper.addMapping('84', NewznabCategory.XXXImageSet, 'XXX/Pics/Wallpapers');

		return mapper;
	}

	/**
	 * Build search requests for the given criteria.
	 */
	protected buildSearchRequests(criteria: SearchCriteria): SearchRequest[] {
		let searchUrl = `${this.baseUrl}t`;
		const params = new URLSearchParams();

		// Add category parameters
		const categories = criteria.categories ?? [];
		const trackerCats = this.categoryMapper.mapNewznabToTracker(categories);
		for (const cat of trackerCats) {
			params.append(cat, '');
		}

		// Add freeleech filter
		if (this.iptSettings.freeLeechOnly) {
			params.append('free', 'on');
		}

		// Get search term and IMDB ID
		const { term, imdbId } = this.getSearchTermAndImdb(criteria);

		// IPT uses sphinx which supports boolean operators
		if (imdbId) {
			params.append('q', `+(${imdbId})`);
			params.append('qf', 'all'); // Search in description
		}

		if (term) {
			params.append('q', `+(${term})`);
		}

		// Build URL
		const queryString = params.toString();
		if (queryString) {
			searchUrl += `?${queryString}`;
		}

		const headers: Record<string, string> = {
			Accept: 'text/html'
		};

		// Add custom User-Agent if specified
		if (this.iptSettings.userAgent) {
			headers['User-Agent'] = this.iptSettings.userAgent;
		}

		return [{ url: searchUrl, headers }];
	}

	/** Get search term and IMDB ID from criteria */
	private getSearchTermAndImdb(criteria: SearchCriteria): { term: string; imdbId?: string } {
		let term = '';
		let imdbId: string | undefined;

		switch (criteria.searchType) {
			case 'tv': {
				const tvCriteria = criteria as TvSearchCriteria;
				term = sanitizeSearchTerm(tvCriteria.query);

				if (tvCriteria.season) {
					term += ` S${String(tvCriteria.season).padStart(2, '0')}`;
					if (tvCriteria.episode) {
						term += `E${String(tvCriteria.episode).padStart(2, '0')}`;
					} else {
						term += '*'; // Wildcard for all episodes
					}
				}

				imdbId = tvCriteria.imdbId;
				break;
			}
			case 'movie': {
				const movieCriteria = criteria as MovieSearchCriteria;
				term = sanitizeSearchTerm(movieCriteria.query);
				imdbId = movieCriteria.imdbId;
				break;
			}
			case 'music':
				term = sanitizeSearchTerm((criteria as MusicSearchCriteria).query);
				break;
			case 'book':
				term = sanitizeSearchTerm((criteria as BookSearchCriteria).query);
				break;
			default:
				term = sanitizeSearchTerm((criteria as BasicSearchCriteria).query);
				break;
		}

		return { term, imdbId };
	}

	/**
	 * Parse search response HTML into release results.
	 */
	protected parseSearchResponse(html: string): ReleaseResult[] {
		const releases: ReleaseResult[] = [];
		const $ = cheerio.load(html);

		// Get header columns to find dynamic column indices
		const headerColumns = $('table[id="torrents"] > thead > tr > th')
			.map((_, el) => $(el).text().trim())
			.get();

		const sizeIndex = this.findColumnIndex(headerColumns, 'Sort by size', 5);
		const grabsIndex = this.findColumnIndex(headerColumns, 'Sort by snatches', 6);
		const seedersIndex = this.findColumnIndex(headerColumns, 'Sort by seeders', 7);
		const leechersIndex = this.findColumnIndex(headerColumns, 'Sort by leechers', 8);

		const rows = $('table[id="torrents"] > tbody > tr');

		rows.each((_, row) => {
			try {
				const $row = $(row);
				const $titleLink = $row.find('a.hv');

				// Skip if no title link (no results)
				if ($titleLink.length === 0) {
					return;
				}

				// Get title
				let title = $titleLink.text().trim();
				title = this.cleanTitle(title);

				// Get URLs
				const detailsHref = $titleLink.attr('href') ?? '';
				const detailsUrl = `${this.baseUrl}${detailsHref.replace(/^\//, '')}`;

				const $downloadLink = $row.find('a[href^="/download.php/"]');
				const downloadHref = $downloadLink.attr('href') ?? '';
				const downloadUrl = `${this.baseUrl}${downloadHref.replace(/^\//, '')}`;

				if (!title || !downloadUrl) {
					return;
				}

				// Get category from icon
				const $catIcon = $row.find('td:nth-of-type(1) a[href^="?"]');
				const catHref = $catIcon.attr('href') ?? '';
				const catId = catHref.replace('?', '');
				const categories = this.categoryMapper.mapTrackerToNewznab(catId);

				// Get description and date
				const descText = $row.find('div.sub').text();
				const descParts = descText.split('|');
				const datePart = descParts[descParts.length - 1] ?? '';
				const dateMatch = datePart.split(' by ')[0]?.trim() ?? '';
				const publishDate = this.parseTimeAgo(dateMatch);

				// Get size
				const $cells = $row.children('td');
				const sizeText = $cells.eq(sizeIndex).text().trim();
				const size = this.parseSize(sizeText);

				// Get stats
				const grabs = parseInt($cells.eq(grabsIndex).text().trim(), 10) || 0;
				const seeders = parseInt($cells.eq(seedersIndex).text().trim(), 10) || 0;
				const leechers = parseInt($cells.eq(leechersIndex).text().trim(), 10) || 0;

				const release: ReleaseResult = {
					guid: detailsUrl,
					title,
					downloadUrl,
					commentsUrl: detailsUrl,
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

	/** Find column index by header text */
	private findColumnIndex(headers: string[], text: string, defaultIndex: number): number {
		const index = headers.findIndex((h) => h === text);
		return index >= 0 ? index : defaultIndex;
	}

	/** Clean title of invalid characters and request tags */
	private cleanTitle(title: string): string {
		// Remove invalid characters
		// eslint-disable-next-line no-control-regex
		title = title.replace(/[\u0000-\u0008\u000A-\u001F\u0100-\uFFFF]/g, '');
		// Remove request tags
		title = title.replace(/[([{]REQ(UEST(ED)?)?[)\]}]/gi, '');
		// Clean up whitespace
		return title.trim().replace(/^[-:\s]+|[-:\s]+$/g, '');
	}

	/** Parse "time ago" string to Date */
	private parseTimeAgo(timeAgo: string): Date {
		const now = new Date();
		const lower = timeAgo.toLowerCase();

		const match = lower.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/);
		if (!match) {
			return now;
		}

		const value = parseInt(match[1], 10);
		const unit = match[2];

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

	/** Override to check for login prompt */
	protected override checkLoginNeeded(html: string): boolean {
		// IPT check: must contain logout link
		return !html.includes('lout.php');
	}
}

/** Factory function to create IPTorrents indexer */
export function createIPTorrentsIndexer(config: NativeIndexerConfig): IPTorrentsIndexer {
	return new IPTorrentsIndexer(config);
}

/** IPTorrents definition ID for registration */
export const IPTORRENTS_DEFINITION_ID = 'iptorrents';
