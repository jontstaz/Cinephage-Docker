/**
 * AniList ID Resolver
 *
 * Resolves anime titles to AniList/MAL IDs with caching and fuzzy matching.
 * Used to bridge TMDB metadata to anime-specific content IDs.
 */

import { logger } from '$lib/logging';
import { getAniListClient, type AniListClient } from './client';
import type {
	AniListCacheEntry,
	AniListCacheKey,
	AniListMedia,
	AniListResolveResult
} from './types';

const streamLog = { logCategory: 'streams' as const };

// ============================================================================
// Configuration
// ============================================================================

/** Cache TTL for successful lookups (30 days) */
const CACHE_TTL_SUCCESS_MS = 30 * 24 * 60 * 60 * 1000;

/** Cache TTL for failed lookups (24 hours) */
const CACHE_TTL_FAILURE_MS = 24 * 60 * 60 * 1000;

/** Maximum cache entries */
const CACHE_MAX_SIZE = 1000;

/** Minimum confidence threshold for accepting a match */
const MIN_CONFIDENCE = 0.6;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize a title for comparison
 * Removes special characters, converts to lowercase
 */
function normalizeTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses a combination of exact match, substring, and word overlap
 */
function calculateSimilarity(a: string, b: string): number {
	const normA = normalizeTitle(a);
	const normB = normalizeTitle(b);

	// Exact match
	if (normA === normB) return 1.0;

	// Substring match (one contains the other)
	if (normA.includes(normB) || normB.includes(normA)) {
		const longer = normA.length > normB.length ? normA : normB;
		const shorter = normA.length > normB.length ? normB : normA;
		return 0.8 + (shorter.length / longer.length) * 0.15;
	}

	// Word overlap (Jaccard similarity)
	const wordsA = normA.split(' ').filter((w) => w.length > 0);
	const wordsB = normB.split(' ').filter((w) => w.length > 0);

	if (wordsA.length === 0 || wordsB.length === 0) return 0;

	const intersection = wordsA.filter((w) => wordsB.includes(w));
	const union = [...new Set([...wordsA, ...wordsB])];

	return intersection.length / union.length;
}

/**
 * Get all title variations from an AniList media entry
 */
function getAllTitles(media: AniListMedia): string[] {
	const titles: string[] = [];

	if (media.title.english) titles.push(media.title.english);
	if (media.title.romaji) titles.push(media.title.romaji);
	if (media.title.native) titles.push(media.title.native);
	if (media.synonyms) titles.push(...media.synonyms);

	return titles.filter((t) => t && t.length > 0);
}

// ============================================================================
// Resolver Implementation
// ============================================================================

export class AniListResolver {
	private client: AniListClient;
	private cache: Map<string, AniListCacheEntry>;
	private cacheOrder: string[]; // For LRU eviction

	constructor(client?: AniListClient) {
		this.client = client ?? getAniListClient();
		this.cache = new Map();
		this.cacheOrder = [];
	}

