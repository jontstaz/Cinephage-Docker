/**
 * Base class for TypeScript-native indexer implementations.
 * Provides common functionality for all indexers including HTTP handling,
 * rate limiting, status tracking, and cookie management.
 */

import type { IIndexer, IndexerConfig, IndexerDownloadResult } from '../../core/interfaces';
import type { IndexerCapabilities } from '../../core/capabilities';
import type { SearchCriteria } from '../../core/searchCriteria';
import type { ReleaseResult } from '../../core/releaseResult';
import type { IndexerProtocol, IndexerAccessType } from '../../core/types';
import { IndexerHttp, createIndexerHttp } from '../../http/IndexerHttp';
import { getPersistentStatusTracker } from '../../status';
import type { RateLimitConfig } from '../../ratelimit/types';
import { createChildLogger } from '$lib/logging';
import { parseTorrentFile } from '$lib/server/downloadClients/utils/torrentParser';

/** Configuration for a native TypeScript indexer */
export interface NativeIndexerConfig {
	/** Database config */
	config: IndexerConfig;
	/** Rate limit override */
	rateLimit?: RateLimitConfig;
}

/** Indexer metadata - defined by each indexer implementation */
export interface IndexerMetadata {
	/** Unique indexer definition ID */
	id: string;
	/** Display name */
	name: string;
	/** Description */
	description: string;
	/** Primary URLs */
	urls: string[];
	/** Legacy/alternate URLs */
	legacyUrls?: string[];
	/** Language code */
	language: string;
	/** Access type */
	privacy: IndexerAccessType;
	/** Supports pagination */
	supportsPagination?: boolean;
	/** Default rate limit (requests per minute) */
	requestDelay?: number;
}

/**
 * Abstract base class for all native TypeScript indexers.
 */
export abstract class IndexerBase implements IIndexer {
	readonly id: string;
	readonly name: string;
	readonly definitionId: string;
	readonly protocol: IndexerProtocol = 'torrent';
	readonly accessType: IndexerAccessType;
	readonly baseUrl: string;

	// Search capability toggles (from config)
	readonly enableAutomaticSearch: boolean;
	readonly enableInteractiveSearch: boolean;

	protected readonly config: IndexerConfig;
	protected readonly http: IndexerHttp;
	protected readonly log: ReturnType<typeof createChildLogger>;
	protected cookies: Record<string, string> = {};

	/** Subclasses must provide metadata */
	protected abstract readonly metadata: IndexerMetadata;

	/** Subclasses must implement capabilities */
	abstract readonly capabilities: IndexerCapabilities;

	constructor(indexerConfig: NativeIndexerConfig) {
		const { config, rateLimit } = indexerConfig;

		this.config = config;
		this.id = config.id;
		this.name = config.name;
		this.definitionId = config.definitionId;
		this.baseUrl = config.baseUrl;
		this.accessType = this.getAccessType();

		// Search capability toggles
		this.enableAutomaticSearch = config.enableAutomaticSearch;
		this.enableInteractiveSearch = config.enableInteractiveSearch;

		this.log = createChildLogger({ indexer: this.name, indexerId: this.id });

		// Create HTTP client
		this.http = createIndexerHttp({
			indexerId: this.id,
			indexerName: this.name,
			baseUrl: this.baseUrl,
			alternateUrls: config.alternateUrls,
			userAgent: 'Cinephage/1.0',
			rateLimit: rateLimit ?? { requests: 30, periodMs: 60_000 }
		});

		// Initialize status tracking
		this.initializeTracking(config.enabled, config.priority);
	}

	/** Get access type - can be overridden */
	protected getAccessType(): IndexerAccessType {
		return 'public';
	}

	/** Initialize status tracking */
	private initializeTracking(enabled: boolean, priority: number): void {
		const statusTracker = getPersistentStatusTracker();
		statusTracker.initialize(this.id, enabled, priority);
	}

	/** Record successful request */
	protected recordSuccess(responseTimeMs: number): void {
		const statusTracker = getPersistentStatusTracker();
		statusTracker.recordSuccess(this.id, responseTimeMs);
	}

	/** Record failed request */
	protected recordFailure(error: string): void {
		const statusTracker = getPersistentStatusTracker();
		statusTracker.recordFailure(this.id, error);
	}

