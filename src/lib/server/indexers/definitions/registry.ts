/**
 * Native TypeScript Indexer Registry
 *
 * Provides a registry of all native TypeScript indexer implementations.
 * These are separate from Cardigann YAML definitions and offer better
 * type safety and maintainability.
 */

import type { IIndexer, IndexerConfig } from '../core/interfaces';
import type { NativeIndexerConfig } from './base/IndexerBase';

// Import all native indexers
import {
	createAnidexIndexer,
	ANIDEX_DEFINITION_ID,
	createSubsPleaseIndexer,
	SUBSPLEASE_DEFINITION_ID,
	createTorrentsCSVIndexer,
	TORRENTSCSV_DEFINITION_ID,
	createKnabenIndexer,
	KNABEN_DEFINITION_ID
} from './public';

import {
	createIPTorrentsIndexer,
	IPTORRENTS_DEFINITION_ID,
	createTorrentDayIndexer,
	TORRENTDAY_DEFINITION_ID,
	createSceneTimeIndexer,
	SCENETIME_DEFINITION_ID,
	createBeyondHDIndexer,
	BEYONDHD_DEFINITION_ID,
	createSpeedCDIndexer,
	SPEEDCD_DEFINITION_ID,
	createOldToonsWorldIndexer,
	OLDTOONSWORLD_DEFINITION_ID,
	createAitherIndexer,
	AITHER_DEFINITION_ID
} from './private';

import { createCinephageStreamIndexer, CINEPHAGE_STREAM_DEFINITION_ID } from './streaming';

/** Factory function type for creating indexers */
export type IndexerFactory = (config: NativeIndexerConfig) => IIndexer;

/** Setting field definition for UI */
export interface NativeIndexerSetting {
	name: string;
	type: 'text' | 'password' | 'checkbox' | 'number' | 'select';
	label: string;
	required?: boolean;
	default?: string;
	placeholder?: string;
	helpText?: string;
	options?: Record<string, string>;
}

/** Indexer definition metadata */
export interface NativeIndexerDefinition {
	id: string;
	name: string;
	description: string;
	type: 'public' | 'semi-private' | 'private';
	/** Protocol: torrent, usenet, or streaming */
	protocol: 'torrent' | 'usenet' | 'streaming';
	/** Primary site URL */
	siteUrl: string;
	/** Alternate/mirror URLs */
	alternateUrls?: string[];
	/** Settings fields required by this indexer */
	settings: NativeIndexerSetting[];
	factory: IndexerFactory;
	/** If true, this indexer is auto-managed and shouldn't appear in "Add Indexer" list */
	internal?: boolean;
}

