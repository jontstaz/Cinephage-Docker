/**
 * Core module exports for the indexer system.
 */

// Types
export {
	type IndexerProtocol,
	type IndexerAccessType,
	type ContentType,
	Category,
	MOVIE_CATEGORIES,
	TV_CATEGORIES,
	AUDIO_CATEGORIES,
	isMovieCategory,
	isTvCategory,
	isAudioCategory,
	isBookCategory,
	getCategoriesForSearchType,
	categoryMatchesSearchType,
	indexerHasCategoriesForSearchType
} from './types';

// Capabilities
export {
	type SearchParam,
	type SearchMode,
	type IndexerCapabilities,
	type SearchType,
	getSearchMode,
	supportsParam,
	supportsMovieIdSearch,
	supportsTvIdSearch,
	canHandleSearchType,
	createDefaultCapabilities
} from './capabilities';

// Search Criteria
export {
	type BaseSearchCriteria,
	type MovieSearchCriteria,
	type TvSearchCriteria,
	type MusicSearchCriteria,
	type BookSearchCriteria,
	type BasicSearchCriteria,
	type SearchCriteria,
	isMovieSearch,
	isTvSearch,
	isMusicSearch,
	isBookSearch,
	isBasicSearch,
	hasSearchableIds,
	createTextOnlyCriteria,
	createIdOnlyCriteria,
	criteriaToString
} from './searchCriteria';

// Release Results
export {
	type ReleaseResult,
	type ReleaseInfo,
	toReleaseInfo,
	hasDownloadInfo,
	getBestDownloadUrl,
	formatSize,
	parseSize
} from './releaseResult';

// Interfaces
export {
	type IndexerStatusSnapshot,
	type IndexerConfig,
	type IndexerRequest,
	type IIndexerRequestGenerator,
	type IIndexerResponseParser,
	type IIndexer,
	type IHttpIndexer,
	type ITorrentIndexer,
	type IUsenetIndexer,
	type IndexerSearchResult,
	type RejectedIndexer,
	type SearchResult,
	type IIndexerFactory,
	type IndexerDownloadResult
} from './interfaces';
