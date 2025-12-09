/**
 * TorrentDay Indexer
 *
 * Private torrent tracker for TV / MOVIES / GENERAL.
 * Uses cookie authentication and JSON API for search.
 * Ported from Prowlarr's TorrentDay.cs
 *
 * @see https://torrentday.com/
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
	MusicSearchCriteria,
	BookSearchCriteria,
	BasicSearchCriteria
} from '../../core/searchCriteria';
import type { ReleaseResult } from '../../core/releaseResult';

/** TorrentDay API response item */
interface TorrentDayItem {
	t: number; // Torrent ID
	name: string; // Title
	c: string; // Category ID
	size: number; // Size in bytes
	files: number; // Number of files
	seeders: number; // Seeder count
	leechers: number; // Leecher count
	completed: number; // Completed/grabs count
	ctime: number; // Unix timestamp
	'imdb-id'?: string; // IMDB ID if available
	'download-multiplier'?: number; // Download multiplier (0 = freeleech)
}

type TorrentDayResponse = TorrentDayItem[];

/** TorrentDay-specific settings */
export interface TorrentDaySettings {
	/** Cookie string for authentication */
	cookie: string;
	/** Search freeleech only */
	freeLeechOnly?: boolean;
}

/**
 * TorrentDay private tracker.
 * Uses cookie authentication and JSON API.
 */
export class TorrentDayIndexer extends PrivateIndexerBase {
	protected readonly authMethod: AuthMethod = 'cookie';

	protected readonly metadata: IndexerMetadata = {
		id: 'torrentday',
		name: 'TorrentDay',
		description: 'TorrentDay (TD) is a Private site for TV / MOVIES / GENERAL',
		urls: [
			'https://tday.love/',
			'https://torrentday.cool/',
			'https://secure.torrentday.com/',
			'https://classic.torrentday.com/',
			'https://www.torrentday.com/',
			'https://www.torrentday.me/',
			'https://torrentday.it/',
			'https://td.findnemo.net/',
			'https://td.getcrazy.me/',
			'https://td.venom.global/',
			'https://td.workisboring.net/',
			'https://tday.findnemo.net/',
			'https://tday.getcrazy.me/',
			'https://tday.venom.global/',
			'https://tday.workisboring.net/'
		],
		language: 'en-US',
		privacy: 'private',
		requestDelay: 2
	};

	private readonly categoryMapper: CategoryMapper;

	/** TorrentDay-specific settings */
	private get tdSettings(): TorrentDaySettings {
		return this.config.settings as unknown as TorrentDaySettings;
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
		map.set(NewznabCategory.MoviesUHD, 'Movie/4K');
		map.set(NewznabCategory.MoviesSD, 'Movies/SD');
		map.set(NewznabCategory.MoviesBluRay, 'Movies/Bluray');
		map.set(NewznabCategory.MoviesDVD, 'Movies/DVD-R');
		map.set(NewznabCategory.MoviesForeign, 'Movies/Non-English');
		map.set(NewznabCategory.Movies, 'Movies/Packs');
		// TV
		map.set(NewznabCategory.TVSD, 'TV/SD');
		map.set(NewznabCategory.TVHD, 'TV/HD');
		map.set(NewznabCategory.TVUHD, 'TV/x265');
		map.set(NewznabCategory.TVForeign, 'TV/Non-English');
		map.set(NewznabCategory.TV, 'TV/Packs');
		map.set(NewznabCategory.TVAnime, 'Anime');
		map.set(NewznabCategory.TVDocumentary, 'Documentary');
		// Other
		map.set(NewznabCategory.PCGames, 'PC/Games');
		map.set(NewznabCategory.Audio, 'Music');
		map.set(NewznabCategory.PC, 'Software');
		map.set(NewznabCategory.Books, 'Books');
		map.set(NewznabCategory.XXX, 'XXX');
		return map;
	}

