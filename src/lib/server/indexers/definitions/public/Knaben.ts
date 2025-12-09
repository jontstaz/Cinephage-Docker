/**
 * Knaben Indexer
 *
 * Public torrent meta-search engine with comprehensive category support.
 * Uses JSON POST API for searching.
 * Ported from Prowlarr's Knaben.cs
 *
 * @see https://knaben.org/
 */

import { PublicIndexerBase } from '../base/PublicIndexerBase';
import {
	type NativeIndexerConfig,
	type IndexerMetadata,
	type SearchRequest,
	sanitizeSearchTerm
} from '../base/IndexerBase';
import { NewznabCategory, CategoryMapper } from '../base/Categories';
import { Category } from '../../core/types';
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

/** Knaben API response types */
interface KnabenRelease {
	title: string;
	categoryId: number[];
	hash: string; // Info hash
	details: string; // Info URL
	link: string; // Download URL
	magnetUrl: string;
	bytes: number; // Size
	seeders: number;
	peers: number; // Actually leechers
	date: string;
}

interface KnabenResponse {
	hits: KnabenRelease[];
}

/** Definition ID for registry */
export const KNABEN_DEFINITION_ID = 'knaben';

/**
 * Knaben Indexer Implementation
 */
export class KnabenIndexer extends PublicIndexerBase {
	protected readonly metadata: IndexerMetadata = {
		id: KNABEN_DEFINITION_ID,
		name: 'Knaben',
		description: 'Knaben is a Public torrent meta-search engine',
		urls: ['https://knaben.org/'],
		legacyUrls: ['https://knaben.eu/'],
		language: 'en-US',
		privacy: 'public',
		supportsPagination: false,
		requestDelay: 1
	};

	private readonly API_ENDPOINT = 'https://api.knaben.org/v1';
	private readonly categoryMapper: CategoryMapper;

	readonly capabilities: IndexerCapabilities = {
		search: { available: true, supportedParams: ['q'] },
		tvSearch: { available: true, supportedParams: ['q', 'season', 'ep'] },
		movieSearch: { available: true, supportedParams: ['q'] },
		musicSearch: { available: true, supportedParams: ['q'] },
		bookSearch: { available: true, supportedParams: ['q'] },
		categories: this.buildCategoryMap(),
		supportsPagination: false,
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
		// Audio
		map.set(NewznabCategory.Audio, 'Audio');
		map.set(NewznabCategory.AudioMP3, 'MP3');
		map.set(NewznabCategory.AudioLossless, 'Lossless');
		map.set(NewznabCategory.AudioAudiobook, 'Audiobook');
		map.set(NewznabCategory.AudioVideo, 'Audio Video');
		map.set(NewznabCategory.AudioOther, 'Audio Other');
		// TV
		map.set(NewznabCategory.TV, 'TV');
		map.set(NewznabCategory.TVHD, 'TV HD');
		map.set(NewznabCategory.TVSD, 'TV SD');
		map.set(NewznabCategory.TVUHD, 'TV UHD');
		map.set(NewznabCategory.TVDocumentary, 'Documentary');
		map.set(NewznabCategory.TVForeign, 'TV Foreign');
		map.set(NewznabCategory.TVSport, 'Sport');
		map.set(NewznabCategory.TVAnime, 'Anime');
		map.set(NewznabCategory.TVOther, 'TV Other');
		// Movies
		map.set(NewznabCategory.Movies, 'Movies');
		map.set(NewznabCategory.MoviesHD, 'Movies HD');
		map.set(NewznabCategory.MoviesSD, 'Movies SD');
		map.set(NewznabCategory.MoviesUHD, 'Movies UHD');
		map.set(NewznabCategory.MoviesDVD, 'Movies DVD');
		map.set(NewznabCategory.MoviesForeign, 'Movies Foreign');
		map.set(NewznabCategory.Movies3D, 'Movies 3D');
		map.set(NewznabCategory.MoviesOther, 'Movies Other');
		// PC
		map.set(NewznabCategory.PC, 'PC');
		map.set(NewznabCategory.PCGames, 'Games');
		map.set(NewznabCategory.PC0day, 'Software');
		map.set(NewznabCategory.PCMac, 'Mac');
		map.set(NewznabCategory.PCISO, 'Unix');
		// Console
		map.set(NewznabCategory.Console, 'Console');
		map.set(NewznabCategory.ConsolePS4, 'PS4');
		map.set(NewznabCategory.ConsolePS3, 'PS3');
		map.set(NewznabCategory.ConsolePSVita, 'PS Vita');
		map.set(NewznabCategory.ConsolePSP, 'PSP');
		map.set(NewznabCategory.ConsoleXBox360, 'Xbox 360');
		map.set(NewznabCategory.ConsoleXBox, 'Xbox');
		map.set(NewznabCategory.ConsoleNDS, 'Switch/NDS');
		map.set(NewznabCategory.ConsoleWii, 'Wii');
		map.set(NewznabCategory.ConsoleWiiU, 'WiiU');
		map.set(NewznabCategory.Console3DS, '3DS');
		map.set(NewznabCategory.ConsoleOther, 'Console Other');
		// Mobile
		map.set(NewznabCategory.PCMobileAndroid, 'Android');
		map.set(NewznabCategory.PCMobileiOS, 'iOS');
		map.set(NewznabCategory.PCMobileOther, 'Mobile Other');
		// Books
		map.set(NewznabCategory.Books, 'Books');
		map.set(NewznabCategory.BooksEBook, 'EBooks');
		map.set(NewznabCategory.BooksComics, 'Comics');
		map.set(NewznabCategory.BooksMags, 'Magazines');
		map.set(NewznabCategory.BooksTechnical, 'Technical');
		map.set(NewznabCategory.BooksOther, 'Books Other');
		// Other
		map.set(NewznabCategory.Other, 'Other');
		map.set(NewznabCategory.OtherMisc, 'Other Misc');
		return map;
	}

