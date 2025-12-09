/**
 * Subtitle Provider Factory
 *
 * Creates provider instances from configuration.
 * Extensible design allows adding new providers easily.
 */

import type { ISubtitleProvider, ISubtitleProviderFactory, ProviderDefinition } from './interfaces';
import type { SubtitleProviderConfig, ProviderImplementation } from '../types';
import { OpenSubtitlesProvider } from './opensubtitles/OpenSubtitlesProvider';
import { PodnapisiProvider } from './podnapisi/PodnapisiProvider';
import { SubsceneProvider } from './subscene/SubsceneProvider';
import { Addic7edProvider } from './addic7ed/Addic7edProvider';
import { SubDLProvider } from './subdl/SubDLProvider';
import { YIFYSubtitlesProvider } from './yifysubtitles/YIFYSubtitlesProvider';
import { GestdownProvider } from './gestdown/GestdownProvider';
import { Subf2mProvider } from './subf2m/Subf2mProvider';
import { OPENSUBTITLES_LANGUAGES } from './opensubtitles/types';
import { SUBDL_LANGUAGES } from './subdl/types';

/** Provider constructor type */
type ProviderConstructor = new (config: SubtitleProviderConfig) => ISubtitleProvider;

/** Registry of provider implementations */
const PROVIDER_REGISTRY = new Map<string, ProviderConstructor>();
PROVIDER_REGISTRY.set('opensubtitles', OpenSubtitlesProvider);
PROVIDER_REGISTRY.set('podnapisi', PodnapisiProvider);
PROVIDER_REGISTRY.set('subscene', SubsceneProvider);
PROVIDER_REGISTRY.set('addic7ed', Addic7edProvider);
PROVIDER_REGISTRY.set('subdl', SubDLProvider);
PROVIDER_REGISTRY.set('yifysubtitles', YIFYSubtitlesProvider);
PROVIDER_REGISTRY.set('gestdown', GestdownProvider);
PROVIDER_REGISTRY.set('subf2m', Subf2mProvider);

