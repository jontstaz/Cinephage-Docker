/**
 * Base classes and utilities for native TypeScript indexers.
 */

// Base classes
export {
	IndexerBase,
	type NativeIndexerConfig,
	type IndexerMetadata,
	type SearchRequest,
	buildQueryString,
	sanitizeSearchTerm
} from './IndexerBase';
export { PublicIndexerBase } from './PublicIndexerBase';
export {
	PrivateIndexerBase,
	SemiPrivateIndexerBase,
	type AuthMethod,
	type PrivateIndexerSettings
} from './PrivateIndexerBase';

// Unit3D support
export { Unit3dBase } from './Unit3dBase';
export type {
	Unit3dSettings,
	Unit3dResponse,
	Unit3dTorrent,
	Unit3dTorrentAttributes,
	Unit3dCategoryMapping,
	Unit3dSearchParams,
	Unit3dLinks,
	Unit3dMeta
} from './Unit3dTypes';

// Category system
export {
	NewznabCategory,
	type NewznabCategoryId,
	type CategoryInfo,
	type CategoryMapping,
	CategoryMapper,
	isMovieCategory,
	isTvCategory,
	isAudioCategory,
	isBookCategory,
	isConsoleCategory,
	isPcCategory,
	isXxxCategory,
	isAnimeCategory,
	getParentCategory,
	getCategoryName
} from './Categories';
