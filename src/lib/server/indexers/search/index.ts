/**
 * Search System
 *
 * Provides search orchestration, result processing, and caching:
 * - SearchOrchestrator: Tiered search across multiple indexers
 * - ReleaseDeduplicator: Merge duplicate releases
 * - ReleaseRanker: Score and rank releases
 * - ReleaseCache: Cache search results with TTL
 */

// Search orchestration (new)
export {
	SearchOrchestrator,
	getSearchOrchestrator,
	resetSearchOrchestrator,
	type SearchOrchestratorOptions
} from './SearchOrchestrator';

// Result processing
export { ReleaseDeduplicator } from './ReleaseDeduplicator';
export { ReleaseRanker, QualityLevel, type RankingWeights } from './ReleaseRanker';

// Caching
export { ReleaseCache, getReleaseCache, resetReleaseCache } from './ReleaseCache';
