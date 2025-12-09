/**
 * Streaming Provider Settings
 *
 * Provides utilities to retrieve streaming provider configuration
 * from the database and manage provider enablement.
 */

import { db } from '$lib/server/db';
import { indexers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { CINEPHAGE_STREAM_DEFINITION_ID } from '../indexers/definitions/registry';

// ============================================================================
// Provider Types
// ============================================================================

/**
 * All supported streaming provider IDs
 */
export type StreamingProvider =
	| 'videasy'
	| 'vidlink'
	| 'xprime'
	| 'smashy'
	| 'hexa'
	| 'yflix'
	| 'mapple'
	| 'onetouchtv'
	| 'animekai'
	| 'kisskh';

/**
 * Default enabled providers (primary movie/TV sources)
 */
const DEFAULT_ENABLED_PROVIDERS: StreamingProvider[] = [
	'videasy',
	'vidlink',
	'xprime',
	'smashy',
	'hexa'
];

// ============================================================================
// Settings Interface
// ============================================================================

export interface StreamingIndexerSettings {
	/** Base URL for streaming endpoints */
	baseUrl?: string;

	/** Comma-separated list of enabled providers */
	enabledProviders?: string;

	/** Individual provider toggles (for backward compatibility) */
	enableVideasy?: 'true' | 'false';
	enableVidlink?: 'true' | 'false';
	enableXprime?: 'true' | 'false';
	enableSmashy?: 'true' | 'false';
	enableHexa?: 'true' | 'false';
	enableYflix?: 'true' | 'false';
	enableMapple?: 'true' | 'false';
	enableOnetouchtv?: 'true' | 'false';
	enableAnimekai?: 'true' | 'false';
	enableKisskh?: 'true' | 'false';

	// Legacy settings (deprecated)
	/** @deprecated Use enabledProviders instead */
	enableVidsrc?: string;
	/** @deprecated Use enabledProviders instead */
	enableMoviesapi?: string;
	/** @deprecated Use enabledProviders instead */
	enable2embed?: string;
}

// ============================================================================
// Settings Functions
// ============================================================================

/**
 * Get the streaming indexer's settings from the database.
 * Returns undefined if indexer not found or has no settings.
 */
export async function getStreamingIndexerSettings(): Promise<StreamingIndexerSettings | undefined> {
	const rows = await db
		.select({ settings: indexers.settings })
		.from(indexers)
		.where(eq(indexers.implementation, CINEPHAGE_STREAM_DEFINITION_ID))
		.limit(1);

	if (rows.length === 0) {
		return undefined;
	}

	return (rows[0].settings as StreamingIndexerSettings) ?? {};
}

/**
 * Get the base URL for streaming, with fallback chain:
 * 1. Indexer settings (from DB)
 * 2. PUBLIC_BASE_URL environment variable
 * 3. Provided default (usually from request headers)
 */
export async function getStreamingBaseUrl(
	fallbackDefault: string = 'http://localhost:5173'
): Promise<string> {
	const settings = await getStreamingIndexerSettings();

	if (settings?.baseUrl) {
		// Remove trailing slash for consistency
		return settings.baseUrl.replace(/\/$/, '');
	}

	const envUrl = process.env.PUBLIC_BASE_URL;
	if (envUrl) {
		return envUrl.replace(/\/$/, '');
	}

	return fallbackDefault;
}

/**
 * Get list of enabled streaming providers based on indexer settings.
 */
export async function getEnabledProviders(): Promise<StreamingProvider[]> {
	const settings = await getStreamingIndexerSettings();

	// If enabledProviders is set, use it directly
	if (settings?.enabledProviders) {
		const enabled = settings.enabledProviders
			.split(',')
			.map((p) => p.trim().toLowerCase() as StreamingProvider)
			.filter((p) => isValidProvider(p));

		if (enabled.length > 0) {
			return enabled;
		}
	}

	// Check individual toggles
	const providers: StreamingProvider[] = [];

	// Videasy - enabled by default
	if (settings?.enableVideasy !== 'false') {
		providers.push('videasy');
	}

	// Vidlink - enabled by default
	if (settings?.enableVidlink !== 'false') {
		providers.push('vidlink');
	}

	// XPrime - enabled by default
	if (settings?.enableXprime !== 'false') {
		providers.push('xprime');
	}

	// Smashy - enabled by default
	if (settings?.enableSmashy !== 'false') {
		providers.push('smashy');
	}

	// Hexa - enabled by default
	if (settings?.enableHexa !== 'false') {
		providers.push('hexa');
	}

	// YFlix - disabled by default (requires content ID lookup)
	if (settings?.enableYflix === 'true') {
		providers.push('yflix');
	}

	// Mapple - disabled by default (special header handling)
	if (settings?.enableMapple === 'true') {
		providers.push('mapple');
	}

	// OneTouchTV - disabled by default (requires content ID lookup)
	if (settings?.enableOnetouchtv === 'true') {
		providers.push('onetouchtv');
	}

	// AnimeKai - disabled by default (requires content ID lookup)
	if (settings?.enableAnimekai === 'true') {
		providers.push('animekai');
	}

	// KissKH - disabled by default (requires content ID lookup)
	if (settings?.enableKisskh === 'true') {
		providers.push('kisskh');
	}

	// If no providers enabled from settings, use defaults
	if (providers.length === 0) {
		return DEFAULT_ENABLED_PROVIDERS;
	}

	return providers;
}

/**
 * Check if a provider ID is valid
 */
function isValidProvider(provider: string): provider is StreamingProvider {
	const validProviders: StreamingProvider[] = [
		'videasy',
		'vidlink',
		'xprime',
		'smashy',
		'hexa',
		'yflix',
		'mapple',
		'onetouchtv',
		'animekai',
		'kisskh'
	];
	return validProviders.includes(provider as StreamingProvider);
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: StreamingProvider): string {
	const names: Record<StreamingProvider, string> = {
		videasy: 'Videasy',
		vidlink: 'Vidlink',
		xprime: 'XPrime',
		smashy: 'Smashystream',
		hexa: 'Hexa',
		yflix: 'YFlix',
		mapple: 'Mapple',
		onetouchtv: 'OneTouchTV',
		animekai: 'AnimeKai',
		kisskh: 'KissKH'
	};
	return names[provider] ?? provider;
}

/**
 * Get all available providers with their default status
 */
export function getAllProviders(): Array<{
	id: StreamingProvider;
	name: string;
	enabledByDefault: boolean;
	description: string;
}> {
	return [
		{
			id: 'videasy',
			name: 'Videasy',
			enabledByDefault: true,
			description: 'Multiple servers with multi-language support'
		},
		{
			id: 'vidlink',
			name: 'Vidlink',
			enabledByDefault: true,
			description: 'Simple and fast provider'
		},
		{
			id: 'xprime',
			name: 'XPrime',
			enabledByDefault: true,
			description: 'High quality streams with turnstile protection'
		},
		{
			id: 'smashy',
			name: 'Smashystream',
			enabledByDefault: true,
			description: 'Multiple player types with subtitles'
		},
		{
			id: 'hexa',
			name: 'Hexa',
			enabledByDefault: true,
			description: 'Fast provider with API key encryption'
		},
		{
			id: 'yflix',
			name: 'YFlix',
			enabledByDefault: false,
			description: 'Requires content ID lookup (1Movies compatible)'
		},
		{
			id: 'mapple',
			name: 'Mapple',
			enabledByDefault: false,
			description: 'Session-based provider with 4K support'
		},
		{
			id: 'onetouchtv',
			name: 'OneTouchTV',
			enabledByDefault: false,
			description: 'TV shows only, requires content ID lookup'
		},
		{
			id: 'animekai',
			name: 'AnimeKai',
			enabledByDefault: false,
			description: 'Anime only, requires content ID lookup'
		},
		{
			id: 'kisskh',
			name: 'KissKH',
			enabledByDefault: false,
			description: 'Asian dramas, requires content ID lookup'
		}
	];
}
