/**
 * YFlix Content ID Lookup Provider
 *
 * Uses site scraping to search for content IDs on YFlix.
 * Works for both movies and TV shows.
 */

import { logger } from '$lib/logging';
import type {
	IContentIdLookupProvider,
	LookupMediaType,
	LookupParams,
	LookupProviderId,
	LookupResult
} from '../types';

const streamLog = { logCategory: 'streams' as const };

// ============================================================================
// Configuration
// ============================================================================

const YFLIX_BASE = 'https://yflix.to';
const USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

const RATE_LIMIT_DELAY_MS = 100;

// ============================================================================
// Utility Functions
// ============================================================================

function normalizeTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^\w\s]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function similarity(a: string, b: string): number {
	const normA = normalizeTitle(a);
	const normB = normalizeTitle(b);

	if (normA === normB) return 1;
	if (normA.includes(normB) || normB.includes(normA)) return 0.9;

	const wordsA = normA.split(' ');
	const wordsB = normB.split(' ');
	const intersection = wordsA.filter((w) => wordsB.includes(w));
	const union = [...new Set([...wordsA, ...wordsB])];

	return intersection.length / union.length;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Provider Implementation
// ============================================================================

interface YFlixSearchResult {
	id: string;
	title: string;
	year?: number;
	url: string;
	type: 'movie' | 'tv';
}

/**
 * YFlix content ID lookup via site scraping
 */
export class YFlixLookup implements IContentIdLookupProvider {
	readonly providerId: LookupProviderId = 'yflix';
	readonly name = 'YFlix';

	/**
	 * YFlix supports both movies and TV shows
	 */
	supportsMediaType(type: LookupMediaType): boolean {
		return type === 'movie' || type === 'tv';
	}

	/**
	 * Look up YFlix content ID by title
	 */
	async lookup(params: LookupParams): Promise<LookupResult> {
		const startTime = Date.now();

		try {
			// Search for content
			const searchResults = await this.searchContent(params.title, params.type);

			if (!searchResults || searchResults.length === 0) {
				// Try alternative titles
				if (params.alternativeTitles?.length) {
					for (const altTitle of params.alternativeTitles) {
						await sleep(RATE_LIMIT_DELAY_MS);
						const altResults = await this.searchContent(altTitle, params.type);

						if (altResults?.length) {
							const match = this.findBestMatch(altResults, altTitle, params.year, params.type);
							if (match) {
								return {
									success: true,
									contentId: match.id,
									cached: false,
									durationMs: Date.now() - startTime
								};
							}
						}
					}
				}

				return {
					success: false,
					contentId: null,
					error: 'No content found',
					cached: false,
					durationMs: Date.now() - startTime
				};
			}

			// Find best match
			const match = this.findBestMatch(searchResults, params.title, params.year, params.type);

			if (!match) {
				return {
					success: false,
					contentId: null,
					error: 'No matching content found',
					cached: false,
					durationMs: Date.now() - startTime
				};
			}

			logger.debug('YFlix found match', {
				searchTitle: params.title,
				matchedTitle: match.title,
				contentId: match.id,
				type: match.type,
				...streamLog
			});

			return {
				success: true,
				contentId: match.id,
				cached: false,
				durationMs: Date.now() - startTime
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.warn('YFlix lookup failed', {
				title: params.title,
				error: errorMsg,
				...streamLog
			});

			return {
				success: false,
				contentId: null,
				error: errorMsg,
				cached: false,
				durationMs: Date.now() - startTime
			};
		}
	}

	/**
	 * Search YFlix for content
	 */
	private async searchContent(query: string, type: LookupMediaType): Promise<YFlixSearchResult[]> {
		// YFlix search URL
		const searchUrl = `${YFLIX_BASE}/search/${encodeURIComponent(query.replace(/\s+/g, '-'))}`;

		const response = await fetch(searchUrl, {
			headers: {
				'User-Agent': USER_AGENT,
				Accept: 'text/html',
				Referer: `${YFLIX_BASE}/`
			}
		});

		if (!response.ok) {
			throw new Error(`Search failed: ${response.status}`);
		}

		const html = await response.text();
		return this.parseSearchResults(html, type);
	}

	/**
	 * Parse search results from HTML
	 */
	private parseSearchResults(html: string, type: LookupMediaType): YFlixSearchResult[] {
		const results: YFlixSearchResult[] = [];

		// Match content items in the HTML
		// YFlix uses a structure like:
		// <a href="/movie/123-title" or "/tv/123-title" class="...">
		//   <div class="title">Title</div>
		//   <div class="year">2024</div>
		// </a>

		// Pattern to match movie/tv links with IDs
		const linkPattern = /href="\/(?<contentType>movie|tv)\/(?<id>\d+)-(?<slug>[^"]+)"/gi;
		const titlePattern =
			/<(?:div|span|h\d)[^>]*class="[^"]*(?:title|name)[^"]*"[^>]*>([^<]+)<\/(?:div|span|h\d)>/gi;
		const yearPattern = /<(?:div|span)[^>]*class="[^"]*year[^"]*"[^>]*>(\d{4})<\/(?:div|span)>/gi;

		let linkMatch;
		const links: Array<{ type: 'movie' | 'tv'; id: string; slug: string }> = [];

		while ((linkMatch = linkPattern.exec(html)) !== null) {
			links.push({
				type: linkMatch.groups?.contentType as 'movie' | 'tv',
				id: linkMatch.groups?.id ?? '',
				slug: linkMatch.groups?.slug ?? ''
			});
		}

		// Extract titles and years
		const titles: string[] = [];
		let titleMatch;
		while ((titleMatch = titlePattern.exec(html)) !== null) {
			titles.push(titleMatch[1].trim());
		}

		const years: number[] = [];
		let yearMatch;
		while ((yearMatch = yearPattern.exec(html)) !== null) {
			years.push(parseInt(yearMatch[1]));
		}

		// Combine results, filtering by requested type
		for (let i = 0; i < links.length; i++) {
			const link = links[i];

			// Filter by type if specified
			if (type === 'movie' && link.type !== 'movie') continue;
			if (type === 'tv' && link.type !== 'tv') continue;

			const title = titles[i] || link.slug.replace(/-/g, ' ');
			const year = years[i];

			results.push({
				id: link.id,
				title,
				year,
				url: `/${link.type}/${link.id}-${link.slug}`,
				type: link.type
			});
		}

		return results;
	}

	/**
	 * Find best matching content from search results
	 */
	private findBestMatch(
		results: YFlixSearchResult[],
		title: string,
		year?: number,
		type?: LookupMediaType
	): YFlixSearchResult | null {
		let bestMatch: YFlixSearchResult | null = null;
		let bestScore = 0;

		for (const result of results) {
			// Skip wrong type
			if (type && result.type !== type) continue;

			let score = similarity(title, result.title);

			// Year match bonus
			if (year && result.year === year) {
				score += 0.15;
			} else if (year && result.year && Math.abs(year - result.year) <= 1) {
				// Allow 1 year tolerance
				score += 0.05;
			}

			if (score > bestScore && score >= 0.5) {
				bestScore = score;
				bestMatch = result;
			}
		}

		return bestMatch;
	}
}