	/** Build category mapper */
	private buildCategoryMapper(): CategoryMapper {
		const mapper = new CategoryMapper();

		// Movies
		mapper.addMapping('96', NewznabCategory.MoviesUHD, 'Movie/4K');
		mapper.addMapping('25', NewznabCategory.MoviesSD, 'Movies/480p');
		mapper.addMapping('11', NewznabCategory.MoviesBluRay, 'Movies/Bluray');
		mapper.addMapping('5', NewznabCategory.MoviesBluRay, 'Movies/Bluray-Full');
		mapper.addMapping('3', NewznabCategory.MoviesDVD, 'Movies/DVD-R');
		mapper.addMapping('21', NewznabCategory.MoviesSD, 'Movies/MP4');
		mapper.addMapping('22', NewznabCategory.MoviesForeign, 'Movies/Non-English');
		mapper.addMapping('13', NewznabCategory.Movies, 'Movies/Packs');
		mapper.addMapping('44', NewznabCategory.MoviesSD, 'Movies/SD/x264');
		mapper.addMapping('48', NewznabCategory.Movies, 'Movies/x265');
		mapper.addMapping('1', NewznabCategory.MoviesSD, 'Movies/XviD');

		// TV
		mapper.addMapping('24', NewznabCategory.TVSD, 'TV/480p');
		mapper.addMapping('32', NewznabCategory.TVHD, 'TV/Bluray');
		mapper.addMapping('31', NewznabCategory.TVSD, 'TV/DVD-R');
		mapper.addMapping('33', NewznabCategory.TVSD, 'TV/DVD-Rip');
		mapper.addMapping('46', NewznabCategory.TVSD, 'TV/Mobile');
		mapper.addMapping('82', NewznabCategory.TVForeign, 'TV/Non-English');
		mapper.addMapping('14', NewznabCategory.TV, 'TV/Packs');
		mapper.addMapping('26', NewznabCategory.TVSD, 'TV/SD/x264');
		mapper.addMapping('7', NewznabCategory.TVHD, 'TV/x264');
		mapper.addMapping('34', NewznabCategory.TVUHD, 'TV/x265');
		mapper.addMapping('2', NewznabCategory.TVSD, 'TV/XviD');

		// Games
		mapper.addMapping('4', NewznabCategory.PCGames, 'PC/Games');
		mapper.addMapping('18', NewznabCategory.ConsolePS3, 'PS');
		mapper.addMapping('8', NewznabCategory.ConsolePSP, 'PSP');
		mapper.addMapping('10', NewznabCategory.ConsoleNDS, 'Nintendo');
		mapper.addMapping('9', NewznabCategory.ConsoleXBox, 'Xbox');

		// Music
		mapper.addMapping('17', NewznabCategory.AudioMP3, 'Music/Audio');
		mapper.addMapping('27', NewznabCategory.Audio, 'Music/Flac');
		mapper.addMapping('23', NewznabCategory.AudioForeign, 'Music/Non-English');
		mapper.addMapping('41', NewznabCategory.Audio, 'Music/Packs');
		mapper.addMapping('16', NewznabCategory.AudioVideo, 'Music/Video');

		// Other
		mapper.addMapping('29', NewznabCategory.TVAnime, 'Anime');
		mapper.addMapping('42', NewznabCategory.AudioAudiobook, 'Audio Books');
		mapper.addMapping('20', NewznabCategory.Books, 'Books');
		mapper.addMapping('102', NewznabCategory.BooksForeign, 'Books/Non-English');
		mapper.addMapping('30', NewznabCategory.TVDocumentary, 'Documentary');
		mapper.addMapping('95', NewznabCategory.TVDocumentary, 'Educational');
		mapper.addMapping('47', NewznabCategory.Other, 'Fonts');
		mapper.addMapping('43', NewznabCategory.PCMac, 'Mac');
		mapper.addMapping('45', NewznabCategory.AudioOther, 'Podcast');
		mapper.addMapping('28', NewznabCategory.PC, 'Software/Packs');
		mapper.addMapping('12', NewznabCategory.PC, 'Software');

		// XXX
		mapper.addMapping('19', NewznabCategory.XXX, 'XXX/0Day');
		mapper.addMapping('6', NewznabCategory.XXX, 'XXX/Movies');
		mapper.addMapping('15', NewznabCategory.XXXPack, 'XXX/Packs');

		return mapper;
	}