	/** Build category mapper for Knaben's category IDs */
	private buildCategoryMapper(): CategoryMapper {
		const mapper = new CategoryMapper();
		// Audio categories (1000000+)
		mapper.addMapping(1000000, NewznabCategory.Audio);
		mapper.addMapping(1001000, NewznabCategory.AudioMP3);
		mapper.addMapping(1002000, NewznabCategory.AudioLossless);
		mapper.addMapping(1003000, NewznabCategory.AudioAudiobook);
		mapper.addMapping(1004000, NewznabCategory.AudioVideo);
		mapper.addMapping(1005000, NewznabCategory.AudioOther);
		mapper.addMapping(1006000, NewznabCategory.AudioOther);
		// TV categories (2000000+)
		mapper.addMapping(2000000, NewznabCategory.TV);
		mapper.addMapping(2001000, NewznabCategory.TVHD);
		mapper.addMapping(2002000, NewznabCategory.TVSD);
		mapper.addMapping(2003000, NewznabCategory.TVUHD);
		mapper.addMapping(2004000, NewznabCategory.TVDocumentary);
		mapper.addMapping(2005000, NewznabCategory.TVForeign);
		mapper.addMapping(2006000, NewznabCategory.TVSport);
		mapper.addMapping(2007000, NewznabCategory.TVOther); // Cartoon
		mapper.addMapping(2008000, NewznabCategory.TVOther);
		// Movies categories (3000000+)
		mapper.addMapping(3000000, NewznabCategory.Movies);
		mapper.addMapping(3001000, NewznabCategory.MoviesHD);
		mapper.addMapping(3002000, NewznabCategory.MoviesSD);
		mapper.addMapping(3003000, NewznabCategory.MoviesUHD);
		mapper.addMapping(3004000, NewznabCategory.MoviesDVD);
		mapper.addMapping(3005000, NewznabCategory.MoviesForeign);
		mapper.addMapping(3006000, NewznabCategory.MoviesForeign); // Bollywood
		mapper.addMapping(3007000, NewznabCategory.Movies3D);
		mapper.addMapping(3008000, NewznabCategory.MoviesOther);
		// PC categories (4000000+)
		mapper.addMapping(4000000, NewznabCategory.PC);
		mapper.addMapping(4001000, NewznabCategory.PCGames);
		mapper.addMapping(4002000, NewznabCategory.PC0day);
		mapper.addMapping(4003000, NewznabCategory.PCMac);
		mapper.addMapping(4004000, NewznabCategory.PCISO);
		// XXX categories (5000000+) - map to Other for safety
		mapper.addMapping(5000000, NewznabCategory.Other);
		mapper.addMapping(5001000, NewznabCategory.Other);
		mapper.addMapping(5002000, NewznabCategory.Other);
		mapper.addMapping(5003000, NewznabCategory.Other);
		mapper.addMapping(5004000, NewznabCategory.Other);
		mapper.addMapping(5005000, NewznabCategory.Other);
		// Anime categories (6000000+)
		mapper.addMapping(6000000, NewznabCategory.TVAnime);
		mapper.addMapping(6001000, NewznabCategory.TVAnime); // Subbed
		mapper.addMapping(6002000, NewznabCategory.TVAnime); // Dubbed
		mapper.addMapping(6003000, NewznabCategory.TVAnime); // Dual audio
		mapper.addMapping(6004000, NewznabCategory.TVAnime); // Raw
		mapper.addMapping(6005000, NewznabCategory.AudioVideo); // Music Video
		mapper.addMapping(6006000, NewznabCategory.BooksOther); // Literature
		mapper.addMapping(6007000, NewznabCategory.AudioOther); // Music
		mapper.addMapping(6008000, NewznabCategory.TVAnime); // Non-english
		// Console categories (7000000+)
		mapper.addMapping(7000000, NewznabCategory.Console);
		mapper.addMapping(7001000, NewznabCategory.ConsolePS4);
		mapper.addMapping(7002000, NewznabCategory.ConsolePS3);
		mapper.addMapping(7003000, NewznabCategory.ConsolePS3); // PS2
		mapper.addMapping(7004000, NewznabCategory.ConsolePS3); // PS1
		mapper.addMapping(7005000, NewznabCategory.ConsolePSVita);
		mapper.addMapping(7006000, NewznabCategory.ConsolePSP);
		mapper.addMapping(7007000, NewznabCategory.ConsoleXBox360);
		mapper.addMapping(7008000, NewznabCategory.ConsoleXBox);
		mapper.addMapping(7009000, NewznabCategory.ConsoleNDS); // Switch
		mapper.addMapping(7010000, NewznabCategory.ConsoleNDS);
		mapper.addMapping(7011000, NewznabCategory.ConsoleWii);
		mapper.addMapping(7012000, NewznabCategory.ConsoleWiiU);
		mapper.addMapping(7013000, NewznabCategory.Console3DS);
		mapper.addMapping(7014000, NewznabCategory.ConsoleWii); // GameCube
		mapper.addMapping(7015000, NewznabCategory.ConsoleOther);
		// Mobile categories (8000000+)
		mapper.addMapping(8000000, NewznabCategory.PCMobileOther);
		mapper.addMapping(8001000, NewznabCategory.PCMobileAndroid);
		mapper.addMapping(8002000, NewznabCategory.PCMobileiOS);
		mapper.addMapping(8003000, NewznabCategory.PCMobileOther);
		// Books categories (9000000+)
		mapper.addMapping(9000000, NewznabCategory.Books);
		mapper.addMapping(9001000, NewznabCategory.BooksEBook);
		mapper.addMapping(9002000, NewznabCategory.BooksComics);
		mapper.addMapping(9003000, NewznabCategory.BooksMags);
		mapper.addMapping(9004000, NewznabCategory.BooksTechnical);
		mapper.addMapping(9005000, NewznabCategory.BooksOther);
		// Other categories (10000000+)
		mapper.addMapping(10000000, NewznabCategory.Other);
		mapper.addMapping(10001000, NewznabCategory.OtherMisc);

		return mapper;
	}

