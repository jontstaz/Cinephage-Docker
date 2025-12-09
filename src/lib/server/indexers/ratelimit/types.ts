/**
 * Rate limiting types.
 */

/** Rate limit configuration */
export interface RateLimitConfig {
	/** Maximum requests in the period */
	requests: number;
	/** Period in milliseconds */
	periodMs: number;
	/** Optional burst allowance */
	burst?: number;
}

/** Default rate limit (60 requests per minute - generous for development) */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
	requests: 60,
	periodMs: 60_000,
	burst: 10
};

/** Convert from YAML format (seconds) to internal format (ms) */
export function fromYamlRateLimit(yaml: {
	requests: number;
	period: number;
	burst?: number;
}): RateLimitConfig {
	return {
		requests: yaml.requests,
		periodMs: yaml.period * 1000,
		burst: yaml.burst
	};
}
