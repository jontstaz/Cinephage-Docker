/**
 * OldToonsWorld Indexer (Unit3D-based)
 *
 * Private torrent tracker focused on cartoons, animations, and classic TV shows.
 * Runs Unit3D software with standard API.
 *
 * OldToonsWorld (OTW) specializes in vintage cartoons, animated series,
 * classic TV shows, and related content from various eras.
 *
 * @see https://oldtoons.world/
 */

import {
	Unit3dBase,
	type Unit3dCategoryMapping,
	type IndexerMetadata,
	type NativeIndexerConfig
} from '../base';
import { NewznabCategory } from '../base/Categories';
import type { IndexerCapabilities } from '../../core/capabilities';

/** OldToonsWorld-specific settings (extends Unit3D settings) */
export interface OldToonsWorldSettings {
	/** API key for authentication */
	apiKey: string;
	/** Search freeleech only */
	freeleechOnly?: boolean;
	/** Search double upload only */
	doubleUploadOnly?: boolean;
}

/** Definition ID for registry */
export const OLDTOONSWORLD_DEFINITION_ID = 'oldtoonsworld';

/**
 * OldToonsWorld Indexer Implementation (Unit3D-based)
 *
 * Specializes in:
 * - Classic cartoons (1920s-1990s)
 * - Modern animated series
 * - Anime (dubbed/subbed)
 * - Live-action classic TV shows
 * - Animated movies
 */
export class OldToonsWorldIndexer extends Unit3dBase {
	protected readonly metadata: IndexerMetadata = {
		id: OLDTOONSWORLD_DEFINITION_ID,
		name: 'OldToonsWorld',
		description: 'Private tracker for cartoons, animations, and classic TV shows (Unit3D)',
		urls: ['https://oldtoons.world/'],
		language: 'en-US',
		privacy: 'private',
		supportsPagination: true,
		requestDelay: 2
	};

	/**
	 * Lazily built capabilities from category mappings.
	 */
	private _capabilities?: IndexerCapabilities;

	get capabilities(): IndexerCapabilities {
		if (!this._capabilities) {
			this._capabilities = this.buildCapabilities();
		}
		return this._capabilities;
	}

	constructor(config: NativeIndexerConfig) {
		super(config);
	}

	/**
	 * Define category mappings for OldToonsWorld.
	 * Maps Unit3D category names to Newznab category IDs.
	 *
	 * Note: These are typical cartoon/animation tracker categories.
	 * Adjust the category names based on OldToonsWorld's actual categories.
	 */
	protected getCategoryMappings(): Unit3dCategoryMapping[] {
		return [
			// Cartoons - TV Series
			{ name: 'Cartoons', id: NewznabCategory.TVAnime },
			{ name: 'Cartoon', id: NewznabCategory.TVAnime },
			{ name: 'Classic Cartoons', id: NewznabCategory.TVAnime },
			{ name: 'Modern Cartoons', id: NewznabCategory.TVAnime },
			{ name: 'Animation', id: NewznabCategory.TVAnime },

			// Anime
			{ name: 'Anime', id: NewznabCategory.TVAnime },
			{ name: 'Anime Subbed', id: NewznabCategory.TVAnime },
			{ name: 'Anime Dubbed', id: NewznabCategory.TVAnime },

			// TV Shows
			{ name: 'TV', id: NewznabCategory.TV },
			{ name: 'TV Shows', id: NewznabCategory.TV },
			{ name: 'Television', id: NewznabCategory.TV },
			{ name: 'Classic TV', id: NewznabCategory.TV },

			// Movies
			{ name: 'Movies', id: NewznabCategory.Movies },
			{ name: 'Movie', id: NewznabCategory.Movies },
			{ name: 'Animated Movies', id: NewznabCategory.Movies },
			{ name: 'Films', id: NewznabCategory.Movies },

			// Soundtracks & Other
			{ name: 'Soundtracks', id: NewznabCategory.Audio },
			{ name: 'Music', id: NewznabCategory.Audio },
			{ name: 'Other', id: NewznabCategory.Other },
			{ name: 'Misc', id: NewznabCategory.Other }
		];
	}

	/**
	 * Map Newznab categories to OldToonsWorld's internal Unit3D category IDs.
	 *
	 * Since we don't know the exact category IDs used by OldToonsWorld,
	 * we return an empty array to skip category filtering and let the
	 * Unit3D API return all results. The search will rely on text/IMDB/TMDB
	 * filtering instead.
	 *
	 * If you know the actual category IDs from OldToonsWorld, you can
	 * override this method to provide proper mappings.
	 */
	protected override mapCategoriesToUnit3d(): number[] {
		// Return empty array to skip category filtering
		// This ensures we get all results and don't miss anything due to
		// incorrect category ID mappings
		return [];
	}
}

/**
 * Factory function for creating OldToonsWorld indexer instances
 */
export function createOldToonsWorldIndexer(config: NativeIndexerConfig): OldToonsWorldIndexer {
	return new OldToonsWorldIndexer(config);
}