/** All native indexer definitions */
const nativeIndexers: NativeIndexerDefinition[] = [
	// Public indexers (no auth required)
	{
		id: ANIDEX_DEFINITION_ID,
		name: 'Anidex',
		description: 'Public anime torrent tracker',
		type: 'public',
		protocol: 'torrent',
		siteUrl: 'https://anidex.info/',
		settings: [],
		factory: createAnidexIndexer
	},
	{
		id: SUBSPLEASE_DEFINITION_ID,
		name: 'SubsPlease',
		description: 'Public anime indexer - HorribleSubs/Erai replacement',
		type: 'public',
		protocol: 'torrent',
		siteUrl: 'https://subsplease.org/',
		settings: [],
		factory: createSubsPleaseIndexer
	},
	{
		id: TORRENTSCSV_DEFINITION_ID,
		name: 'TorrentsCSV',
		description: 'Self-hostable open source torrent search engine',
		type: 'public',
		protocol: 'torrent',
		siteUrl: 'https://torrents-csv.com/',
		settings: [],
		factory: createTorrentsCSVIndexer
	},
	{
		id: KNABEN_DEFINITION_ID,
		name: 'Knaben',
		description: 'Public torrent meta-search engine',
		type: 'public',
		protocol: 'torrent',
		siteUrl: 'https://knaben.eu/',
		settings: [],
		factory: createKnabenIndexer
	},

	// Private indexers (cookie auth)
	{
		id: IPTORRENTS_DEFINITION_ID,
		name: 'IPTorrents',
		description: 'Private tracker for 0DAY / GENERAL',
		type: 'private',
		protocol: 'torrent',
		siteUrl: 'https://iptorrents.com/',
		alternateUrls: ['https://iptorrents.me/', 'https://ipt.lol/', 'https://ipt.rocks/'],
		settings: [
			{
				name: 'cookie',
				type: 'password',
				label: 'Cookie',
				required: true,
				helpText: 'Login cookie from browser (F12 > Application > Cookies)'
			},
			{ name: 'freeleechOnly', type: 'checkbox', label: 'Freeleech Only', default: 'false' }
		],
		factory: createIPTorrentsIndexer
	},
	{
		id: TORRENTDAY_DEFINITION_ID,
		name: 'TorrentDay',
		description: 'Private tracker for TV / MOVIES / GENERAL',
		type: 'private',
		protocol: 'torrent',
		siteUrl: 'https://torrentday.com/',
		alternateUrls: ['https://tday.love/', 'https://torrentday.cool/'],
		settings: [
			{
				name: 'cookie',
				type: 'password',
				label: 'Cookie',
				required: true,
				helpText: 'Login cookie from browser'
			},
			{ name: 'freeleechOnly', type: 'checkbox', label: 'Freeleech Only', default: 'false' }
		],
		factory: createTorrentDayIndexer
	},
	{
		id: SCENETIME_DEFINITION_ID,
		name: 'SceneTime',
		description: 'Private general tracker - Always on time',
		type: 'private',
		protocol: 'torrent',
		siteUrl: 'https://www.scenetime.com/',
		settings: [
			{
				name: 'cookie',
				type: 'password',
				label: 'Cookie',
				required: true,
				helpText: 'Login cookie from browser'
			},
			{ name: 'freeleechOnly', type: 'checkbox', label: 'Freeleech Only', default: 'false' }
		],
		factory: createSceneTimeIndexer
	},
	{
		id: SPEEDCD_DEFINITION_ID,
		name: 'SpeedCD',
		description: 'Private general tracker - Your home now!',
		type: 'private',
		protocol: 'torrent',
		siteUrl: 'https://speed.cd/',
		alternateUrls: ['https://speed.click/', 'https://speeders.me/'],
		settings: [
			{
				name: 'cookie',
				type: 'password',
				label: 'Cookie',
				required: true,
				helpText: 'Login cookie from browser'
			},
			{ name: 'freeleechOnly', type: 'checkbox', label: 'Freeleech Only', default: 'false' },
			{
				name: 'excludeArchives',
				type: 'checkbox',
				label: 'Exclude Archives (RAR)',
				default: 'false'
			}
		],
		factory: createSpeedCDIndexer
	},

	// Private indexers (API key auth)
	{
		id: BEYONDHD_DEFINITION_ID,
		name: 'BeyondHD',
		description: 'Private HD tracker - Movies and TV',
		type: 'private',
		protocol: 'torrent',
		siteUrl: 'https://beyond-hd.me/',
		settings: [
			{
				name: 'apiKey',
				type: 'password',
				label: 'API Key',
				required: true,
				helpText: '32-character API key from your profile settings'
			},
			{
				name: 'rssKey',
				type: 'password',
				label: 'RSS Key',
				required: true,
				helpText: '32-character RSS key from your profile settings'
			},
			{ name: 'freeleechOnly', type: 'checkbox', label: 'Freeleech Only', default: 'false' },
			{ name: 'limitedOnly', type: 'checkbox', label: 'Limited Only', default: 'false' }
		],
		factory: createBeyondHDIndexer
	},

	// Unit3D-based indexers (API key auth via /api/torrents/filter)
	{
		id: OLDTOONSWORLD_DEFINITION_ID,
		name: 'OldToonsWorld',
		description: 'Private tracker for cartoons, animations, and classic TV shows (Unit3D)',
		type: 'private',
		protocol: 'torrent',
		siteUrl: 'https://oldtoons.world/',
		settings: [
			{
				name: 'apiKey',
				type: 'password',
				label: 'API Key',
				required: true,
				helpText: 'API key from Settings > Security > API Key'
			},
			{ name: 'freeleechOnly', type: 'checkbox', label: 'Freeleech Only', default: 'false' },
			{ name: 'doubleUploadOnly', type: 'checkbox', label: 'Double Upload Only', default: 'false' }
		],
		factory: createOldToonsWorldIndexer
	},
	{
		id: AITHER_DEFINITION_ID,
		name: 'Aither',
		description: 'Private HD tracker (Unit3D)',
		type: 'private',
		protocol: 'torrent',
		siteUrl: 'https://aither.cc/',
		settings: [
			{
				name: 'apiKey',
				type: 'password',
				label: 'API Key',
				required: true,
				helpText: 'API key from Settings > Security > API Key'
			},
			{ name: 'freeleechOnly', type: 'checkbox', label: 'Freeleech Only', default: 'false' },
			{ name: 'doubleUploadOnly', type: 'checkbox', label: 'Double Upload Only', default: 'false' }
		],
		factory: createAitherIndexer
	},

	// Streaming indexer (configurable like other indexers)
	{
		id: CINEPHAGE_STREAM_DEFINITION_ID,
		name: 'Cinephage Stream',
		description:
			'Streaming provider - creates .strm files for instant playback via enc-dec.app providers',
		type: 'public',
		protocol: 'streaming',
		siteUrl: 'http://localhost/',
		settings: [
			{
				name: 'baseUrl',
				type: 'text',
				label: 'Base URL',
				required: false,
				placeholder: 'https://your-domain.com:5173',
				helpText:
					'External URL for accessing Cinephage (used in .strm files). Leave empty to auto-detect from request headers or use PUBLIC_BASE_URL env var.'
			},
			{
				name: 'enabledProviders',
				type: 'text',
				label: 'Enabled Providers',
				required: false,
				placeholder: 'videasy,vidlink,xprime,smashy,hexa',
				helpText:
					'Comma-separated list of providers to enable. Leave empty to use individual toggles below.'
			},
			// Primary providers (enabled by default)
			{
				name: 'enableVideasy',
				type: 'checkbox',
				label: 'Videasy',
				default: 'true',
				helpText: 'Multi-server provider with 15 servers and multi-language support'
			},
			{
				name: 'enableVidlink',
				type: 'checkbox',
				label: 'Vidlink',
				default: 'true',
				helpText: 'Simple and fast streaming provider'
			},
			{
				name: 'enableXprime',
				type: 'checkbox',
				label: 'XPrime',
				default: 'true',
				helpText: 'High quality streams with turnstile protection'
			},
			{
				name: 'enableSmashy',
				type: 'checkbox',
				label: 'Smashystream',
				default: 'true',
				helpText: 'Multiple player types with subtitle support'
			},
			{
				name: 'enableHexa',
				type: 'checkbox',
				label: 'Hexa',
				default: 'true',
				helpText: 'Fast provider with API key encryption'
			},
			// Secondary providers (disabled by default - require content ID lookup)
			{
				name: 'enableYflix',
				type: 'checkbox',
				label: 'YFlix',
				default: 'false',
				helpText: 'Requires content ID lookup (1Movies compatible)'
			},
			{
				name: 'enableMapple',
				type: 'checkbox',
				label: 'Mapple',
				default: 'false',
				helpText: 'Session-based provider with 4K support'
			},
			{
				name: 'enableOnetouchtv',
				type: 'checkbox',
				label: 'OneTouchTV',
				default: 'false',
				helpText: 'TV shows only - requires content ID lookup'
			},
			{
				name: 'enableAnimekai',
				type: 'checkbox',
				label: 'AnimeKai',
				default: 'false',
				helpText: 'Anime only - limited (use Videasy/Vidlink for anime via IMDB)'
			},
			{
				name: 'enableKisskh',
				type: 'checkbox',
				label: 'KissKH',
				default: 'false',
				helpText: 'Asian dramas - requires content ID lookup'
			}
		],
		factory: createCinephageStreamIndexer
	}
];

