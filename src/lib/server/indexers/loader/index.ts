/**
 * Indexer Definition System
 *
 * Provides loading and factory functionality for indexer definitions.
 */

// Types
export type {
	IndexerDefinition,
	IndexerDefinitionSummary,
	SettingField,
	SettingFieldType,
	CategoryMapping,
	DefinitionSource,
	CreateIndexerConfig,
	UIDefinitionSetting,
	UIIndexerDefinition
} from './types';

export {
	getDefaultSettings,
	getRequiredSettings,
	requiresAuth,
	toDefinitionSummary,
	toUIDefinition
} from './types';

// Definition Loader (unified)
export {
	DefinitionLoader,
	getDefinitionLoader,
	initializeDefinitions,
	type DefinitionLoadError
} from './DefinitionLoader';

// Factory (unified)
export { IndexerFactory, getIndexerFactory } from './IndexerFactory';

// YAML Definition Loader
export {
	YamlDefinitionLoader,
	getYamlDefinitionLoader,
	resetYamlDefinitionLoader,
	type DefinitionLoadResult
} from './YamlDefinitionLoader';

// YAML Indexer Factory
export {
	YamlIndexerFactory,
	getYamlIndexerFactory,
	resetYamlIndexerFactory
} from './YamlIndexerFactory';
