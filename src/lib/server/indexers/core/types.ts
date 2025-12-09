/**
 * Core types for the indexer system.
 */

/** Protocol used by the indexer */
export type IndexerProtocol = 'torrent' | 'usenet' | 'streaming';

/** Indexer access type */
export type IndexerAccessType = 'public' | 'semi-private' | 'private';

/** Content types the indexer supports */
export type ContentType = 'movie' | 'tv' | 'music' | 'book' | 'software' | 'xxx';

/** Newznab-compatible categories */
export enum Category {
	// Movies (2xxx)
	MOVIE = 2000,
	MOVIE_FOREIGN = 2010,
	MOVIE_OTHER = 2020,
	MOVIE_SD = 2030,
	MOVIE_HD = 2040,
	MOVIE_UHD = 2045,
	MOVIE_BLURAY = 2050,
	MOVIE_3D = 2060,
	MOVIE_WEBDL = 2070,

	// TV (5xxx)
	TV = 5000,
	TV_WEBDL = 5010,
	TV_FOREIGN = 5020,
	TV_SD = 5030,
	TV_HD = 5040,
	TV_UHD = 5045,
	TV_OTHER = 5050,
	TV_SPORT = 5060,
	TV_ANIME = 5070,
	TV_DOCUMENTARY = 5080,

	// Audio (3xxx)
	AUDIO = 3000,
	AUDIO_MP3 = 3010,
	AUDIO_VIDEO = 3020,
	AUDIO_AUDIOBOOK = 3030,
	AUDIO_LOSSLESS = 3040,

	// Other
	PC = 4000,
	PC_GAMES = 4050,
	CONSOLE = 1000,
	XXX = 6000,
	BOOKS = 7000,
	BOOKS_EBOOK = 7020
}

/** Category group helpers */
export const MOVIE_CATEGORIES = [
	Category.MOVIE,
	Category.MOVIE_FOREIGN,
	Category.MOVIE_OTHER,
	Category.MOVIE_SD,
	Category.MOVIE_HD,
	Category.MOVIE_UHD,
	Category.MOVIE_BLURAY,
	Category.MOVIE_3D,
	Category.MOVIE_WEBDL
] as const;

export const TV_CATEGORIES = [
	Category.TV,
	Category.TV_WEBDL,
	Category.TV_FOREIGN,
	Category.TV_SD,
	Category.TV_HD,
	Category.TV_UHD,
	Category.TV_OTHER,
	Category.TV_SPORT,
	Category.TV_ANIME,
	Category.TV_DOCUMENTARY
] as const;

export const AUDIO_CATEGORIES = [
	Category.AUDIO,
	Category.AUDIO_MP3,
	Category.AUDIO_VIDEO,
	Category.AUDIO_AUDIOBOOK,
	Category.AUDIO_LOSSLESS
] as const;

/** Check if a category is a movie category */
export function isMovieCategory(cat: number): boolean {
	return cat >= 2000 && cat < 3000;
}

/** Check if a category is a TV category */
export function isTvCategory(cat: number): boolean {
	return cat >= 5000 && cat < 6000;
}

/** Check if a category is an audio category */
export function isAudioCategory(cat: number): boolean {
	return cat >= 3000 && cat < 4000;
}

/** Check if a category is a book category */
export function isBookCategory(cat: number): boolean {
	return cat >= 7000 && cat < 8000;
}

/** Get default categories for a search type */
export function getCategoriesForSearchType(
	searchType: 'movie' | 'tv' | 'music' | 'book' | 'basic'
): number[] {
	switch (searchType) {
		case 'movie':
			return [...MOVIE_CATEGORIES];
		case 'tv':
			return [...TV_CATEGORIES];
		case 'music':
			return [...AUDIO_CATEGORIES];
		case 'book':
			return [Category.BOOKS, Category.BOOKS_EBOOK];
		case 'basic':
			return []; // No category filter for basic search
	}
}

/** Check if a category matches a search type */
export function categoryMatchesSearchType(
	category: number,
	searchType: 'movie' | 'tv' | 'music' | 'book' | 'basic'
): boolean {
	switch (searchType) {
		case 'movie':
			return isMovieCategory(category);
		case 'tv':
			return isTvCategory(category);
		case 'music':
			return isAudioCategory(category);
		case 'book':
			return isBookCategory(category);
		case 'basic':
			return true; // Basic search matches all categories
	}
}

/** Check if an indexer's categories include any matching the search type */
export function indexerHasCategoriesForSearchType(
	indexerCategories: Map<number, string> | number[],
	searchType: 'movie' | 'tv' | 'music' | 'book' | 'basic'
): boolean {
	if (searchType === 'basic') {
		return true; // Basic search doesn't filter by category
	}

	const categoryIds = Array.isArray(indexerCategories)
		? indexerCategories
		: Array.from(indexerCategories.keys());

	return categoryIds.some((cat) => categoryMatchesSearchType(cat, searchType));
}