/** Provider definitions with metadata */
const PROVIDER_DEFINITIONS: Map<ProviderImplementation, ProviderDefinition> = new Map([
	[
		'opensubtitles',
		{
			implementation: 'opensubtitles',
			name: 'OpenSubtitles',
			description: 'The largest subtitle database with hash-matching support for accurate results.',
			website: 'https://www.opensubtitles.com',
			requiresApiKey: true,
			requiresCredentials: false,
			supportedLanguages: OPENSUBTITLES_LANGUAGES,
			supportsHashSearch: true,
			features: ['Hash matching', 'IMDB search', 'TMDB search', 'High accuracy'],
			settings: [
				{
					key: 'apiKey',
					label: 'API Key',
					type: 'string',
					required: true,
					description: 'Get your API key from opensubtitles.com'
				},
				{
					key: 'username',
					label: 'Username',
					type: 'string',
					required: false,
					description: 'Optional: For higher download limits'
				},
				{
					key: 'password',
					label: 'Password',
					type: 'string',
					required: false,
					description: 'Optional: Required if username is provided'
				}
			]
		}
	],
	[
		'podnapisi',
		{
			implementation: 'podnapisi',
			name: 'Podnapisi',
			description: 'Slovenian subtitle database with excellent European language coverage.',
			website: 'https://www.podnapisi.net',
			requiresApiKey: false,
			requiresCredentials: false,
			supportedLanguages: [
				'en',
				'sl',
				'hr',
				'sr',
				'bs',
				'mk',
				'bg',
				'cs',
				'sk',
				'pl',
				'hu',
				'ro',
				'de',
				'es',
				'fr',
				'it',
				'pt',
				'nl',
				'ru',
				'el',
				'tr',
				'ar',
				'he',
				'vi',
				'zh',
				'ja',
				'ko',
				'sv',
				'no',
				'da',
				'fi',
				'uk',
				'fa',
				'id',
				'th'
			],
			supportsHashSearch: false,
			features: ['European languages', 'No API key required', 'Good TV show coverage'],
			settings: []
		}
	],
	[
		'subscene',
		{
			implementation: 'subscene',
			name: 'Subscene',
			description: 'Large community-driven subtitle database with wide language support.',
			website: 'https://subscene.com',
			requiresApiKey: false,
			requiresCredentials: false,
			supportedLanguages: [
				'en',
				'es',
				'fr',
				'de',
				'it',
				'pt',
				'nl',
				'pl',
				'ru',
				'ar',
				'he',
				'tr',
				'el',
				'hu',
				'ro',
				'cs',
				'sv',
				'da',
				'fi',
				'no',
				'ja',
				'ko',
				'zh',
				'vi',
				'th',
				'id',
				'ms',
				'fa',
				'hi',
				'bn',
				'uk',
				'bg',
				'hr',
				'sr',
				'sk',
				'sl'
			],
			supportsHashSearch: false,
			features: ['Large catalog', 'Community translations', 'Multi-language'],
			settings: []
		}
	],
	[
		'addic7ed',
		{
			implementation: 'addic7ed',
			name: 'Addic7ed',
			description: 'Specialized TV show subtitle provider with high-quality translations.',
			website: 'https://www.addic7ed.com',
			requiresApiKey: false,
			requiresCredentials: false,
			supportedLanguages: [
				'en',
				'es',
				'fr',
				'de',
				'it',
				'pt',
				'nl',
				'pl',
				'ru',
				'ar',
				'he',
				'tr',
				'el',
				'hu',
				'ro',
				'cs',
				'sv',
				'da',
				'fi',
				'no',
				'ja',
				'ko',
				'zh',
				'vi',
				'bg',
				'hr',
				'sr',
				'sk',
				'sl',
				'uk',
				'ca',
				'eu'
			],
			supportsHashSearch: false,
			features: ['TV shows only', 'High quality', 'Quick releases'],
			settings: [
				{
					key: 'username',
					label: 'Username',
					type: 'string',
					required: false,
					description: 'Optional: For higher download limits'
				},
				{
					key: 'password',
					label: 'Password',
					type: 'string',
					required: false,
					description: 'Optional: Required if username is provided'
				}
			]
		}
	],
	[
		'subdl',
		{
			implementation: 'subdl',
			name: 'SubDL',
			description: 'Modern subtitle API with excellent coverage and 60+ languages.',
			website: 'https://subdl.com',
			requiresApiKey: true,
			requiresCredentials: false,
			supportedLanguages: Object.keys(SUBDL_LANGUAGES),
			supportsHashSearch: false,
			features: ['60+ languages', 'IMDB/TMDB search', 'Modern API', 'Fast'],
			settings: [
				{
					key: 'apiKey',
					label: 'API Key',
					type: 'string',
					required: true,
					description: 'Get your free API key from subdl.com/api'
				}
			]
		}
	],
	[
		'yifysubtitles',
		{
			implementation: 'yifysubtitles',
			name: 'YIFY Subtitles',
			description: 'Popular movie subtitle database, movies only (no TV shows).',
			website: 'https://yifysubtitles.ch',
			requiresApiKey: false,
			requiresCredentials: false,
			supportedLanguages: [
				'en',
				'es',
				'fr',
				'de',
				'it',
				'pt',
				'nl',
				'pl',
				'ru',
				'ar',
				'he',
				'tr',
				'el',
				'hu',
				'ro',
				'cs',
				'sv',
				'da',
				'fi',
				'no',
				'ja',
				'ko',
				'zh',
				'vi',
				'th',
				'id',
				'ms',
				'fa',
				'hi',
				'bn',
				'uk',
				'bg',
				'hr',
				'sr',
				'sk',
				'sl'
			],
			supportsHashSearch: false,
			features: ['Movies only', 'IMDB search', 'No API key required', 'Popular releases'],
			settings: []
		}
	],
	[
		'gestdown',
		{
			implementation: 'gestdown',
			name: 'Gestdown',
			description: 'TV show subtitle database, TV shows only (uses TVDB).',
			website: 'https://api.gestdown.info',
			requiresApiKey: false,
			requiresCredentials: false,
			supportedLanguages: [
				'en',
				'es',
				'fr',
				'de',
				'it',
				'pt',
				'nl',
				'pl',
				'ru',
				'ar',
				'he',
				'tr',
				'el',
				'hu',
				'ro',
				'cs',
				'sv',
				'da',
				'fi',
				'no',
				'ja',
				'ko',
				'zh',
				'vi',
				'th',
				'id',
				'fa',
				'hi',
				'uk',
				'bg',
				'hr',
				'sr',
				'sk',
				'sl'
			],
			supportsHashSearch: false,
			features: ['TV shows only', 'JSON API', 'No API key required', 'European languages'],
			settings: []
		}
	],
	[
		'subf2m',
		{
			implementation: 'subf2m',
			name: 'Subf2m',
			description: 'Large subtitle database with movies and TV shows.',
			website: 'https://subf2m.co',
			requiresApiKey: false,
			requiresCredentials: false,
			supportedLanguages: [
				'en',
				'es',
				'fr',
				'de',
				'it',
				'pt',
				'nl',
				'pl',
				'ru',
				'ar',
				'he',
				'tr',
				'el',
				'hu',
				'ro',
				'cs',
				'sv',
				'da',
				'fi',
				'no',
				'ja',
				'ko',
				'zh',
				'vi',
				'th',
				'id',
				'ms',
				'fa',
				'hi',
				'bn',
				'uk',
				'bg',
				'hr',
				'sr',
				'sk',
				'sl',
				'et',
				'lv',
				'lt',
				'mk',
				'bs',
				'sq',
				'is',
				'ml',
				'ta',
				'te',
				'ur',
				'ne',
				'si',
				'kn',
				'mr',
				'gu',
				'pa',
				'sw',
				'tl',
				'my'
			],
			supportsHashSearch: false,
			features: ['Large catalog', 'Movies & TV', 'No API key required', '50+ languages'],
			settings: []
		}
	]
]);

