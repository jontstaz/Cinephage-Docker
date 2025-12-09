/**
 * Aither Indexer (Unit3D-based)
 *
 * Private HD tracker running Unit3D software.
 * Supports Movies, TV, and general content.
 *
 * This serves as an example of how to implement a Unit3D-based indexer.
 * Simply extend Unit3dBase and configure the metadata and category mappings.
 *
 * @see https://aither.cc/
 * @see https://github.com/HDIndustry/UNIT3D-Community-Edition
 */

import {
	Unit3dBase,
	type Unit3dCategoryMapping,
	type IndexerMetadata,
	type NativeIndexerConfig
} from '../base';
import { NewznabCategory } from '../base/Categories';
import type { IndexerCapabilities } from '../../core/capabilities';

/** Definition ID for registry */
export const AITHER_DEFINITION_ID = 'aither';

/**
 * Aither Indexer - Unit3D-based private tracker.
 */
export class AitherIndexer extends Unit3dBase {
	protected readonly metadata: IndexerMetadata = {
		id: AITHER_DEFINITION_ID,
		name: 'Aither',
		description: 'Private HD tracker (Unit3D)',
		urls: ['https://aither.cc/'],
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
	 * Define category mappings for Aither.
	 * Maps Unit3D category names to Newznab category IDs.
	 */
	protected getCategoryMappings(): Unit3dCategoryMapping[] {
		return [
			// Movies
			{ name: 'Movies', id: NewznabCategory.Movies },
			{ name: 'Movie', id: NewznabCategory.Movies },

			// TV
			{ name: 'TV', id: NewznabCategory.TV },
			{ name: 'Television', id: NewznabCategory.TV },

			// XXX
			{ name: 'XXX', id: NewznabCategory.XXX },

			// Other
			{ name: 'Other', id: NewznabCategory.Other },
			{ name: 'Misc', id: NewznabCategory.Other }
		];
	}

	/**
	 * Map Newznab categories to Aither's internal category IDs.
	 * Unit3D trackers may use different internal IDs.
	 */
	protected override mapCategoriesToUnit3d(categories: number[]): number[] {
		const mapping: Record<number, number> = {
			// Aither uses these category IDs (adjust based on actual tracker)
			[NewznabCategory.Movies]: 1,
			[NewznabCategory.MoviesHD]: 1,
			[NewznabCategory.MoviesUHD]: 1,
			[NewznabCategory.TV]: 2,
			[NewznabCategory.TVHD]: 2,
			[NewznabCategory.TVUHD]: 2,
			[NewznabCategory.XXX]: 3,
			[NewznabCategory.Other]: 4
		};

		const mapped: number[] = [];
		for (const cat of categories) {
			const unit3dCat = mapping[cat];
			if (unit3dCat !== undefined && !mapped.includes(unit3dCat)) {
				mapped.push(unit3dCat);
			}
		}
		return mapped;
	}
}

/**
 * Factory function to create an Aither indexer.
 */
export function createAitherIndexer(config: NativeIndexerConfig): AitherIndexer {
	return new AitherIndexer(config);
}
