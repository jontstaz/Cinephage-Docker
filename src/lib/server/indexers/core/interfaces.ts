/**
 * Core interfaces for the indexer system.
 * Defines the contract that all indexers must implement.
 */

import type { IndexerCapabilities } from './capabilities';
import type { SearchCriteria } from './searchCriteria';
import type { ReleaseResult } from './releaseResult';
import type { IndexerProtocol, IndexerAccessType } from './types';

/** Indexer status snapshot (from status tracker) */
export interface IndexerStatusSnapshot {
	/** Whether the indexer is enabled by user */
	isEnabled: boolean;
	/** Whether the indexer is auto-disabled due to failures */
	isDisabled: boolean;
	/** When the indexer can be retried (if disabled) */
	disabledUntil?: Date;
	/** Overall health assessment */
	health: 'healthy' | 'warning' | 'failing' | 'disabled';
	/** Consecutive failure count */
	consecutiveFailures: number;
	/** Priority (from config) */
	priority: number;
}

/** Base indexer configuration stored in database */
export interface IndexerConfig {
	/** Unique ID */
	id: string;
	/** Display name */
	name: string;
	/** YAML definition ID */
	definitionId: string;
	/** Whether enabled by user */
	enabled: boolean;
	/** Base URL (can override definition default) */
	baseUrl: string;
	/** Alternative/fallback URLs (tried in order if primary fails) */
	alternateUrls: string[];
	/** Priority (1-100, lower = higher priority) */
	priority: number;
	/** Protocol type: torrent, usenet, or streaming */
	protocol: IndexerProtocol;
	/** User-provided settings (apiKey, username, etc.) */
	settings: Record<string, string>;

	// Search capability toggles
	/** Whether automatic search is enabled */
	enableAutomaticSearch: boolean;
	/** Whether interactive/manual search is enabled */
	enableInteractiveSearch: boolean;

	// Torrent seeding settings (only applicable for torrent protocol)
	/** Minimum seeders required for a release */
	minimumSeeders: number;
	/** Target seed ratio (e.g., "1.0") */
	seedRatio: string | null;
	/** Seed time in minutes */
	seedTime: number | null;
	/** Seed time for season packs in minutes */
	packSeedTime: number | null;
	/** Prefer magnet URLs over torrent files */
	preferMagnetUrl: boolean;
}

/** HTTP request details */
export interface IndexerRequest {
	url: string;
	method: 'GET' | 'POST';
	headers: Record<string, string>;
	body?: string | URLSearchParams;
	/** Expected response type */
	responseType: 'json' | 'xml' | 'html';
}

/** Request generator interface - builds HTTP requests from search criteria */
export interface IIndexerRequestGenerator {
	/** Build request for the given search criteria */
	buildRequest(criteria: SearchCriteria): IndexerRequest;

	/** Build request for fetching a download URL (for page-based downloads) */
	buildDownloadRequest?(releaseUrl: string): IndexerRequest;
}

/** Response parser interface - parses HTTP responses into release results */
export interface IIndexerResponseParser {
	/** Parse response into release results */
	parse(response: string, indexerId: string, indexerName: string): ReleaseResult[];
}

/** Result of downloading a torrent/NZB from an indexer */
export interface IndexerDownloadResult {
	/** Whether the download was successful */
	success: boolean;
	/** The raw file data (torrent file or NZB) */
	data?: Buffer;
	/** If the response was a magnet redirect */
	magnetUrl?: string;
	/** Info hash extracted from the file */
	infoHash?: string;
	/** Error message if download failed */
	error?: string;
	/** Response time in milliseconds */
	responseTimeMs?: number;
}

/** Core indexer interface */
export interface IIndexer {
	/** Unique instance ID */
	readonly id: string;
	/** Display name */
	readonly name: string;
	/** Definition ID */
	readonly definitionId: string;
	/** Protocol (torrent/usenet) */
	readonly protocol: IndexerProtocol;
	/** Access type (public/semi-private/private) */
	readonly accessType: IndexerAccessType;
	/** Indexer capabilities */
	readonly capabilities: IndexerCapabilities;
	/** Base URL for this indexer instance */
	readonly baseUrl: string;

	// Search capability toggles
	/** Whether automatic search is enabled */
	readonly enableAutomaticSearch: boolean;
	/** Whether interactive/manual search is enabled */
	readonly enableInteractiveSearch: boolean;

	/** Perform a search */
	search(criteria: SearchCriteria): Promise<ReleaseResult[]>;

	/** Test connectivity */
	test(): Promise<void>;

	/** Get download URL (resolve if needed) */
	getDownloadUrl(release: ReleaseResult): Promise<string>;

	/** Whether this indexer can handle the given criteria */
	canSearch(criteria: SearchCriteria): boolean;

	/**
	 * Download a torrent/NZB file from the indexer.
	 * Handles authentication, cookies, and redirect following (including magnet: redirects).
	 *
	 * @param url - The download URL (torrent file URL, not magnet)
	 * @returns Download result with file data or magnet redirect
	 */
	downloadTorrent(url: string): Promise<IndexerDownloadResult>;
}

/** Extended interface for HTTP-based indexers */
export interface IHttpIndexer extends IIndexer {
	/** Request generator */
	readonly requestGenerator: IIndexerRequestGenerator;
	/** Response parser */
	readonly responseParser: IIndexerResponseParser;

	/** Execute an HTTP request */
	executeRequest(request: IndexerRequest): Promise<string>;
}

/** Torrent-specific indexer interface */
export interface ITorrentIndexer extends IHttpIndexer {
	/** Get magnet URL for a release */
	getMagnetUrl(release: ReleaseResult): Promise<string>;
}

/** Usenet-specific indexer interface */
export interface IUsenetIndexer extends IHttpIndexer {
	/** Get NZB URL */
	getNzbUrl(release: ReleaseResult): Promise<string>;
}

/** Indexer search result with metadata */
export interface IndexerSearchResult {
	indexerId: string;
	indexerName: string;
	/** Results from this indexer */
	results: ReleaseResult[];
	/** Search duration in milliseconds */
	searchTimeMs: number;
	/** Error message if search failed */
	error?: string;
	/** Search method used */
	searchMethod?: 'id' | 'text';
}

/** Indexer that was rejected from search */
export interface RejectedIndexer {
	/** Indexer ID */
	indexerId: string;
	/** Indexer name */
	indexerName: string;
	/** Reason for rejection */
	reason: 'searchType' | 'searchSource' | 'disabled' | 'backoff' | 'indexerFilter';
	/** Human-readable rejection message */
	message: string;
}

/** Aggregated search result from SearchOrchestrator */
export interface SearchResult {
	/** All releases (deduplicated and ranked) */
	releases: ReleaseResult[];
	/** Total results across all indexers */
	totalResults: number;
	/** Total search time in milliseconds */
	searchTimeMs: number;
	/** Whether results came from cache */
	fromCache?: boolean;
	/** Per-indexer results */
	indexerResults: IndexerSearchResult[];
	/** Indexers that were rejected from this search */
	rejectedIndexers?: RejectedIndexer[];
}

/** Factory for creating indexer instances */
export interface IIndexerFactory {
	/** Create an indexer instance from config */
	createIndexer(config: IndexerConfig): IIndexer;

	/** Check if factory can handle a definition */
	canHandle(definitionId: string): boolean;
}