/** Registry of native indexer definitions indexed by ID */
const indexerRegistry = new Map<string, NativeIndexerDefinition>(
	nativeIndexers.map((def) => [def.id, def])
);

/**
 * Check if a definition ID is a native TypeScript indexer.
 */
export function isNativeIndexer(definitionId: string): boolean {
	return indexerRegistry.has(definitionId);
}

/**
 * Get a native indexer definition by ID.
 */
export function getNativeIndexerDefinition(
	definitionId: string
): NativeIndexerDefinition | undefined {
	return indexerRegistry.get(definitionId);
}

/**
 * Get all native indexer definitions.
 */
export function getAllNativeIndexerDefinitions(): NativeIndexerDefinition[] {
	return [...nativeIndexers];
}

/**
 * Create a native indexer instance from config.
 */
export function createNativeIndexer(config: IndexerConfig): IIndexer | null {
	const definition = indexerRegistry.get(config.definitionId);
	if (!definition) {
		return null;
	}

	return definition.factory({ config });
}

/**
 * Get native indexer IDs.
 */
export function getNativeIndexerIds(): string[] {
	return Array.from(indexerRegistry.keys());
}

// Re-export streaming indexer definition ID for use elsewhere
export { CINEPHAGE_STREAM_DEFINITION_ID };
