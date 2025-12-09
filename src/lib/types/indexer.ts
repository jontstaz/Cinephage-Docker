/**
 * Types for indexer management UI
 */

export type IndexerProtocol = 'torrent' | 'usenet' | 'streaming';
export type IndexerAccessType = 'public' | 'semi-private' | 'private';

/**
 * Setting field definition from Cardigann indexer definition
 */
export interface DefinitionSetting {
	name: string;
	label: string;
	type:
		| 'text'
		| 'password'
		| 'checkbox'
		| 'select'
		| 'number'
		| 'info'
		| 'info_cookie'
		| 'info_cloudflare'
		| 'info_useragent'
		| 'info_category_8000'
		| 'cardigannCaptcha';
	required?: boolean;
	default?: string;
	placeholder?: string;
	helpText?: string;
	options?: Record<string, string>;
	validation?: {
		min?: number;
		max?: number;
		pattern?: string;
	};
}

/**
 * Capabilities from YAML indexer definition
 */
export interface IndexerCapabilities {
	search?: {
		available: boolean;
		supportedParams: string[];
	};
	movieSearch?: {
		available: boolean;
		supportedParams: string[];
	};
	tvSearch?: {
		available: boolean;
		supportedParams: string[];
	};
	categories?: Record<string, string>;
	limits?: {
		default: number;
		max: number;
	};
	flags?: {
		supportsInfoHash?: boolean;
		supportsPagination?: boolean;
	};
}

/**
 * UI hints for dynamic form rendering.
 * Computed based on indexer type, protocol, and settings.
 */
export interface IndexerUIHints {
	/** Whether this indexer requires authentication (based on type and settings) */
	requiresAuth: boolean;
	/** Whether to show torrent-specific settings (seed ratio, min seeders, etc.) */
	showTorrentSettings: boolean;
	/** Whether this is a streaming indexer */
	isStreaming: boolean;
}

/**
 * Simplified indexer definition from /api/indexers/definitions
 */
export interface IndexerDefinition {
	id: string;
	name: string;
	description?: string;
	type: IndexerAccessType;
	protocol: IndexerProtocol;
	siteUrl: string;
	/** Known alternate/mirror URLs from definition */
	alternateUrls: string[];
	capabilities: IndexerCapabilities;
	settings: DefinitionSetting[];
	/** Pre-computed UI hints for dynamic form rendering */
	uiHints?: IndexerUIHints;
}

/**
 * Compute UI hints for an indexer definition
 */
export function computeUIHints(
	definition: Pick<IndexerDefinition, 'type' | 'protocol' | 'settings'>
): IndexerUIHints {
	const hasAuthSettings =
		definition.settings?.some(
			(s) => s.type === 'password' || s.type === 'text' || s.type === 'info_cookie'
		) ?? false;

	return {
		requiresAuth:
			(definition.type === 'private' || definition.type === 'semi-private') && hasAuthSettings,
		showTorrentSettings: definition.protocol === 'torrent',
		isStreaming: definition.protocol === 'streaming'
	};
}

/**
 * Configured indexer from database
 */
export interface Indexer {
	id: string;
	name: string;
	implementation: string;
	enabled: boolean;
	url: string;
	/** Alternative/fallback URLs (tried in order if primary fails) */
	alternateUrls: string[];
	apiKey?: string | null;
	priority: number;
	protocol: IndexerProtocol;
	config?: Record<string, unknown> | null;
	settings?: Record<string, string> | null;

	// Search capability toggles
	enableAutomaticSearch: boolean;
	enableInteractiveSearch: boolean;

	// Torrent seeding settings (only applicable when protocol === 'torrent')
	minimumSeeders: number;
	seedRatio?: string | null; // Decimal stored as string (e.g., "1.0")
	seedTime?: number | null; // Minutes
	packSeedTime?: number | null; // Minutes for season packs
	preferMagnetUrl: boolean;
}

/**
 * Indexer status from status tracker (runtime health info)
 */
export interface IndexerStatus {
	healthy: boolean;
	enabled: boolean;
	consecutiveFailures: number;
	lastFailure?: string;
	disabledUntil?: string;
	averageResponseTime?: number;
}

/**
 * Combined indexer with status for UI display
 */
export interface IndexerWithStatus extends Indexer {
	status?: IndexerStatus;
	definitionName?: string;
}

/**
 * Form data for creating/updating indexer
 */
export interface IndexerFormData {
	name: string;
	implementation: string;
	url: string;
	/** Alternative/fallback URLs */
	alternateUrls: string[];
	enabled: boolean;
	priority: number;
	protocol: IndexerProtocol;
	settings: Record<string, string>;

	// Search capability toggles
	enableAutomaticSearch: boolean;
	enableInteractiveSearch: boolean;

	// Torrent seeding settings
	minimumSeeders: number;
	seedRatio?: string | null;
	seedTime?: number | null;
	packSeedTime?: number | null;
	preferMagnetUrl: boolean;
}

/**
 * Filter state for indexer table
 */
export interface IndexerFilters {
	protocol: IndexerProtocol | 'all';
	status: 'all' | 'enabled' | 'disabled';
	search: string;
}

/**
 * Sort state for indexer table
 */
export interface IndexerSort {
	column: 'name' | 'priority' | 'protocol' | 'enabled';
	direction: 'asc' | 'desc';
}
