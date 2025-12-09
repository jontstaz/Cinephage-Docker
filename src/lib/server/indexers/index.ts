/**
 * Indexer System - Main exports
 *
 * This module provides a complete indexer management system with support for:
 * - YAML-based indexer definitions (compatible with Prowlarr/Jackett format)
 * - Native TypeScript indexers
 * - Typed search criteria and tiered search strategies
 * - Comprehensive status tracking and rate limiting
 */

// Core types and interfaces
export * from './core';

// Status tracking
export * from './status';

// Rate limiting
export * from './ratelimit';

// Category mapping
export * from './categories';

// Runtime components
export * from './runtime';

// Engines (template, filter, selector)
export {
	TemplateEngine,
	createTemplateEngine,
	FilterEngine,
	createFilterEngine,
	SelectorEngine,
	createSelectorEngine
} from './engine';

// Schema types
export {
	type YamlDefinition,
	type CardigannDefinition,
	type LoginBlock,
	type SearchBlock,
	type DownloadBlock,
	type SelectorBlock,
	type FilterBlock,
	type CapabilitiesBlock,
	type SettingsField
} from './schema/yamlDefinition';

// Search orchestration
export * from './search';

// Definition loader and factory
export * from './loader';

// Main manager
export { IndexerManager, getIndexerManager, resetIndexerManager } from './IndexerManager';