	/**
	 * Resolve an anime title to AniList/MAL IDs
	 *
	 * @param title - Anime title from TMDB
	 * @param year - Optional release year for filtering
	 * @returns Resolution result with IDs and confidence
	 */
	async resolve(title: string, year?: number): Promise<AniListResolveResult> {
		const cacheKey = this.buildCacheKey(title, year);

		// Check cache first
		const cached = this.getFromCache(cacheKey);
		if (cached) {
			logger.debug('AniList cache hit', {
				title,
				year,
				anilistId: cached.anilistId,
				malId: cached.malId,
				...streamLog
			});
			return {
				success: cached.anilistId !== null,
				anilistId: cached.anilistId,
				malId: cached.malId,
				matchedTitle: cached.matchedTitle,
				confidence: cached.confidence,
				cached: true
			};
		}

		// Search AniList
		try {
			const results = await this.client.searchAnime(title);

			if (results.length === 0) {
				logger.debug('AniList no results', { title, year, ...streamLog });
				this.setCache(cacheKey, {
					anilistId: null,
					malId: null,
					matchedTitle: title,
					confidence: 0,
					cachedAt: Date.now(),
					expiresAt: Date.now() + CACHE_TTL_FAILURE_MS
				});
				return {
					success: false,
					anilistId: null,
					malId: null,
					confidence: 0,
					cached: false,
					error: 'No results found'
				};
			}

			// Find best match
			const match = this.selectBestMatch(results, title, year);

			if (!match) {
				logger.debug('AniList no confident match', {
					title,
					year,
					resultCount: results.length,
					...streamLog
				});
				this.setCache(cacheKey, {
					anilistId: null,
					malId: null,
					matchedTitle: title,
					confidence: 0,
					cachedAt: Date.now(),
					expiresAt: Date.now() + CACHE_TTL_FAILURE_MS
				});
				return {
					success: false,
					anilistId: null,
					malId: null,
					confidence: 0,
					cached: false,
					error: 'No confident match found'
				};
			}

			const { media, confidence, matchedTitle } = match;

			logger.debug('AniList resolved', {
				title,
				matchedTitle,
				anilistId: media.id,
				malId: media.idMal,
				confidence: confidence.toFixed(2),
				...streamLog
			});

			// Cache successful result
			this.setCache(cacheKey, {
				anilistId: media.id,
				malId: media.idMal,
				matchedTitle,
				confidence,
				cachedAt: Date.now(),
				expiresAt: Date.now() + CACHE_TTL_SUCCESS_MS
			});

			return {
				success: true,
				anilistId: media.id,
				malId: media.idMal,
				matchedTitle,
				confidence,
				cached: false
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.warn('AniList resolution failed', {
				title,
				year,
				error: errorMsg,
				...streamLog
			});

			return {
				success: false,
				anilistId: null,
				malId: null,
				confidence: 0,
				cached: false,
				error: errorMsg
			};
		}
	}

	/**
	 * Select the best matching anime from search results
	 */
	private selectBestMatch(
		results: AniListMedia[],
		searchTitle: string,
		year?: number
	): { media: AniListMedia; confidence: number; matchedTitle: string } | null {
		let bestMatch: AniListMedia | null = null;
		let bestScore = 0;
		let bestMatchedTitle = '';

		for (const media of results) {
			const titles = getAllTitles(media);

			for (const title of titles) {
				let score = calculateSimilarity(searchTitle, title);

				// Year bonus (within ±1 year tolerance)
				if (year && media.seasonYear) {
					const yearDiff = Math.abs(year - media.seasonYear);
					if (yearDiff === 0) {
						score += 0.15;
					} else if (yearDiff === 1) {
						score += 0.05;
					} else if (yearDiff > 2) {
						// Penalize large year differences
						score -= 0.1;
					}
				}

				// Format bonus for TV series (most common anime format)
				if (media.format === 'TV') {
					score += 0.02;
				}

				// MAL ID availability bonus (more useful for AnimeKai)
				if (media.idMal) {
					score += 0.05;
				}

				if (score > bestScore) {
					bestScore = score;
					bestMatch = media;
					bestMatchedTitle = title;
				}
			}
		}

		// Only return if confidence meets threshold
		if (bestMatch && bestScore >= MIN_CONFIDENCE) {
			return {
				media: bestMatch,
				confidence: Math.min(bestScore, 1.0),
				matchedTitle: bestMatchedTitle
			};
		}

		return null;
	}

	/**
	 * Build cache key from title and year
	 */
	private buildCacheKey(title: string, year?: number): AniListCacheKey {
		const normalizedTitle = normalizeTitle(title);
		return `anilist:${normalizedTitle}:${year ?? 'any'}`;
	}

	/**
	 * Get entry from cache if not expired
	 */
	private getFromCache(key: string): AniListCacheEntry | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			this.cacheOrder = this.cacheOrder.filter((k) => k !== key);
			return null;
		}

		// Move to end for LRU
		this.cacheOrder = this.cacheOrder.filter((k) => k !== key);
		this.cacheOrder.push(key);

		return entry;
	}

	/**
	 * Set cache entry with LRU eviction
	 */
	private setCache(key: string, entry: AniListCacheEntry): void {
		// Evict oldest entries if at capacity
		while (this.cache.size >= CACHE_MAX_SIZE && this.cacheOrder.length > 0) {
			const oldestKey = this.cacheOrder.shift();
			if (oldestKey) {
				this.cache.delete(oldestKey);
			}
		}

		this.cache.set(key, entry);
		this.cacheOrder.push(key);
	}

	/**
	 * Clear the cache (for testing)
	 */
	clearCache(): void {
		this.cache.clear();
		this.cacheOrder = [];
	}

	/**
	 * Get cache statistics (for debugging)
	 */
	getCacheStats(): { size: number; maxSize: number } {
		return {
			size: this.cache.size,
			maxSize: CACHE_MAX_SIZE
		};
	}
}

// ============================================================================
// Singleton Instance
// ============================================================================

let resolverInstance: AniListResolver | null = null;

/**
 * Get the singleton AniList resolver instance
 */
export function getAniListResolver(): AniListResolver {
	if (!resolverInstance) {
		resolverInstance = new AniListResolver();
	}
	return resolverInstance;
}

/**
 * Convenience export for direct access
 */
export const anilistResolver = {
	resolve: (title: string, year?: number) => getAniListResolver().resolve(title, year),
	clearCache: () => getAniListResolver().clearCache(),
	getCacheStats: () => getAniListResolver().getCacheStats()
};
