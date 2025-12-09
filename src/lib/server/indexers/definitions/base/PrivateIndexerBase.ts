/**
 * Base class for private torrent indexers.
 * Private indexers require authentication via cookies or API keys.
 */

import { IndexerBase, type NativeIndexerConfig, type SearchRequest } from './IndexerBase';
import type { IndexerAccessType } from '../../core/types';

/** Authentication method types */
export type AuthMethod = 'cookie' | 'apikey' | 'form' | 'passkey';

/** Private indexer settings */
export interface PrivateIndexerSettings {
	/** Cookie string for authentication */
	cookie?: string;
	/** API key for authentication */
	apikey?: string;
	/** Passkey for download URLs */
	passkey?: string;
	/** Username for form auth */
	username?: string;
	/** Password for form auth */
	password?: string;
}

/**
 * Base class for private torrent indexers.
 * Handles cookie-based and API key authentication.
 */
export abstract class PrivateIndexerBase extends IndexerBase {
	/** Authentication method used by this indexer */
	protected abstract readonly authMethod: AuthMethod;

	/** Get settings from config */
	protected get settings(): PrivateIndexerSettings {
		return this.config.settings as PrivateIndexerSettings;
	}

	protected override getAccessType(): IndexerAccessType {
		return 'private';
	}

	constructor(indexerConfig: NativeIndexerConfig) {
		super(indexerConfig);

		// Initialize cookies from settings
		if (this.settings.cookie) {
			this.parseCookieString(this.settings.cookie);
		}
	}

	/** Parse cookie header string into cookie object */
	protected parseCookieString(cookieStr: string): void {
		const cookies: Record<string, string> = {};
		for (const part of cookieStr.split(';')) {
			const [key, value] = part.trim().split('=');
			if (key && value) {
				cookies[key] = value;
			}
		}
		this.setCookies(cookies);
	}

	/**
	 * Check if login is needed based on response.
	 * Subclasses can override with specific logic.
	 */
	protected checkLoginNeeded(html: string): boolean {
		// Common patterns indicating login is needed
		const loginPatterns = [
			'login',
			'sign in',
			'log in',
			'not logged in',
			'session expired',
			'access denied'
		];

		const lowerHtml = html.toLowerCase();
		return loginPatterns.some((pattern) => lowerHtml.includes(pattern));
	}

	/**
	 * Perform login. Subclasses must implement for form-based auth.
	 */
	protected async login(): Promise<void> {
		if (this.authMethod !== 'form') {
			throw new Error('Login not supported for this auth method');
		}
		throw new Error('Login not implemented');
	}

	/**
	 * Add authentication to a request.
	 */
	protected addAuth(request: SearchRequest): SearchRequest {
		const headers = { ...request.headers };

		switch (this.authMethod) {
			case 'apikey':
				// API key is usually added to URL, not headers
				break;
			case 'cookie':
				// Cookies are managed by http client
				break;
			case 'passkey':
				// Passkey is added to download URLs
				break;
		}

		return { ...request, headers };
	}

	/**
	 * Add passkey to URL if configured.
	 */
	protected addPasskeyToUrl(url: string): string {
		if (!this.settings.passkey) return url;

		const urlObj = new URL(url);
		urlObj.searchParams.set('passkey', this.settings.passkey);
		return urlObj.toString();
	}

	/**
	 * Add API key to URL if configured.
	 */
	protected addApiKeyToUrl(url: string, paramName = 'apikey'): string {
		if (!this.settings.apikey) return url;

		const urlObj = new URL(url);
		urlObj.searchParams.set(paramName, this.settings.apikey);
		return urlObj.toString();
	}

	/**
	 * Override to validate authentication in test response.
	 */
	protected override validateTestResponse(html: string): boolean {
		// Check for common auth failure patterns
		if (this.checkLoginNeeded(html)) {
			throw new Error('Authentication failed - login required');
		}
		return html.length > 100;
	}

	/**
	 * Override download to add authentication.
	 */
	override async getDownloadUrl(
		release: import('../../core/releaseResult').ReleaseResult
	): Promise<string> {
		let url = await super.getDownloadUrl(release);

		// Add passkey if needed
		if (this.authMethod === 'passkey' || this.settings.passkey) {
			url = this.addPasskeyToUrl(url);
		}

		// Add API key if needed
		if (this.authMethod === 'apikey' || this.settings.apikey) {
			url = this.addApiKeyToUrl(url);
		}

		return url;
	}
}

/**
 * Base class for semi-private indexers.
 * These may require registration but not invite.
 */
export abstract class SemiPrivateIndexerBase extends PrivateIndexerBase {
	protected override getAccessType(): IndexerAccessType {
		return 'semi-private';
	}
}
