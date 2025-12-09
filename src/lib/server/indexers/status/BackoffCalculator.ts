/**
 * Exponential backoff calculator with jitter.
 * Used to calculate retry delays after failures.
 */

export class BackoffCalculator {
	constructor(
		private readonly baseMs: number,
		private readonly maxMs: number,
		private readonly multiplier: number
	) {}

	/**
	 * Calculate backoff time with jitter.
	 * @param failureCount Number of consecutive failures (1-based)
	 * @returns Backoff time in milliseconds
	 */
	calculate(failureCount: number): number {
		if (failureCount <= 0) return 0;

		// Exponential backoff: base * multiplier^(failures-1)
		const exponential = this.baseMs * Math.pow(this.multiplier, failureCount - 1);

		// Cap at maximum
		const capped = Math.min(exponential, this.maxMs);

		// Add jitter (0-25% of calculated time) to prevent thundering herd
		const jitter = Math.random() * 0.25 * capped;

		return Math.round(capped + jitter);
	}

	/**
	 * Calculate when retry should be attempted.
	 * @param failureCount Number of consecutive failures
	 * @returns Date when retry can be attempted
	 */
	calculateRetryTime(failureCount: number): Date {
		const backoffMs = this.calculate(failureCount);
		return new Date(Date.now() + backoffMs);
	}

	/**
	 * Check if enough time has passed since disable.
	 * @param disabledUntil When the indexer can be retried
	 * @returns Whether retry is allowed
	 */
	canRetry(disabledUntil: Date | undefined): boolean {
		if (!disabledUntil) return true;
		return new Date() >= disabledUntil;
	}
}

/** Default backoff calculator instance */
export const defaultBackoffCalculator = new BackoffCalculator(
	60_000, // 1 minute base
	3_600_000, // 1 hour max
	2 // double each time
);
