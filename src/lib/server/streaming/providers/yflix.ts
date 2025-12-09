/**
 * YFlix Provider (also works with 1Movies)
 *
 * Multi-step extraction similar to AnimeKai.
 *
 * Pattern: Lookup content ID → Encrypt → Fetch episodes → Parse HTML → Encrypt → Fetch servers → Parse HTML → Encrypt → Fetch embed → Decrypt
 */

import { logger } from '$lib/logging';
import { contentIdLookupService } from '../lookup';
import type { LookupMediaType } from '../lookup/types';
import { BaseProvider } from './base';
import type { ProviderConfig, SearchParams, StreamResult } from './types';

const streamLog = { logCategory: 'streams' as const };

// ============================================================================
// Constants
// ============================================================================

const YFLIX_AJAX = 'https://yflix.to/ajax';

// ============================================================================
// Response Types
// ============================================================================

interface YFlixApiResponse {
	result: string;
	status?: boolean;
}

type ParsedHtml = Record<string, Record<string, Record<string, string>>>;

// ============================================================================
// Provider Implementation
// ============================================================================

export class YFlixProvider extends BaseProvider {
	readonly config: ProviderConfig = {
		id: 'yflix',
		name: 'YFlix',
		priority: 60,
		enabledByDefault: false, // Requires content ID lookup - enable when needed
		supportsMovies: true,
		supportsTv: true,
		supportsAnime: false,
		supportsAsianDrama: false,
		requiresProxy: true,
		referer: 'https://yflix.to/',
		timeout: 20000
	};

	protected async doExtract(params: SearchParams): Promise<StreamResult[]> {
		// Step 1: Look up YFlix content ID from TMDB metadata
		if (!params.title) {
			logger.debug('YFlix extraction - no title provided', {
				tmdbId: params.tmdbId,
				...streamLog
			});
			return [];
		}

		const lookupResult = await contentIdLookupService.lookup('yflix', {
			tmdbId: params.tmdbId,
			type: params.type as LookupMediaType,
			title: params.title,
			year: params.year,
			season: params.season,
			episode: params.episode,
			alternativeTitles: params.alternativeTitles
		});

		if (!lookupResult.success || !lookupResult.contentId) {
			logger.debug('YFlix content ID lookup failed', {
				tmdbId: params.tmdbId,
				title: params.title,
				error: lookupResult.error,
				...streamLog
			});
			return [];
		}

		logger.debug('YFlix content ID resolved', {
			tmdbId: params.tmdbId,
			contentId: lookupResult.contentId,
			cached: lookupResult.cached,
			durationMs: lookupResult.durationMs,
			...streamLog
		});

		// Step 2: Extract streams using the resolved content ID
		return this.extractWithContentId(lookupResult.contentId, params);
	}

	/**
	 * Extract streams using YFlix content ID
	 */
	private async extractWithContentId(
		contentId: string,
		params: SearchParams
	): Promise<StreamResult[]> {
		// Step 1: Get episodes list
		const encId = await this.encDec.encrypt('movies-flix', contentId);
		const episodesResp = await this.fetchGet<YFlixApiResponse>(
			`${YFLIX_AJAX}/episodes/list?id=${contentId}&_=${encId}`
		);

		// Step 2: Parse HTML to get episode ID
		const episodes = await this.encDec.parseHtml<ParsedHtml>(episodesResp.result);

		// For TV: navigate to specific episode
		// For movies: use first entry
		const season = params.season?.toString() ?? '1';
		const episode = params.episode?.toString() ?? '1';
		const eid = episodes[season]?.[episode]?.eid;

		if (!eid) {
			logger.debug('No episode ID found in YFlix', streamLog);
			return [];
		}

		// Step 3: Get servers list
		const encEid = await this.encDec.encrypt('movies-flix', eid);
		const serversResp = await this.fetchGet<YFlixApiResponse>(
			`${YFLIX_AJAX}/links/list?eid=${eid}&_=${encEid}`
		);

		// Step 4: Parse HTML to get server ID
		const servers = await this.encDec.parseHtml<ParsedHtml>(serversResp.result);

		// Get first available server
		const lid = servers['default']?.['1']?.lid;

		if (!lid) {
			logger.debug('No server ID found in YFlix', streamLog);
			return [];
		}

		// Step 5: Get embed
		const encLid = await this.encDec.encrypt('movies-flix', lid);
		const embedResp = await this.fetchGet<YFlixApiResponse>(
			`${YFLIX_AJAX}/links/view?id=${lid}&_=${encLid}`
		);

		// Step 6: Decrypt
		const decrypted = await this.encDec.decrypt<string>('movies-flix', {
			text: embedResp.result
		});

		if (!this.isValidStreamUrl(decrypted)) {
			return [];
		}

		return [
			this.createStreamResult(decrypted, {
				quality: 'Auto',
				title: 'YFlix Stream'
			})
		];
	}
}
