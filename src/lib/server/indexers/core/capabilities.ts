/**
 * Indexer capability declarations.
 * Determines what search parameters an indexer supports.
 */

/** Search parameter that an indexer can support */
export type SearchParam =
	| 'q' // Text query
	| 'imdbId' // IMDB ID (tt1234567)
	| 'tmdbId' // TMDB ID (number)
	| 'tvdbId' // TVDB ID (number)
	| 'tvMazeId' // TVMaze ID
	| 'traktId' // Trakt ID
	| 'season' // Season number
	| 'ep' // Episode number
	| 'year' // Release year
	| 'genre' // Genre filter
	| 'artist' // Music artist
	| 'album' // Music album
	| 'author' // Book author
	| 'title'; // Book/Album title

/** Search mode declaration */
export interface SearchMode {
	/** Whether this mode is available */
	available: boolean;
	/** Parameters supported by this mode */
	supportedParams: SearchParam[];
	/** Optional: specific search path for this mode */
	searchPath?: string;
}

/** Indexer capabilities declaration */
export interface IndexerCapabilities {
	/** Basic text search mode */
	search: SearchMode;
	/** Movie-specific search */
	movieSearch?: SearchMode;
	/** TV-specific search */
	tvSearch?: SearchMode;
	/** Music search */
	musicSearch?: SearchMode;
	/** Book search */
	bookSearch?: SearchMode;

	/** Categories this indexer provides (id -> name) */
	categories: Map<number, string>;

	/** Whether the indexer supports pagination */
	supportsPagination: boolean;

	/** Whether the indexer returns infohash */
	supportsInfoHash: boolean;

	/** Maximum results per request */
	limitMax: number;

	/** Default result limit */
	limitDefault: number;
}

/** Search type for typed criteria */
export type SearchType = 'basic' | 'movie' | 'tv' | 'music' | 'book';

/** Get the search mode for a given search type */
export function getSearchMode(
	capabilities: IndexerCapabilities,
	searchType: SearchType
): SearchMode | undefined {
	switch (searchType) {
		case 'basic':
			return capabilities.search;
		case 'movie':
			return capabilities.movieSearch;
		case 'tv':
			return capabilities.tvSearch;
		case 'music':
			return capabilities.musicSearch;
		case 'book':
			return capabilities.bookSearch;
	}
}

/** Check if indexer supports a search param for a given search type */
export function supportsParam(
	capabilities: IndexerCapabilities,
	searchType: SearchType,
	param: SearchParam
): boolean {
	const mode = getSearchMode(capabilities, searchType);
	return mode?.available === true && mode.supportedParams.includes(param);
}

/** Check if indexer supports ID-based search for movies */
export function supportsMovieIdSearch(capabilities: IndexerCapabilities): boolean {
	return (
		supportsParam(capabilities, 'movie', 'imdbId') || supportsParam(capabilities, 'movie', 'tmdbId')
	);
}

/** Check if indexer supports ID-based search for TV */
export function supportsTvIdSearch(capabilities: IndexerCapabilities): boolean {
	return (
		supportsParam(capabilities, 'tv', 'imdbId') ||
		supportsParam(capabilities, 'tv', 'tmdbId') ||
		supportsParam(capabilities, 'tv', 'tvdbId')
	);
}

/** Check if indexer can handle a specific search type */
export function canHandleSearchType(
	capabilities: IndexerCapabilities,
	searchType: SearchType
): boolean {
	const mode = getSearchMode(capabilities, searchType);
	return mode?.available === true;
}

/** Create default capabilities (text search only) */
export function createDefaultCapabilities(): IndexerCapabilities {
	return {
		search: {
			available: true,
			supportedParams: ['q']
		},
		categories: new Map(),
		supportsPagination: false,
		supportsInfoHash: true,
		limitMax: 100,
		limitDefault: 100
	};
}
