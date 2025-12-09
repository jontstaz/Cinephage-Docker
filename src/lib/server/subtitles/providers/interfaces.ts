/**
 * Subtitle Provider Interface Definitions
 */

import type {
	SubtitleSearchCriteria,
	SubtitleSearchResult,
	SubtitleProviderConfig,
	ProviderSearchOptions,
	LanguageCode
} from '../types';

/**
 * Core interface that all subtitle providers must implement
 */
export interface ISubtitleProvider {
	/** Unique provider ID (from database config) */
	readonly id: string;

	/** Display name */
	readonly name: string;

	/** Provider implementation type */
	readonly implementation: string;

	/** Languages supported by this provider */
	readonly supportedLanguages: LanguageCode[];

	/** Whether this provider supports hash-based matching */
	readonly supportsHashSearch: boolean;

	/**
	 * Search for subtitles matching the given criteria
	 * @param criteria Search parameters
	 * @param options Additional search options
	 * @returns Array of matching subtitle results
	 */
	search(
		criteria: SubtitleSearchCriteria,
		options?: ProviderSearchOptions
	): Promise<SubtitleSearchResult[]>;

	/**
	 * Download a subtitle file
	 * @param result The search result to download
	 * @returns Subtitle file content as Buffer
	 */
	download(result: SubtitleSearchResult): Promise<Buffer>;

	/**
	 * Test provider connectivity and authentication
	 * @returns Test result with success status, message, and response time
	 */
	test(): Promise<ProviderTestResult>;

	/**
	 * Check if provider can handle the given search criteria
	 * @param criteria Search parameters to check
	 * @returns true if provider can search with these criteria
	 */
	canSearch(criteria: SubtitleSearchCriteria): boolean;
}

/**
 * Factory interface for creating provider instances
 */
export interface ISubtitleProviderFactory {
	/**
	 * Create a provider instance from configuration
	 * @param config Provider configuration from database
	 * @returns Provider instance
	 */
	createProvider(config: SubtitleProviderConfig): ISubtitleProvider;

	/**
	 * Check if factory can handle this implementation type
	 * @param implementation Provider implementation type
	 */
	canHandle(implementation: string): boolean;

	/**
	 * Get list of supported implementation types
	 */
	getSupportedImplementations(): string[];
}

/**
 * Provider definition metadata
 */
export interface ProviderDefinition {
	implementation: string;
	name: string;
	description: string;
	website: string;
	requiresApiKey: boolean;
	requiresCredentials: boolean;
	supportedLanguages: LanguageCode[];
	supportsHashSearch: boolean;
	features: string[];
	settings: ProviderSettingDefinition[];
}

/**
 * Provider setting field definition
 */
export interface ProviderSettingDefinition {
	key: string;
	label: string;
	type: 'string' | 'number' | 'boolean' | 'select';
	required: boolean;
	default?: string | number | boolean;
	options?: Array<{ value: string; label: string }>;
	description?: string;
}

/**
 * Provider test result
 */
export interface ProviderTestResult {
	success: boolean;
	message: string;
	responseTime: number;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
	providerId: string;
	providerName?: string;
	implementation?: string;
	isHealthy: boolean;
	lastCheck?: string;
	lastError?: string;
	consecutiveFailures: number;
	isThrottled: boolean;
	throttledUntil?: string;
	/** Type of error that caused throttling (e.g., 'TooManyRequests', 'DownloadLimitExceeded') */
	throttleErrorType?: string;
}