	/**
	 * Perform a search. Subclasses must implement buildSearchUrl and parseSearchResponse.
	 */
	async search(criteria: SearchCriteria): Promise<ReleaseResult[]> {
		const startTime = Date.now();

		try {
			const requests = this.buildSearchRequests(criteria);
			const allResults: ReleaseResult[] = [];

			for (const request of requests) {
				try {
					const response = await this.http.get(request.url, {
						headers: request.headers
					});

					const results = this.parseSearchResponse(response.body, criteria);
					allResults.push(...results);
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					this.log.warn('Search request failed', { url: request.url, error: message });
				}
			}

			const duration = Date.now() - startTime;
			this.recordSuccess(duration);

			this.log.debug('Search completed', { resultCount: allResults.length, durationMs: duration });
			return allResults;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.log.error('Search failed', { error: message });
			this.recordFailure(message);
			throw error;
		}
	}

	/**
	 * Build search request(s) for criteria.
	 * Subclasses must implement this.
	 */
	protected abstract buildSearchRequests(criteria: SearchCriteria): SearchRequest[];

	/**
	 * Parse search response into releases.
	 * Subclasses must implement this.
	 */
	protected abstract parseSearchResponse(html: string, criteria: SearchCriteria): ReleaseResult[];

	/**
	 * Test connectivity to the indexer.
	 */
	async test(): Promise<void> {
		const testUrl = this.getTestUrl();
		const response = await this.http.get(testUrl);

		if (!this.validateTestResponse(response.body)) {
			throw new Error('Test response validation failed');
		}

		this.log.info('Test successful');
	}

	/** Get URL for testing connectivity - defaults to base URL */
	protected getTestUrl(): string {
		return this.baseUrl;
	}

	/** Validate test response - defaults to checking for non-empty response */
	protected validateTestResponse(html: string): boolean {
		return html.length > 0;
	}

	/**
	 * Get download URL for a release.
	 */
	async getDownloadUrl(release: ReleaseResult): Promise<string> {
		// Default: return the download URL as-is
		if (release.magnetUrl) return release.magnetUrl;
		if (release.downloadUrl) return release.downloadUrl;
		throw new Error('No download URL available');
	}

	/**
	 * Check if this indexer can handle the given search criteria.
	 */
	canSearch(criteria: SearchCriteria): boolean {
		// Check search mode support
		switch (criteria.searchType) {
			case 'movie':
				return this.capabilities.movieSearch?.available ?? false;
			case 'tv':
				return this.capabilities.tvSearch?.available ?? false;
			case 'music':
				return this.capabilities.musicSearch?.available ?? false;
			case 'book':
				return this.capabilities.bookSearch?.available ?? false;
			default:
				return this.capabilities.search?.available ?? true;
		}
	}

	/**
	 * Download a torrent file from the indexer.
	 */
	async downloadTorrent(url: string): Promise<IndexerDownloadResult> {
		const startTime = Date.now();

		try {
			// Check for magnet URL
			if (url.startsWith('magnet:')) {
				return {
					success: true,
					magnetUrl: url,
					responseTimeMs: Date.now() - startTime
				};
			}

			const response = await this.http.get(url, {
				headers: { Accept: 'application/x-bittorrent, */*' }
			});

			// Check for magnet redirect
			if (response.url.startsWith('magnet:')) {
				return {
					success: true,
					magnetUrl: response.url,
					responseTimeMs: Date.now() - startTime
				};
			}

			// Parse torrent file for info hash
			const data = Buffer.from(response.body, 'binary');
			const infoHash = this.extractInfoHash(data);

			return {
				success: true,
				data,
				infoHash,
				responseTimeMs: Date.now() - startTime
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: message,
				responseTimeMs: Date.now() - startTime
			};
		}
	}

	/** Extract info hash from torrent file data */
	protected extractInfoHash(data: Buffer): string | undefined {
		const result = parseTorrentFile(data);
		return result.success ? result.infoHash : undefined;
	}

	/**
	 * Set cookies for authenticated requests.
	 */
	setCookies(cookies: Record<string, string>): void {
		this.cookies = cookies;
		this.http.setCookies(cookies);
	}

	/**
	 * Get current cookies.
	 */
	getCookies(): Record<string, string> {
		return { ...this.cookies };
	}
}

/** Search request structure */
export interface SearchRequest {
	url: string;
	method?: 'GET' | 'POST';
	headers?: Record<string, string>;
	body?: string | URLSearchParams;
}

/** Helper to build query string */
export function buildQueryString(
	params: Record<string, string | number | boolean | undefined>
): string {
	const searchParams = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== '') {
			searchParams.set(key, String(value));
		}
	}
	return searchParams.toString();
}

/** Helper to sanitize search term */
export function sanitizeSearchTerm(term: string | undefined): string {
	if (!term) return '';
	return term
		.replace(/[^\w\s-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
