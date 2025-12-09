/**
 * Smashystream Provider (Vidstack)
 *
 * Has two types of decryption:
 * - Type 1: smashystream (videosmashyi)
 * - Type 2: videofsh, short2embed, videoophim
 *
 * Pattern: Get token → Fetch player data → Fetch stream → Decrypt
 */

import { logger } from '$lib/logging';
import { BaseProvider } from './base';
import type { ProviderConfig, SearchParams, StreamResult } from './types';

const streamLog = { logCategory: 'streams' as const };

// ============================================================================
// Configuration
// ============================================================================

interface SmashyServer {
	id: string;
	name: string;
	type: '1' | '2';
	movieOnly?: boolean;
}

const SMASHY_SERVERS: SmashyServer[] = [
	{ id: 'videosmashyi', name: 'Player SY', type: '1' },
	// Type 2 servers only work for movies - they return 404 for TV content
	{ id: 'videofsh', name: 'Player FS', type: '2', movieOnly: true },
	{ id: 'short2embed', name: 'Player SM', type: '2', movieOnly: true },
	{ id: 'videoophim', name: 'Player O', type: '2', movieOnly: true }
];

// ============================================================================
// Response Types
// ============================================================================

interface SmashyPlayerResponse {
	data: string | SmashyType2Data;
	status?: boolean;
}

interface SmashyType1DecryptedData {
	source?: string;
	cf?: string;
	player?: Record<string, unknown>;
	swarmId?: string;
}

interface SmashyType2Data {
	sources: Array<{
		file: string;
		type?: string;
	}>;
	tracks?: string;
}

// ============================================================================
// Provider Implementation
// ============================================================================

export class SmashyProvider extends BaseProvider {
	readonly config: ProviderConfig = {
		id: 'smashy',
		name: 'Smashystream',
		priority: 40,
		enabledByDefault: true,
		supportsMovies: true,
		supportsTv: true,
		supportsAnime: false,
		supportsAsianDrama: false,
		requiresProxy: true,
		referer: 'https://smashystream.top/',
		timeout: 15000
	};

	protected async doExtract(params: SearchParams): Promise<StreamResult[]> {
		// Get token
		const tokenData = await this.encDec.getVidstackToken();

		const results: StreamResult[] = [];

		// Filter servers based on content type (Type 2 servers only work for movies)
		const availableServers = SMASHY_SERVERS.filter((server) => {
			if (server.movieOnly && params.type === 'tv') return false;
			return true;
		});

		// Try each server
		for (const server of availableServers) {
			try {
				const stream = await this.extractFromServer(server, params, tokenData);
				if (stream) {
					results.push(stream);
					if (results.length >= 2) break;
				}
			} catch (error) {
				logger.debug('Smashy server failed', {
					server: server.id,
					error: error instanceof Error ? error.message : String(error),
					...streamLog
				});
			}
		}

		return results;
	}

	private async extractFromServer(
		server: SmashyServer,
		params: SearchParams,
		tokenData: { token: string; user_id: string }
	): Promise<StreamResult | null> {
		// Build player URL
		let playerUrl = `https://api.smashystream.top/api/v1/${server.id}/`;

		if (params.type === 'movie') {
			// Type 1 servers (videosmashyi) use IMDB ID
			// Type 2 servers (videofsh, short2embed, videoophim) use TMDB ID
			const id = server.type === '1' ? (params.imdbId ?? params.tmdbId) : params.tmdbId;
			playerUrl += `${id}?token=${tokenData.token}&user_id=${tokenData.user_id}`;
		} else {
			// TV format: /{imdb_id}/{tmdb_id}/{season}/{episode}
			// Use IMDB if available, otherwise TMDB for first slot (fallback)
			const imdbSlot = params.imdbId ?? params.tmdbId;
			playerUrl += `${imdbSlot}/${params.tmdbId}/${params.season}/${params.episode}?token=${tokenData.token}&user_id=${tokenData.user_id}`;
		}

		// Fetch player data
		const playerResponse = await this.fetchGet<SmashyPlayerResponse>(playerUrl);

		if (!playerResponse.data) {
			return null;
		}

		// Handle based on type with runtime validation
		if (server.type === '1') {
			// Type 1 expects data to be a string in "host/#id" format
			if (typeof playerResponse.data !== 'string') {
				logger.debug('Unexpected data type for type 1 server - expected string', {
					server: server.id,
					actualType: typeof playerResponse.data,
					...streamLog
				});
				return null;
			}
			return this.handleType1(server, playerResponse.data);
		} else {
			// Type 2 expects data to be an object with sources array
			if (
				typeof playerResponse.data !== 'object' ||
				playerResponse.data === null ||
				!('sources' in playerResponse.data)
			) {
				logger.debug('Unexpected data type for type 2 server - expected object with sources', {
					server: server.id,
					actualType: typeof playerResponse.data,
					...streamLog
				});
				return null;
			}
			return this.handleType2(server, playerResponse.data as SmashyType2Data);
		}
	}

