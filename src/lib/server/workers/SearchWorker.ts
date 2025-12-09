/**
 * SearchWorker
 * Tracks a search-on-add operation for movies or series.
 * Runs the search in the background with progress tracking.
 */

import { TaskWorker } from './TaskWorker.js';
import type { WorkerType, SearchWorkerMetadata } from './types.js';

/**
 * Options for creating a SearchWorker.
 */
export interface SearchWorkerOptions {
	mediaType: 'movie' | 'series';
	mediaId: string;
	title: string;
	tmdbId: number;
	searchFn: () => Promise<SearchResult>;
}

/**
 * Result from the search function.
 */
export interface SearchResult {
	searched: number;
	found: number;
	grabbed: number;
}

/**
 * SearchWorker runs a search operation in the background.
 * Unlike ImportWorker which waits for external completion,
 * SearchWorker executes the search function directly.
 */
export class SearchWorker extends TaskWorker<SearchWorkerMetadata> {
	readonly type: WorkerType = 'search';

	private searchFn: () => Promise<SearchResult>;

	constructor(options: SearchWorkerOptions) {
		super({
			mediaType: options.mediaType,
			mediaId: options.mediaId,
			title: options.title,
			tmdbId: options.tmdbId,
			itemsSearched: 0,
			itemsFound: 0,
			itemsGrabbed: 0
		});

		this.searchFn = options.searchFn;
	}

	/**
	 * Execute the search operation.
	 */
	protected async execute(): Promise<void> {
		this.log('info', `Starting search for ${this._metadata.mediaType}: ${this._metadata.title}`);

		try {
			const result = await this.searchFn();

			this.updateMetadata({
				itemsSearched: result.searched,
				itemsFound: result.found,
				itemsGrabbed: result.grabbed
			});

			this.log('info', `Search completed`, {
				searched: result.searched,
				found: result.found,
				grabbed: result.grabbed
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			this.log('error', `Search failed: ${message}`);
			throw error;
		}
	}

	/**
	 * Get a summary of the search operation.
	 */
	getSummary(): {
		mediaType: 'movie' | 'series';
		mediaId: string;
		title: string;
		tmdbId: number;
		itemsSearched: number;
		itemsFound: number;
		itemsGrabbed: number;
		duration: number;
	} {
		const duration = this._startedAt
			? (this._completedAt || new Date()).getTime() - this._startedAt.getTime()
			: 0;

		return {
			mediaType: this._metadata.mediaType,
			mediaId: this._metadata.mediaId,
			title: this._metadata.title,
			tmdbId: this._metadata.tmdbId,
			itemsSearched: this._metadata.itemsSearched,
			itemsFound: this._metadata.itemsFound,
			itemsGrabbed: this._metadata.itemsGrabbed,
			duration
		};
	}
}
