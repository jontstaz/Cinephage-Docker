/**
 * Status tracking module exports.
 */

export {
	type HealthStatus,
	type FailureRecord,
	type IndexerStatus,
	type StatusTrackerConfig,
	DEFAULT_STATUS_CONFIG,
	createDefaultStatus
} from './types';

export { BackoffCalculator, defaultBackoffCalculator } from './BackoffCalculator';

// Persistent status tracker (database-backed, survives restarts)
export {
	PersistentStatusTracker,
	getPersistentStatusTracker,
	resetPersistentStatusTracker
} from './PersistentStatusTracker';
