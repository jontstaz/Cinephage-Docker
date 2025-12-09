/**
 * AniList API Types
 *
 * Type definitions for the AniList GraphQL API and ID resolver service.
 * Used to bridge TMDB metadata to MAL/AniList IDs for anime content.
 */

// ============================================================================
// AniList API Response Types
// ============================================================================

/**
 * Media format types from AniList
 */
export type AniListFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC';

/**
 * Media status from AniList
 */
export type AniListStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';

/**
 * Title object with multiple language variants
 */
export interface AniListTitle {
	romaji: string | null;
	english: string | null;
	native: string | null;
}

/**
 * Media entry from AniList API
 */
export interface AniListMedia {
	/** AniList ID */
	id: number;
	/** MyAnimeList ID (key field for AnimeKai lookup) */
	idMal: number | null;
	/** Title in multiple languages */
	title: AniListTitle;
	/** Year the anime started airing */
	seasonYear: number | null;
	/** Format (TV, MOVIE, OVA, etc.) */
	format: AniListFormat | null;
	/** Total episode count */
	episodes: number | null;
	/** Airing status */
	status: AniListStatus | null;
	/** Synonym titles */
	synonyms: string[] | null;
}

/**
 * GraphQL response wrapper for Media query
 */
export interface AniListMediaResponse {
	data: {
		Media: AniListMedia | null;
	} | null;
	errors?: Array<{
		message: string;
		status?: number;
	}>;
}

/**
 * GraphQL response wrapper for Page query (search)
 */
export interface AniListPageResponse {
	data: {
		Page: {
			media: AniListMedia[];
		} | null;
	} | null;
	errors?: Array<{
		message: string;
		status?: number;
	}>;
}

// ============================================================================
// Resolver Types
// ============================================================================

/**
 * Result of an AniList ID resolution attempt
 */
export interface AniListResolveResult {
	/** Whether resolution succeeded */
	success: boolean;
	/** AniList ID (null if not found) */
	anilistId: number | null;
	/** MAL ID (null if not found or not mapped) */
	malId: number | null;
	/** The title that matched */
	matchedTitle?: string;
	/** Match confidence score (0-1) */
	confidence: number;
	/** Whether result came from cache */
	cached: boolean;
	/** Error message if failed */
	error?: string;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cache entry for resolved AniList IDs
 */
export interface AniListCacheEntry {
	/** AniList ID (null = confirmed not found) */
	anilistId: number | null;
	/** MAL ID (null = not found or not mapped) */
	malId: number | null;
	/** Title that was matched */
	matchedTitle: string;
	/** Match confidence when cached */
	confidence: number;
	/** Timestamp when cached */
	cachedAt: number;
	/** Timestamp when entry expires */
	expiresAt: number;
}

/**
 * Cache key format for AniList lookups
 */
export type AniListCacheKey = `anilist:${string}:${string}`;