/**
 * Factory for creating subtitle provider instances
 */
export class SubtitleProviderFactory implements ISubtitleProviderFactory {
	/**
	 * Create a provider instance from configuration
	 */
	createProvider(config: SubtitleProviderConfig): ISubtitleProvider {
		const ProviderClass = PROVIDER_REGISTRY.get(config.implementation as ProviderImplementation);

		if (!ProviderClass) {
			throw new Error(`Unknown provider implementation: ${config.implementation}`);
		}

		return new ProviderClass(config);
	}

	/**
	 * Check if factory can handle this implementation type
	 */
	canHandle(implementation: string): boolean {
		return PROVIDER_REGISTRY.has(implementation as ProviderImplementation);
	}

	/**
	 * Get list of supported implementation types
	 */
	getSupportedImplementations(): string[] {
		return Array.from(PROVIDER_REGISTRY.keys());
	}

	/**
	 * Get all provider definitions with metadata
	 */
	getDefinitions(): ProviderDefinition[] {
		return Array.from(PROVIDER_DEFINITIONS.values());
	}

	/**
	 * Get a specific provider definition
	 */
	getDefinition(implementation: string): ProviderDefinition | undefined {
		return PROVIDER_DEFINITIONS.get(implementation as ProviderImplementation);
	}

	/**
	 * Register a new provider type (for extensibility)
	 */
	registerProvider(
		implementation: ProviderImplementation,
		ProviderClass: ProviderConstructor,
		definition: ProviderDefinition
	): void {
		PROVIDER_REGISTRY.set(implementation, ProviderClass);
		PROVIDER_DEFINITIONS.set(implementation, definition);
	}
}

/** Singleton factory instance */
let factoryInstance: SubtitleProviderFactory | null = null;

/**
 * Get the singleton factory instance
 */
export function getSubtitleProviderFactory(): SubtitleProviderFactory {
	if (!factoryInstance) {
		factoryInstance = new SubtitleProviderFactory();
	}
	return factoryInstance;
}