	private async handleType1(server: SmashyServer, data: string): Promise<StreamResult | null> {
		// Type 1: data is "host/#id" format
		if (!data.includes('/#')) {
			return null;
		}

		const [host, id] = data.split('/#');

		// Fetch encrypted stream data
		const streamUrl = `${host}/api/v1/video?id=${id}`;
		const encrypted = await this.fetchGet<string>(streamUrl, { responseType: 'text' });

		if (!encrypted || encrypted.length < 10) {
			return null;
		}

		// Decrypt - Type 1 returns an object with source/cf URLs
		const decrypted = await this.encDec.decryptVidstack<SmashyType1DecryptedData>({
			text: encrypted,
			type: '1'
		});

		// Extract stream URL from decrypted object
		const extractedUrl = decrypted.source || decrypted.cf;
		if (!this.isValidStreamUrl(extractedUrl)) {
			return null;
		}

		return this.createStreamResult(extractedUrl, {
			quality: 'Auto',
			title: `Smashystream - ${server.name}`,
			server: server.name
		});
	}

	private async handleType2(
		server: SmashyServer,
		data: SmashyType2Data
	): Promise<StreamResult | null> {
		// Type 2: data has sources array with encrypted file
		const file = data.sources?.[0]?.file;
		if (!file) {
			return null;
		}

		// Decrypt file URL
		const decrypted = await this.encDec.decryptVidstack<string>({
			text: file,
			type: '2'
		});

		// Parse the list format "[quality]url, [quality]url"
		const streamUrl = this.parseListFormat(decrypted);

		if (!this.isValidStreamUrl(streamUrl)) {
			return null;
		}

		// Parse subtitles if available
		const subtitles = data.tracks ? this.parseSubtitlesList(data.tracks) : undefined;

		return this.createStreamResult(streamUrl, {
			quality: 'Auto',
			title: `Smashystream - ${server.name}`,
			server: server.name,
			subtitles
		});
	}

	private parseListFormat(text: string): string | null {
		// Format: "[quality]url, [quality]url" or just "url"
		const items = text.split(',').map((s) => s.trim());

		for (const item of items) {
			if (item.startsWith('[') && item.includes(']')) {
				const url = item.split(']')[1]?.trim();
				if (url && url.startsWith('http')) {
					return url;
				}
			} else if (item.startsWith('http')) {
				return item;
			}
		}

		return items.find((i) => i.startsWith('http')) ?? null;
	}

	private parseSubtitlesList(tracks: string): StreamResult['subtitles'] {
		const items = tracks.split(',').map((s) => s.trim());
		const subtitles: StreamResult['subtitles'] = [];

		for (const item of items) {
			if (item.startsWith('[') && item.includes(']')) {
				const [label, url] = item.substring(1).split(']');
				if (url && label) {
					subtitles.push({
						url: url.trim(),
						label: label.trim(),
						language: this.extractLanguageCode(label)
					});
				}
			}
		}

		return subtitles.length > 0 ? subtitles : undefined;
	}

	private extractLanguageCode(label: string): string {
		const labelLower = label.toLowerCase();
		if (labelLower.includes('english')) return 'en';
		if (labelLower.includes('spanish')) return 'es';
		if (labelLower.includes('french')) return 'fr';
		if (labelLower.includes('german')) return 'de';
		return 'en';
	}
}