	/**
	 * Build search requests for Knaben API (POST JSON)
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
			case 'music': {
				const musicCriteria = criteria as MusicSearchCriteria;
				term = musicCriteria.query || '';
				if (musicCriteria.artist) {
					term =
						musicCriteria.artist +
						(musicCriteria.album ? ` ${musicCriteria.album}` : '') +
						(term ? ` ${term}` : '');
				}
				break;
			}
			case 'book': {
				const bookCriteria = criteria as BookSearchCriteria;
				term = bookCriteria.query || '';
				if (bookCriteria.author) {
					term =
						bookCriteria.author +
						(bookCriteria.title ? ` ${bookCriteria.title}` : '') +
						(term ? ` ${term}` : '');
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

		term = sanitizeSearchTerm(term).trim();

		// Build POST body
		const body: Record<string, unknown> = {
			order_by: 'date',
			order_direction: 'desc',
			from: 0,
			size: 100,
			hide_unsafe: true
		};

		if (term) {
			body.search_type = '100%';
			body.search_field = 'title';
			body.query = term;
		}

		// Map categories if specified
		if (criteria.categories && criteria.categories.length > 0) {
			const knabenCategories = this.mapCategoriesToKnaben(criteria.categories);
			if (knabenCategories.length > 0) {
				body.categories = knabenCategories;
			}
		}

		return [
			{
				url: this.API_ENDPOINT,
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			}
		];
	}

	/**
	 * Map Newznab categories to Knaben category IDs
	 */
	private mapCategoriesToKnaben(categories: number[]): number[] {
		const knabenCategories: number[] = [];

		for (const cat of categories) {
			// Map newznab categories to Knaben's category IDs
			switch (cat) {
				// Audio
				case NewznabCategory.Audio:
					knabenCategories.push(1000000);
					break;
				case NewznabCategory.AudioMP3:
					knabenCategories.push(1001000);
					break;
				case NewznabCategory.AudioLossless:
					knabenCategories.push(1002000);
					break;
				case NewznabCategory.AudioAudiobook:
					knabenCategories.push(1003000);
					break;
				case NewznabCategory.AudioVideo:
					knabenCategories.push(1004000);
					break;
				case NewznabCategory.AudioOther:
					knabenCategories.push(1005000, 1006000);
					break;
				// TV
				case NewznabCategory.TV:
					knabenCategories.push(2000000);
					break;
				case NewznabCategory.TVHD:
					knabenCategories.push(2001000);
					break;
				case NewznabCategory.TVSD:
					knabenCategories.push(2002000);
					break;
				case NewznabCategory.TVUHD:
					knabenCategories.push(2003000);
					break;
				case NewznabCategory.TVDocumentary:
					knabenCategories.push(2004000);
					break;
				case NewznabCategory.TVForeign:
					knabenCategories.push(2005000);
					break;
				case NewznabCategory.TVSport:
					knabenCategories.push(2006000);
					break;
				case NewznabCategory.TVAnime:
					knabenCategories.push(6000000, 6001000, 6002000, 6003000, 6004000, 6008000);
					break;
				case NewznabCategory.TVOther:
					knabenCategories.push(2007000, 2008000);
					break;
				// Movies
				case NewznabCategory.Movies:
					knabenCategories.push(3000000);
					break;
				case NewznabCategory.MoviesHD:
					knabenCategories.push(3001000);
					break;
				case NewznabCategory.MoviesSD:
					knabenCategories.push(3002000);
					break;
				case NewznabCategory.MoviesUHD:
					knabenCategories.push(3003000);
					break;
				case NewznabCategory.MoviesDVD:
					knabenCategories.push(3004000);
					break;
				case NewznabCategory.MoviesForeign:
					knabenCategories.push(3005000, 3006000);
					break;
				case NewznabCategory.Movies3D:
					knabenCategories.push(3007000);
					break;
				case NewznabCategory.MoviesOther:
					knabenCategories.push(3008000);
					break;
				// PC
				case NewznabCategory.PC:
					knabenCategories.push(4000000);
					break;
				case NewznabCategory.PCGames:
					knabenCategories.push(4001000);
					break;
				case NewznabCategory.PC0day:
					knabenCategories.push(4002000);
					break;
				case NewznabCategory.PCMac:
					knabenCategories.push(4003000);
					break;
				case NewznabCategory.PCISO:
					knabenCategories.push(4004000);
					break;
				// Books
				case NewznabCategory.Books:
					knabenCategories.push(9000000);
					break;
				case NewznabCategory.BooksEBook:
					knabenCategories.push(9001000);
					break;
				case NewznabCategory.BooksComics:
					knabenCategories.push(9002000);
					break;
				case NewznabCategory.BooksMags:
					knabenCategories.push(9003000);
					break;
				case NewznabCategory.BooksTechnical:
					knabenCategories.push(9004000);
					break;
				case NewznabCategory.BooksOther:
					knabenCategories.push(9005000);
					break;
			}
		}

		return [...new Set(knabenCategories)]; // Deduplicate
	}

