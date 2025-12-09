/**
 * Provider Orchestrator
 *
 * Manages streaming providers with:
 * - Request deduplication
 * - Result caching
 * - Circuit breaker pattern
 * - Provider fallback
 */

import { logger } from '$lib/logging';
import { getEncDecClient } from '../enc-dec';
import type { ExtractionResult, StreamSource } from '../types';
// BaseProvider re-exported at bottom of file
import type {
	CircuitBreakerState,
	ExtractOptions,
	IStreamProvider,
	ProviderResult,
	StreamingProviderId,
	StreamResult
} from './types';

// Import all providers (will be added as they're implemented)
import { VideasyProvider } from './videasy';
import { VidlinkProvider } from './vidlink';
import { XPrimeProvider } from './xprime';
import { SmashyProvider } from './smashy';
import { HexaProvider } from './hexa';
import { YFlixProvider } from './yflix';
import { MappleProvider } from './mapple';
import { OneTouchTVProvider } from './onetouchtv';
import { AnimeKaiProvider } from './animekai';
import { KissKHProvider } from './kisskh';

const streamLog = { logCategory: 'streams' as const };

// ============================================================================
// Configuration
// ============================================================================

/** Maximum consecutive failures before circuit opens */
const MAX_CONSECUTIVE_FAILURES = 3;

/** Time in ms before circuit breaker resets */
const CIRCUIT_BREAKER_RESET_MS = 60000;

/** TTL for result cache entries */
const RESULT_CACHE_TTL_MS = 30000;

