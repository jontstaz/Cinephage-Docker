/**
 * Registry for managing per-indexer rate limiters.
 */

import { RateLimiter } from './RateLimiter';
import { type RateLimitConfig, DEFAULT_RATE_LIMIT } from './types';

export class RateLimitRegistry {
	private limiters: Map<string, RateLimiter> = new Map();

	/** Register a rate limiter for an indexer */
	register(indexerId: string, config: RateLimitConfig = DEFAULT_RATE_LIMIT): RateLimiter {
		const limiter = new RateLimiter(config);
		this.limiters.set(indexerId, limiter);
		return limiter;
	}

	/** Get rate limiter for an indexer (creates default if not exists) */
	get(indexerId: string): RateLimiter {
		let limiter = this.limiters.get(indexerId);
		if (!limiter) {
			limiter = this.register(indexerId);
		}
		return limiter;
	}

	/** Check if an indexer has a rate limiter */
	has(indexerId: string): boolean {
		return this.limiters.has(indexerId);
	}

	/** Update config for an existing rate limiter */
	updateConfig(indexerId: string, config: RateLimitConfig): void {
		const limiter = this.limiters.get(indexerId);
		if (limiter) {
			limiter.updateConfig(config);
		} else {
			this.register(indexerId, config);
		}
	}

	/** Remove rate limiter for an indexer */
	remove(indexerId: string): void {
		this.limiters.delete(indexerId);
	}

	/** Clear all rate limiters */
	clear(): void {
		this.limiters.clear();
	}

	/** Reset all rate limiters (clear their request history) */
	resetAll(): void {
		for (const limiter of this.limiters.values()) {
			limiter.reset();
		}
	}

	/** Get all indexer IDs with rate limiters */
	getIndexerIds(): string[] {
		return Array.from(this.limiters.keys());
	}

	/** Get summary of all rate limiters */
	getSummary(): Array<{
		indexerId: string;
		currentCount: number;
		remaining: number;
		isLimited: boolean;
	}> {
		return Array.from(this.limiters.entries()).map(([indexerId, limiter]) => ({
			indexerId,
			currentCount: limiter.getCurrentCount(),
			remaining: limiter.getRemainingRequests(),
			isLimited: limiter.isRateLimited()
		}));
	}
}

/** Singleton instance */
let registryInstance: RateLimitRegistry | null = null;

/** Get the singleton rate limit registry */
export function getRateLimitRegistry(): RateLimitRegistry {
	if (!registryInstance) {
		registryInstance = new RateLimitRegistry();
	}
	return registryInstance;
}

/** Reset the singleton (for testing) */
export function resetRateLimitRegistry(): void {
	registryInstance = null;
}