	/**
	 * Parse Knaben JSON response
	 */
	protected parseSearchResponse(responseText: string): ReleaseResult[] {
		const results: ReleaseResult[] = [];

		let data: KnabenResponse;
		try {
			data = JSON.parse(responseText);
		} catch {
			this.log.error('Failed to parse Knaben JSON response');
			return results;
		}

		if (!data.hits || !Array.isArray(data.hits)) {
			return results;
		}

		// Filter to only releases with seeders
		const rows = data.hits.filter((r) => r.seeders > 0);

		for (const row of rows) {
			// Parse date - handle timezone
			let publishDate: Date;
			try {
				// Knaben dates may or may not have timezone
				const dateStr =
					row.date && !/[+-]\d{2}:\d{2}$/.test(row.date) ? `${row.date}+01:00` : row.date;
				publishDate = new Date(dateStr);
			} catch {
				publishDate = new Date();
			}

			// Map categories from Knaben's category IDs to core Category enum
			const categories: Category[] = [];
			if (row.categoryId && Array.isArray(row.categoryId)) {
				for (const catId of row.categoryId) {
					const newznabCats = this.categoryMapper.mapTrackerToNewznab(catId);
					for (const cat of newznabCats) {
						// Map NewznabCategory to core Category
						const coreCategory = this.mapToCoreCategory(cat);
						if (coreCategory !== null && !categories.includes(coreCategory)) {
							categories.push(coreCategory);
						}
					}
				}
			}
			if (categories.length === 0) {
				categories.push(Category.MOVIE); // Default to movies
			}

			const release: ReleaseResult = {
				guid: row.details || `magnet:?xt=urn:btih:${row.hash}`,
				title: row.title,
				commentsUrl: row.details,
				downloadUrl: row.link || row.magnetUrl,
				magnetUrl: row.magnetUrl,
				infoHash: row.hash,
				categories,
				publishDate,
				size: row.bytes,
				seeders: row.seeders,
				leechers: row.peers,
				protocol: 'torrent',
				indexerId: this.id,
				indexerName: this.name
			};

			results.push(release);
		}

		return results;
	}

