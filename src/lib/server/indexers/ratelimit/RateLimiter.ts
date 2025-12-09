/**
 * Sliding window rate limiter.
 * Tracks request timestamps within a time window.
 */

import { type RateLimitConfig, DEFAULT_RATE_LIMIT } from './types';

export class RateLimiter {
	private requestTimestamps: number[] = [];

	constructor(private config: RateLimitConfig = DEFAULT_RATE_LIMIT) {}

	/** Check if a request can proceed without hitting the limit */
	canProceed(): boolean {
		this.cleanup();
		const limit = this.config.requests + (this.config.burst ?? 0);
		return this.requestTimestamps.length < limit;
	}

	/** Get wait time until next request can proceed (ms), 0 if ready */
	getWaitTime(): number {
		this.cleanup();
		const limit = this.config.requests + (this.config.burst ?? 0);

		if (this.requestTimestamps.length < limit) {
			return 0;
		}

		// Find the oldest timestamp that will expire
		const oldestTimestamp = this.requestTimestamps[0];
		const waitUntil = oldestTimestamp + this.config.periodMs;
		return Math.max(0, waitUntil - Date.now());
	}

	/** Record a request */
	recordRequest(): void {
		this.requestTimestamps.push(Date.now());
	}

	/** Get current request count in window */
	getCurrentCount(): number {
		this.cleanup();
		return this.requestTimestamps.length;
	}

	/** Get remaining requests before hitting limit */
	getRemainingRequests(): number {
		this.cleanup();
		const limit = this.config.requests + (this.config.burst ?? 0);
		return Math.max(0, limit - this.requestTimestamps.length);
	}

	/** Check if currently rate limited */
	isRateLimited(): boolean {
		return !this.canProceed();
	}

	/** Reset the rate limiter */
	reset(): void {
		this.requestTimestamps = [];
	}

	/** Update configuration */
	updateConfig(config: RateLimitConfig): void {
		this.config = config;
	}

	/** Get current configuration */
	getConfig(): RateLimitConfig {
		return { ...this.config };
	}

	/** Remove old timestamps outside the period window */
	private cleanup(): void {
		const cutoff = Date.now() - this.config.periodMs;
		this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > cutoff);
	}
}
