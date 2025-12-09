/**
 * Base class for public torrent indexers.
 * Public indexers don't require authentication.
 */

import { IndexerBase } from './IndexerBase';
import type { IndexerAccessType } from '../../core/types';

/**
 * Base class for public torrent indexers.
 * Provides sensible defaults for public sites.
 */
export abstract class PublicIndexerBase extends IndexerBase {
	protected override getAccessType(): IndexerAccessType {
		return 'public';
	}

	/**
	 * Public indexers typically don't need special test validation.
	 */
	protected override validateTestResponse(html: string): boolean {
		// Check that we got a real page, not a Cloudflare challenge
		if (html.includes('cf-browser-verification') || html.includes('Just a moment...')) {
			throw new Error('Cloudflare protection detected');
		}
		return html.length > 100;
	}
}