	/**
	 * Map NewznabCategory to core Category enum
	 */
	private mapToCoreCategory(newznabCat: number): Category | null {
		// Movies (2xxx)
		if (newznabCat >= 2000 && newznabCat < 3000) {
			if (newznabCat === NewznabCategory.MoviesHD) return Category.MOVIE_HD;
			if (newznabCat === NewznabCategory.MoviesSD) return Category.MOVIE_SD;
			if (newznabCat === NewznabCategory.MoviesUHD) return Category.MOVIE_UHD;
			if (newznabCat === NewznabCategory.Movies3D) return Category.MOVIE_3D;
			if (newznabCat === NewznabCategory.MoviesDVD) return Category.MOVIE_BLURAY;
			if (newznabCat === NewznabCategory.MoviesForeign) return Category.MOVIE_FOREIGN;
			return Category.MOVIE;
		}
		// TV (5xxx)
		if (newznabCat >= 5000 && newznabCat < 6000) {
			if (newznabCat === NewznabCategory.TVHD) return Category.TV_HD;
			if (newznabCat === NewznabCategory.TVSD) return Category.TV_SD;
			if (newznabCat === NewznabCategory.TVUHD) return Category.TV_UHD;
			if (newznabCat === NewznabCategory.TVAnime) return Category.TV_ANIME;
			if (newznabCat === NewznabCategory.TVDocumentary) return Category.TV_DOCUMENTARY;
			if (newznabCat === NewznabCategory.TVForeign) return Category.TV_FOREIGN;
			if (newznabCat === NewznabCategory.TVSport) return Category.TV_SPORT;
			return Category.TV;
		}
		// Audio (3xxx)
		if (newznabCat >= 3000 && newznabCat < 4000) {
			if (newznabCat === NewznabCategory.AudioMP3) return Category.AUDIO_MP3;
			if (newznabCat === NewznabCategory.AudioLossless) return Category.AUDIO_LOSSLESS;
			if (newznabCat === NewznabCategory.AudioAudiobook) return Category.AUDIO_AUDIOBOOK;
			return Category.AUDIO;
		}
		return null;
	}
}

/**
 * Factory function for creating Knaben indexer instances
 */
export function createKnabenIndexer(config: NativeIndexerConfig): KnabenIndexer {
	return new KnabenIndexer(config);
}
