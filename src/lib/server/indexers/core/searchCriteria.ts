/**
 * Typed search criteria for different content types.
 * Enables ID-based searching with automatic fallback to text search.
 */

import type { Category } from './types';

/** Base search criteria shared by all search types */
export interface BaseSearchCriteria {
	/** Text query (optional for ID-based searches) */
	query?: string;
	/** Categories to filter */
	categories?: Category[];
	/** Limit results */
	limit?: number;
	/** Offset for pagination */
	offset?: number;
	/** Specific indexer IDs to search (empty = all enabled) */
	indexerIds?: string[];
}

/** Movie-specific search criteria */
export interface MovieSearchCriteria extends BaseSearchCriteria {
	searchType: 'movie';
	/** IMDB ID (e.g., "tt1234567") */
	imdbId?: string;
	/** TMDB ID */
	tmdbId?: number;
	/** Trakt ID */
	traktId?: number;
	/** Release year */
	year?: number;
}

/** TV-specific search criteria */
export interface TvSearchCriteria extends BaseSearchCriteria {
	searchType: 'tv';
	/** IMDB ID */
	imdbId?: string;
	/** TMDB ID */
	tmdbId?: number;
	/** TVDB ID */
	tvdbId?: number;
	/** TVMaze ID */
	tvMazeId?: number;
	/** Trakt ID */
	traktId?: number;
	/** Season number */
	season?: number;
	/** Episode number */
	episode?: number;
	/** Release year */
	year?: number;
}

/** Music search criteria */
export interface MusicSearchCriteria extends BaseSearchCriteria {
	searchType: 'music';
	/** Artist name */
	artist?: string;
	/** Album name */
	album?: string;
	/** Year */
	year?: number;
}

/** Book search criteria */
export interface BookSearchCriteria extends BaseSearchCriteria {
	searchType: 'book';
	/** Author */
	author?: string;
	/** Book title */
	title?: string;
}

/** Basic text search - requires query */
export interface BasicSearchCriteria extends Omit<BaseSearchCriteria, 'query'> {
	searchType: 'basic';
	/** Text query (required for basic search) */
	query: string;
}

/** Union of all search criteria types */
export type SearchCriteria =
	| MovieSearchCriteria
	| TvSearchCriteria
	| MusicSearchCriteria
	| BookSearchCriteria
	| BasicSearchCriteria;

/** Type guard for movie search */
export function isMovieSearch(criteria: SearchCriteria): criteria is MovieSearchCriteria {
	return criteria.searchType === 'movie';
}

/** Type guard for TV search */
export function isTvSearch(criteria: SearchCriteria): criteria is TvSearchCriteria {
	return criteria.searchType === 'tv';
}

/** Type guard for music search */
export function isMusicSearch(criteria: SearchCriteria): criteria is MusicSearchCriteria {
	return criteria.searchType === 'music';
}

/** Type guard for book search */
export function isBookSearch(criteria: SearchCriteria): criteria is BookSearchCriteria {
	return criteria.searchType === 'book';
}

/** Type guard for basic search */
export function isBasicSearch(criteria: SearchCriteria): criteria is BasicSearchCriteria {
	return criteria.searchType === 'basic';
}

/** Check if criteria has any searchable IDs (for tiered search) */
export function hasSearchableIds(criteria: SearchCriteria): boolean {
	if (isMovieSearch(criteria)) {
		return !!(criteria.imdbId || criteria.tmdbId);
	}
	if (isTvSearch(criteria)) {
		return !!(criteria.imdbId || criteria.tmdbId || criteria.tvdbId || criteria.tvMazeId);
	}
	return false;
}

/** Create criteria with IDs removed (for fallback text search) */
export function createTextOnlyCriteria<T extends SearchCriteria>(criteria: T): T {
	const copy = { ...criteria };

	if (isMovieSearch(copy)) {
		delete copy.imdbId;
		delete copy.tmdbId;
	} else if (isTvSearch(copy)) {
		delete copy.imdbId;
		delete copy.tmdbId;
		delete copy.tvdbId;
		delete copy.tvMazeId;
	}

	return copy;
}

/** Create criteria with only IDs (no text query) */
export function createIdOnlyCriteria<T extends SearchCriteria>(criteria: T): T {
	return { ...criteria, query: '' };
}

/** Get a display string for the criteria (for logging) */
export function criteriaToString(criteria: SearchCriteria): string {
	const parts: string[] = [`type=${criteria.searchType}`];

	if (criteria.query) {
		parts.push(`q="${criteria.query}"`);
	}

	if (isMovieSearch(criteria)) {
		if (criteria.imdbId) parts.push(`imdb=${criteria.imdbId}`);
		if (criteria.tmdbId) parts.push(`tmdb=${criteria.tmdbId}`);
		if (criteria.year) parts.push(`year=${criteria.year}`);
	} else if (isTvSearch(criteria)) {
		if (criteria.imdbId) parts.push(`imdb=${criteria.imdbId}`);
		if (criteria.tmdbId) parts.push(`tmdb=${criteria.tmdbId}`);
		if (criteria.tvdbId) parts.push(`tvdb=${criteria.tvdbId}`);
		if (criteria.season !== undefined) parts.push(`s=${criteria.season}`);
		if (criteria.episode !== undefined) parts.push(`e=${criteria.episode}`);
	}

	if (criteria.categories?.length) {
		parts.push(`cats=[${criteria.categories.join(',')}]`);
	}

	return parts.join(' ');
}
