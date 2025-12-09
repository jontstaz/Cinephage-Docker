/**
 * AniList Module
 *
 * Exports for the AniList ID resolution service.
 * Used to bridge TMDB metadata to MAL/AniList IDs for anime content.
 */

// Resolver (main export)
export { AniListResolver, getAniListResolver, anilistResolver } from './AniListResolver';

// Client (for direct API access if needed)
export { AniListClient, getAniListClient } from './client';

// Types
export type {
	// API response types
	AniListMedia,
	AniListTitle,
	AniListFormat,
	AniListStatus,
	AniListMediaResponse,
	AniListPageResponse,

	// Resolver types
	AniListResolveResult,

	// Cache types
	AniListCacheEntry,
	AniListCacheKey
} from './types';