/** Default provider priority order */
const DEFAULT_PROVIDER_ORDER: StreamingProviderId[] = [
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

// ============================================================================
// State Management
// ============================================================================

/** Map of provider ID to provider instance */
const providers = new Map<StreamingProviderId, IStreamProvider>();

/** Map of pending extraction requests for deduplication */
const pendingRequests = new Map<string, Promise<ExtractionResult>>();

/** Cache for recent extraction results */
interface CachedResult {
	result: ExtractionResult;
	expiry: number;
}
const resultCache = new Map<string, CachedResult>();

/** Circuit breaker state per provider */
const circuitBreakers = new Map<StreamingProviderId, CircuitBreakerState>();

/** Timers for circuit breaker reset */
const resetTimers = new Map<StreamingProviderId, NodeJS.Timeout>();

// ============================================================================
// Provider Registration
// ============================================================================

/**
 * Initialize all providers
 */
function initializeProviders(): void {
	if (providers.size > 0) return;

	const encDecClient = getEncDecClient();

	// Register all providers
	const providerInstances: IStreamProvider[] = [
		new VideasyProvider(encDecClient),
		new VidlinkProvider(encDecClient),
		new XPrimeProvider(encDecClient),
		new SmashyProvider(encDecClient),
		new HexaProvider(encDecClient),
		new YFlixProvider(encDecClient),
		new MappleProvider(encDecClient),
		new OneTouchTVProvider(encDecClient),
		new AnimeKaiProvider(encDecClient),
		new KissKHProvider(encDecClient)
	];

	for (const provider of providerInstances) {
		providers.set(provider.config.id, provider);
	}

	logger.info('Streaming providers initialized', {
		count: providers.size,
		providers: Array.from(providers.keys()),
		...streamLog
	});
}

/**
 * Get a provider by ID
 */
function getProvider(id: StreamingProviderId): IStreamProvider | undefined {
	initializeProviders();
	return providers.get(id);
}

/**
 * Get all registered providers
 */
function getAllProviders(): IStreamProvider[] {
	initializeProviders();
	return Array.from(providers.values());
}

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Generate a cache key for deduplication
 */
function getCacheKey(options: ExtractOptions): string {
	const { tmdbId, type, season, episode, provider } = options;
	const parts = [tmdbId, type];

	if (type === 'tv' && season !== undefined) {
		parts.push(`s${season}`);
		if (episode !== undefined) {
			parts.push(`e${episode}`);
		}
	}

	if (provider) {
		parts.push(provider);
	}

	return parts.join(':');
}

// ============================================================================
// Circuit Breaker
// ============================================================================

/**
 * Check if provider's circuit breaker is open
 */
function isCircuitOpen(providerId: StreamingProviderId): boolean {
	const state = circuitBreakers.get(providerId);
	if (!state) return false;

	// Check if circuit should reset
	if (state.isOpen && state.resetAt && Date.now() >= state.resetAt) {
		circuitBreakers.set(providerId, { failures: 0, isOpen: false });
		return false;
	}

	return state.isOpen;
}

/**
 * Record a successful extraction for a provider
 */
function recordSuccess(providerId: StreamingProviderId): void {
	circuitBreakers.set(providerId, { failures: 0, isOpen: false });

	const timer = resetTimers.get(providerId);
	if (timer) {
		clearTimeout(timer);
		resetTimers.delete(providerId);
	}
}

/**
 * Record a failed extraction for a provider
 */
function recordFailure(providerId: StreamingProviderId): void {
	const state = circuitBreakers.get(providerId) ?? { failures: 0, isOpen: false };
	const failures = state.failures + 1;

	const isOpen = failures >= MAX_CONSECUTIVE_FAILURES;
	const resetAt = isOpen ? Date.now() + CIRCUIT_BREAKER_RESET_MS : undefined;

	circuitBreakers.set(providerId, { failures, isOpen, resetAt });

	if (isOpen) {
		logger.warn('Circuit breaker opened', {
			provider: providerId,
			failures,
			resetMs: CIRCUIT_BREAKER_RESET_MS,
			...streamLog
		});
	}

	// Schedule reset
	const existingTimer = resetTimers.get(providerId);
	if (existingTimer) {
		clearTimeout(existingTimer);
	}

	const timer = setTimeout(() => {
		circuitBreakers.set(providerId, { failures: 0, isOpen: false });
		resetTimers.delete(providerId);
		logger.debug('Circuit breaker reset', { provider: providerId, ...streamLog });
	}, CIRCUIT_BREAKER_RESET_MS);

	resetTimers.set(providerId, timer);
}

// ============================================================================
// Result Conversion
// ============================================================================

/**
 * Convert StreamResult to StreamSource (backward compatibility)
 */
function toStreamSource(result: StreamResult, _providerId: StreamingProviderId): StreamSource {
	return {
		quality: result.quality,
		title: result.title,
		url: result.url,
		type: result.streamType === 'mp4' ? 'hls' : result.streamType, // Normalize to hls/m3u8
		referer: result.referer,
		requiresSegmentProxy: true, // Always proxy for safety
		status: 'working',
		server: result.server,
		subtitles: result.subtitles,
		headers: result.headers
	};
}

/**
 * Convert ProviderResult to ExtractionResult (backward compatibility)
 */
function toExtractionResult(result: ProviderResult): ExtractionResult {
	return {
		success: result.success,
		sources: result.streams.map((s) => toStreamSource(s, result.provider)),
		error: result.error,
		provider: result.provider
	};
}

// ============================================================================
// Extraction Logic
// ============================================================================

/**
 * Get enabled providers in priority order
 * TODO: Integrate with settings system
 */
async function getEnabledProviders(): Promise<StreamingProviderId[]> {
	// For now, return default order
	// This will be connected to settings in the integration phase
	return DEFAULT_PROVIDER_ORDER.filter((id) => {
		const provider = getProvider(id);
		return provider?.config.enabledByDefault ?? false;
	});
}

/**
 * Internal extraction logic with provider fallback
 */
async function doExtraction(options: ExtractOptions): Promise<ExtractionResult> {
	initializeProviders();

	const enabledProviders = await getEnabledProviders();

	if (enabledProviders.length === 0) {
		return {
			success: false,
			sources: [],
			error: 'No streaming providers enabled. Enable at least one provider in settings.'
		};
	}

	// If specific provider requested, use only that one
	if (options.provider) {
		const provider = getProvider(options.provider);
		if (!provider) {
			return {
				success: false,
				sources: [],
				error: `Unknown provider: ${options.provider}`
			};
		}

		if (!enabledProviders.includes(options.provider)) {
			return {
				success: false,
				sources: [],
				error: `Provider ${options.provider} is not enabled`
			};
		}

		const result = await provider.extract(options);
		if (result.success && result.streams.length > 0) {
			recordSuccess(options.provider);
		} else {
			recordFailure(options.provider);
		}

		return toExtractionResult(result);
	}

	// Try providers in order with fallback
	const errors: string[] = [];
	const skippedProviders: StreamingProviderId[] = [];
	const unsupportedProviders: StreamingProviderId[] = [];

	for (const providerId of enabledProviders) {
		const provider = getProvider(providerId);
		if (!provider) continue;

		// Check content type support
		if (!provider.canHandle(options)) {
			unsupportedProviders.push(providerId);
			continue;
		}

		// Check circuit breaker
		if (isCircuitOpen(providerId)) {
			logger.debug('Skipping provider - circuit open', { provider: providerId, ...streamLog });
			skippedProviders.push(providerId);
			continue;
		}

		logger.debug('Trying provider', { provider: providerId, ...streamLog });

		const result = await provider.extract(options);

		if (result.success && result.streams.length > 0) {
			logger.debug('Provider succeeded', {
				provider: providerId,
				streamCount: result.streams.length,
				...streamLog
			});
			recordSuccess(providerId);
			return toExtractionResult(result);
		}

		recordFailure(providerId);
		if (result.error) {
			errors.push(`${providerId}: ${result.error}`);
		}

		logger.debug('Provider failed, trying next', {
			provider: providerId,
			error: result.error,
			...streamLog
		});
	}

	// Build comprehensive error message
	const errorDetails = errors.length > 0 ? errors.join('; ') : 'No providers available';
	const skippedNote =
		skippedProviders.length > 0 ? ` (circuit-broken: ${skippedProviders.join(', ')})` : '';
	const unsupportedNote =
		unsupportedProviders.length > 0 ? ` (unsupported: ${unsupportedProviders.join(', ')})` : '';

	return {
		success: false,
		sources: [],
		error: `All providers failed: ${errorDetails}${skippedNote}${unsupportedNote}`
	};
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Extract streams for the given content
 *
 * Features:
 * - Request deduplication (concurrent requests for same content share result)
 * - Result caching (30 second TTL)
 * - Circuit breaker (opens after 3 failures, resets after 60s)
 * - Provider fallback (tries providers in priority order)
 */
export async function extractStreams(options: ExtractOptions): Promise<ExtractionResult> {
	const cacheKey = getCacheKey(options);

	// Check result cache first
	const cached = resultCache.get(cacheKey);
	if (cached && cached.expiry > Date.now()) {
		logger.debug('Returning cached extraction result', { cacheKey, ...streamLog });
		return cached.result;
	}

	// Check for pending request (deduplication)
	const pending = pendingRequests.get(cacheKey);
	if (pending) {
		logger.debug('Reusing pending extraction request', { cacheKey, ...streamLog });
		return pending;
	}

	// Create extraction promise
	const extractionPromise = doExtraction(options);

	// Store in pending requests
	pendingRequests.set(cacheKey, extractionPromise);

	try {
		const result = await extractionPromise;

		// Cache the result
		resultCache.set(cacheKey, {
			result,
			expiry: Date.now() + RESULT_CACHE_TTL_MS
		});

		return result;
	} finally {
		// Clean up pending request
		pendingRequests.delete(cacheKey);
	}
}

/**
 * Get list of all available providers
 */
export function getAvailableProviders(): IStreamProvider[] {
	return getAllProviders();
}

/**
 * Get provider by ID
 */
export function getProviderById(id: StreamingProviderId): IStreamProvider | undefined {
	return getProvider(id);
}

/**
 * Clear all caches (useful for testing)
 */
export function clearCaches(): void {
	resultCache.clear();
	pendingRequests.clear();
	circuitBreakers.clear();
	for (const timer of resetTimers.values()) {
		clearTimeout(timer);
	}
	resetTimers.clear();
}

// Re-export types
export type { StreamingProviderId, ExtractOptions, ProviderResult, StreamResult } from './types';
export { BaseProvider } from './base';
