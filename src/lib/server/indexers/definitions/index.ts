/**
 * Native TypeScript Indexer Definitions
 *
 * This module provides native TypeScript indexer implementations that offer
 * better type safety, maintainability, and performance compared to YAML definitions.
 *
 * Architecture:
 * - Base classes in ./base/ provide common functionality
 * - Public indexers in ./public/ don't require authentication
 * - Private indexers in ./private/ require cookies, API keys, or passkeys
 * - Registry in ./registry.ts provides a unified interface
 */

// Base classes and utilities
export * from './base';

// Registry functions
export {
	isNativeIndexer,
	getNativeIndexerDefinition,
	getAllNativeIndexerDefinitions,
	createNativeIndexer,
	getNativeIndexerIds,
	type NativeIndexerDefinition,
	type IndexerFactory
} from './registry';

// Re-export individual indexers for direct access
export * from './public';
export * from './private';
