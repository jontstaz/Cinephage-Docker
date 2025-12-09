/**
 * StreamWorker
 * Tracks a streaming session from resolve to completion.
 * Used for monitoring and debugging stream activity.
 */

import { TaskWorker } from './TaskWorker.js';
import type { WorkerType, StreamWorkerMetadata } from './types.js';

/**
 * Options for creating a StreamWorker.
 */
export interface StreamWorkerOptions {
	mediaType: 'movie' | 'tv';
	tmdbId: number;
	season?: number;
	episode?: number;
	sessionId?: string;
}

/**
 * StreamWorker tracks a single streaming session.
 * It doesn't actually perform the streaming - that's handled by the routes.
 * This worker tracks the session for monitoring, logging, and debugging.
 */
export class StreamWorker extends TaskWorker<StreamWorkerMetadata> {
	readonly type: WorkerType = 'stream';

	private resolvePromise?: Promise<void>;
	private resolveResolve?: () => void;
	private resolveReject?: (error: Error) => void;

	constructor(options: StreamWorkerOptions) {
		super({
			mediaType: options.mediaType,
			tmdbId: options.tmdbId,
			season: options.season,
			episode: options.episode,
			sessionId: options.sessionId,
			provider: undefined,
			quality: undefined,
			bytesProxied: 0,
			segmentCount: 0
		});

		// Create a promise that resolves when the stream ends
		this.resolvePromise = new Promise((resolve, reject) => {
			this.resolveResolve = resolve;
			this.resolveReject = reject;
		});
	}

	/**
	 * Format the media identifier for logging.
	 */
	get mediaId(): string {
		if (this._metadata.mediaType === 'tv') {
			return `TV ${this._metadata.tmdbId} S${this._metadata.season}E${this._metadata.episode}`;
		}
		return `Movie ${this._metadata.tmdbId}`;
	}

	/**
	 * Record that extraction started.
	 */
	extractionStarted(): void {
		this.log('info', `Starting extraction for ${this.mediaId}`);
	}

	/**
	 * Record a cache hit.
	 */
	cacheHit(): void {
		this.log('debug', `Cache hit for ${this.mediaId}`);
	}

	/**
	 * Record extraction attempt for a provider.
	 */
	tryingProvider(provider: string): void {
		this.log('debug', `Trying provider: ${provider}`);
	}

	/**
	 * Record successful extraction.
	 */
	extractionSucceeded(provider: string, quality?: string): void {
		this.updateMetadata({ provider, quality });
		this.log('info', `Extraction succeeded`, { provider, quality });
		this.setProgress(50);
	}

	/**
	 * Record extraction failure.
	 */
	extractionFailed(provider: string, error: string): void {
		this.log('warn', `Provider failed: ${provider}`, { error });
	}

	/**
	 * Record that a segment was proxied.
	 */
	segmentProxied(bytes: number): void {
		const newBytes = this._metadata.bytesProxied + bytes;
		const newCount = this._metadata.segmentCount + 1;
		this.updateMetadata({
			bytesProxied: newBytes,
			segmentCount: newCount
		});

		// Log every 10 segments
		if (newCount % 10 === 0) {
			this.log(
				'debug',
				`Progress: ${newCount} segments, ${(newBytes / 1024 / 1024).toFixed(2)} MB`
			);
		}
	}

	/**
	 * Mark the stream as complete (user stopped watching or stream ended).
	 */
	complete(): void {
		if (!this.isActive) return;

		this.log('info', `Stream completed`, {
			segmentCount: this._metadata.segmentCount,
			bytesProxied: this._metadata.bytesProxied,
			mbProxied: (this._metadata.bytesProxied / 1024 / 1024).toFixed(2)
		});

		this.resolveResolve?.();
	}

	/**
	 * Mark the stream as failed.
	 */
	fail(error: string): void {
		if (!this.isActive) return;

		this.log('error', `Stream failed: ${error}`);
		this.resolveReject?.(new Error(error));
	}

	/**
	 * Execute the worker - waits for complete() or fail() to be called.
	 */
	protected async execute(): Promise<void> {
		// The worker stays running until complete() or fail() is called
		await this.resolvePromise;
	}

	/**
	 * Get a summary of the stream session.
	 */
	getSummary(): {
		mediaId: string;
		provider?: string;
		quality?: string;
		duration: number;
		segmentCount: number;
		bytesProxied: number;
		mbProxied: string;
	} {
		const duration = this._startedAt
			? (this._completedAt || new Date()).getTime() - this._startedAt.getTime()
			: 0;

		return {
			mediaId: this.mediaId,
			provider: this._metadata.provider,
			quality: this._metadata.quality,
			duration,
			segmentCount: this._metadata.segmentCount,
			bytesProxied: this._metadata.bytesProxied,
			mbProxied: (this._metadata.bytesProxied / 1024 / 1024).toFixed(2)
		};
	}
}

/**
 * Registry to track active stream workers by session or media.
 * Used to find existing workers for segment requests.
 */
class StreamWorkerRegistry {
	private bySession = new Map<string, StreamWorker>();
	private byMedia = new Map<string, StreamWorker>();

	private getMediaKey(
		tmdbId: number,
		mediaType: 'movie' | 'tv',
		season?: number,
		episode?: number
	): string {
		if (mediaType === 'tv') {
			return `tv:${tmdbId}:${season}:${episode}`;
		}
		return `movie:${tmdbId}`;
	}

	register(worker: StreamWorker): void {
		if (worker.metadata.sessionId) {
			this.bySession.set(worker.metadata.sessionId, worker);
		}

		const mediaKey = this.getMediaKey(
			worker.metadata.tmdbId,
			worker.metadata.mediaType,
			worker.metadata.season,
			worker.metadata.episode
		);
		this.byMedia.set(mediaKey, worker);
	}

	unregister(worker: StreamWorker): void {
		if (worker.metadata.sessionId) {
			this.bySession.delete(worker.metadata.sessionId);
		}

		const mediaKey = this.getMediaKey(
			worker.metadata.tmdbId,
			worker.metadata.mediaType,
			worker.metadata.season,
			worker.metadata.episode
		);

		// Only delete if it's still the same worker
		if (this.byMedia.get(mediaKey) === worker) {
			this.byMedia.delete(mediaKey);
		}
	}

	findBySession(sessionId: string): StreamWorker | undefined {
		return this.bySession.get(sessionId);
	}

	findByMedia(
		tmdbId: number,
		mediaType: 'movie' | 'tv',
		season?: number,
		episode?: number
	): StreamWorker | undefined {
		const key = this.getMediaKey(tmdbId, mediaType, season, episode);
		const worker = this.byMedia.get(key);
		// Only return if still active
		return worker?.isActive ? worker : undefined;
	}
}

export const streamWorkerRegistry = new StreamWorkerRegistry();
