/**
 * AniList GraphQL Client
 *
 * HTTP client for interacting with the AniList GraphQL API.
 * Used to search for anime and retrieve MAL/AniList IDs.
 */

import { logger } from '$lib/logging';
import type { AniListMedia, AniListMediaResponse, AniListPageResponse } from './types';

const streamLog = { logCategory: 'streams' as const };

// ============================================================================
// Configuration
// ============================================================================

const ANILIST_API_URL = 'https://graphql.anilist.co';
const ANILIST_TIMEOUT_MS = 10000;

// ============================================================================
// GraphQL Queries
// ============================================================================

/**
 * Search query for finding anime by title
 * Returns multiple results for fuzzy matching
 */
const SEARCH_QUERY = `
query ($search: String, $type: MediaType, $perPage: Int) {
  Page(perPage: $perPage) {
    media(search: $search, type: $type, sort: SEARCH_MATCH) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      seasonYear
      format
      episodes
      status
      synonyms
    }
  }
}
`;

/**
 * Direct lookup query by AniList ID
 */
const GET_BY_ID_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    seasonYear
    format
    episodes
    status
    synonyms
  }
}
`;

// ============================================================================
// Client Implementation
// ============================================================================

export class AniListClient {
	private readonly endpoint: string;
	private readonly timeout: number;

	constructor(options?: { endpoint?: string; timeout?: number }) {
		this.endpoint = options?.endpoint ?? ANILIST_API_URL;
		this.timeout = options?.timeout ?? ANILIST_TIMEOUT_MS;
	}

	/**
	 * Search for anime by title
	 *
	 * @param title - Anime title to search for
	 * @param perPage - Maximum results to return (default 10)
	 * @returns Array of matching anime entries
	 */
	async searchAnime(title: string, perPage: number = 10): Promise<AniListMedia[]> {
		try {
			const response = await this.executeQuery<AniListPageResponse>(SEARCH_QUERY, {
				search: title,
				type: 'ANIME',
				perPage
			});

			if (!response.data?.Page?.media) {
				return [];
			}

			return response.data.Page.media;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.warn('AniList search failed', {
				title,
				error: errorMsg,
				...streamLog
			});
			return [];
		}
	}

	/**
	 * Get anime by AniList ID
	 *
	 * @param anilistId - AniList ID to look up
	 * @returns Anime entry or null if not found
	 */
	async getById(anilistId: number): Promise<AniListMedia | null> {
		try {
			const response = await this.executeQuery<AniListMediaResponse>(GET_BY_ID_QUERY, {
				id: anilistId
			});

			return response.data?.Media ?? null;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.warn('AniList getById failed', {
				anilistId,
				error: errorMsg,
				...streamLog
			});
			return null;
		}
	}

	/**
	 * Execute a GraphQL query against AniList API
	 */
	private async executeQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const response = await fetch(this.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify({ query, variables }),
				signal: controller.signal
			});

			if (!response.ok) {
				throw new Error(`AniList API error: ${response.status} ${response.statusText}`);
			}

			const data = (await response.json()) as T & { errors?: Array<{ message: string }> };

			// Check for GraphQL errors
			if (data.errors && data.errors.length > 0) {
				throw new Error(`AniList GraphQL error: ${data.errors[0].message}`);
			}

			return data;
		} finally {
			clearTimeout(timeoutId);
		}
	}
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: AniListClient | null = null;

/**
 * Get the singleton AniList client instance
 */
export function getAniListClient(): AniListClient {
	if (!clientInstance) {
		clientInstance = new AniListClient();
	}
	return clientInstance;
}