	/**
	 * Build search requests for the given criteria.
	 */
	protected buildSearchRequests(criteria: SearchCriteria): SearchRequest[] {
		let searchUrl = `${this.baseUrl}t.json`;

		// Build category string
		const categories = criteria.categories ?? [];
		let trackerCats = this.categoryMapper.mapNewznabToTracker(categories);
		if (trackerCats.length === 0) {
			trackerCats = this.categoryMapper.getAllTrackerCategories();
		}

		const catStr = trackerCats.join(';');
		searchUrl += `?${catStr}`;

		// Add freeleech filter
		if (this.tdSettings.freeLeechOnly) {
			searchUrl += ';free';
		}

		// Get search term and IMDB ID
		const { term, imdbId } = this.getSearchTermAndImdb(criteria);

		// Add search query
		searchUrl += ';q=';

		if (imdbId) {
			searchUrl += encodeURIComponent(imdbId + ' ');
		}

		if (term) {
			searchUrl += encodeURIComponent(term);
		}

		return [
			{
				url: searchUrl,
				headers: { Accept: 'application/json' }
			}
		];
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
	 * Parse JSON API response into release results.
	 */
	protected parseSearchResponse(response: string): ReleaseResult[] {
		const releases: ReleaseResult[] = [];

		if (!response || response.trim() === '' || response.trim() === '[]') {
			return releases;
		}

		try {
			const data = JSON.parse(response) as TorrentDayResponse;

			for (const item of data) {
				try {
					const release = this.parseItem(item);
					if (release) {
						releases.push(release);
					}
				} catch (error) {
					this.log.debug('Failed to parse item', { id: item.t, error });
				}
			}
		} catch (error) {
			this.log.warn('Failed to parse JSON response', { error });
		}

		return releases;
	}

	/** Parse a single item from the API response */
	private parseItem(item: TorrentDayItem): ReleaseResult | null {
		const torrentId = item.t;
		const title = item.name;

		if (!title || !torrentId) {
			return null;
		}

		const detailsUrl = `${this.baseUrl}details.php?id=${torrentId}`;
		const downloadUrl = `${this.baseUrl}download.php/${torrentId}/${torrentId}.torrent`;

		// Parse publish date from Unix timestamp
		const publishDate = new Date(item.ctime * 1000);

		// Map category
		const categories = this.categoryMapper.mapTrackerToNewznab(item.c);

		// Parse IMDB ID if present
		let imdbId: string | undefined;
		if (item['imdb-id']) {
			const match = item['imdb-id'].match(/tt\d+/);
			if (match) {
				imdbId = match[0];
			}
		}

		return {
			guid: detailsUrl,
			title,
			downloadUrl,
			commentsUrl: detailsUrl,
			publishDate,
			size: item.size,
			indexerId: this.id,
			indexerName: this.name,
			protocol: 'torrent',
			categories,
			seeders: item.seeders,
			leechers: item.leechers,
			grabs: item.completed,
			imdbId
		};
	}

	/** Override to check for redirect to login */
	protected override checkLoginNeeded(response: string): boolean {
		// TorrentDay redirects to login page when session expires
		return response.includes('/login.php') || response.includes('login');
	}

	/** Override to handle JSON response validation */
	protected override validateTestResponse(response: string): boolean {
		// Check for login redirect
		if (this.checkLoginNeeded(response)) {
			throw new Error('Session expired - please update cookie');
		}

		// Should be valid JSON array
		try {
			const data = JSON.parse(response);
			return Array.isArray(data);
		} catch {
			return false;
		}
	}

	/** Get test URL - use API endpoint */
	protected override getTestUrl(): string {
		const cats = this.categoryMapper.getAllTrackerCategories().slice(0, 5).join(';');
		return `${this.baseUrl}t.json?${cats};q=test`;
	}
}

/** Factory function to create TorrentDay indexer */
export function createTorrentDayIndexer(config: NativeIndexerConfig): TorrentDayIndexer {
	return new TorrentDayIndexer(config);
}

/** TorrentDay definition ID for registration */
export const TORRENTDAY_DEFINITION_ID = 'torrentday';
