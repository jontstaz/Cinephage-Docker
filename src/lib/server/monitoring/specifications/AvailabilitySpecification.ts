/**
 * AvailabilitySpecification
 *
 * Checks if a movie has reached its minimum availability status before
 * automated searching/grabbing. This prevents downloading pre-release
 * content that might be fake or low quality.
 *
 * Availability levels (in order of release):
 * - 'announced': Movie has been announced (very early, often no releases)
 * - 'inCinemas': Movie is currently in theaters
 * - 'released': Movie is released on digital/physical media
 *
 * The specification accepts if the movie's current state meets or exceeds
 * the configured minimum availability threshold.
 */

import type {
	IMonitoringSpecification,
	MovieContext,
	SpecificationResult,
	ReleaseCandidate
} from './types.js';
import { reject, accept } from './types.js';

/**
 * Availability levels in order of "availability"
 * Higher index = more available
 */
const AVAILABILITY_ORDER = ['announced', 'inCinemas', 'released'] as const;
type AvailabilityLevel = (typeof AVAILABILITY_ORDER)[number];

/**
 * Extended RejectionReason for availability
 */
export const AvailabilityRejectionReason = {
	NOT_YET_AVAILABLE: 'not_yet_available',
	UNKNOWN_AVAILABILITY: 'unknown_availability'
} as const;

/**
 * Check if a movie meets minimum availability requirements
 */
export class MovieAvailabilitySpecification implements IMonitoringSpecification<MovieContext> {
	async isSatisfied(
		context: MovieContext,
		_release?: ReleaseCandidate
	): Promise<SpecificationResult> {
		const { movie } = context;

		// Get minimum availability setting (default to 'released' for safety)
		const minimumAvailability = (movie.minimumAvailability as AvailabilityLevel) || 'released';

		// Determine current availability status based on dates
		const currentAvailability = this.getCurrentAvailability(movie);

		// Compare availability levels
		const minimumIndex = AVAILABILITY_ORDER.indexOf(minimumAvailability);
		const currentIndex = AVAILABILITY_ORDER.indexOf(currentAvailability);

		if (minimumIndex === -1) {
			// Unknown minimum availability setting, allow by default
			return accept();
		}

		if (currentIndex === -1) {
			// Can't determine current availability - be cautious and reject
			return reject(AvailabilityRejectionReason.UNKNOWN_AVAILABILITY);
		}

		if (currentIndex < minimumIndex) {
			// Current availability hasn't reached minimum threshold
			return reject(
				`${AvailabilityRejectionReason.NOT_YET_AVAILABLE}: movie is ${currentAvailability}, requires ${minimumAvailability}`
			);
		}

		return accept();
	}

	/**
	 * Determine the current availability level of a movie based on available data
	 *
	 * Since we don't have precise release dates stored, we use heuristics:
	 * - If movie year is in the past or current year and movie was added some time ago, assume 'released'
	 * - If movie year is current year and recently added, assume 'inCinemas'
	 * - If movie year is in the future, assume 'announced'
	 */
	private getCurrentAvailability(movie: MovieContext['movie']): AvailabilityLevel {
		const now = new Date();
		const currentYear = now.getFullYear();
		const movieYear = movie.year;

		// If no year, be conservative and assume announced
		if (!movieYear) {
			return 'announced';
		}

		// If movie year is in the future, it's announced
		if (movieYear > currentYear) {
			return 'announced';
		}

		// If movie year is in the past, it's definitely released
		if (movieYear < currentYear) {
			return 'released';
		}

		// Movie year is current year - check how long ago it was added
		// Movies typically go from theater to digital in 45-90 days
		// If added > 120 days ago and still current year, likely released
		const addedDate = movie.added ? new Date(movie.added) : now;
		const daysSinceAdded = (now.getTime() - addedDate.getTime()) / (1000 * 60 * 60 * 24);

		if (daysSinceAdded > 120) {
			return 'released';
		} else if (daysSinceAdded > 30) {
			return 'inCinemas';
		}

		// Recently added current year movie - assume announced or in cinemas
		// Be conservative for automatic grabbing
		return 'inCinemas';
	}
}

/**
 * Convenience function to check if a movie is available
 */
export async function isMovieAvailable(
	context: MovieContext,
	minimumAvailability?: AvailabilityLevel
): Promise<boolean> {
	// Override the context's minimum availability if specified
	const contextWithOverride = minimumAvailability
		? {
				...context,
				movie: { ...context.movie, minimumAvailability }
			}
		: context;

	const spec = new MovieAvailabilitySpecification();
	const result = await spec.isSatisfied(contextWithOverride);
	return result.accepted;
}
