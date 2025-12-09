/**
 * Subtitle Services - Module exports
 */

export {
	SubtitleProviderManager,
	getSubtitleProviderManager,
	initializeSubtitleProviderManager
} from './SubtitleProviderManager';

export { SubtitleScoringService, getSubtitleScoringService } from './SubtitleScoringService';

export {
	SubtitleSearchService,
	getSubtitleSearchService,
	type SubtitleSearchOptions
} from './SubtitleSearchService';

export { SubtitleDownloadService, getSubtitleDownloadService } from './SubtitleDownloadService';

export {
	LanguageProfileService,
	getLanguageProfileService,
	type LanguageProfile,
	type CreateLanguageProfile,
	type UpdateLanguageProfile
} from './LanguageProfileService';

export {
	SubtitleSyncService,
	getSubtitleSyncService,
	type SyncOptions
} from './SubtitleSyncService';

export { SubtitleScheduler, getSubtitleScheduler } from './SubtitleScheduler';

export { SubtitleScannerService, getSubtitleScannerService } from './SubtitleScannerService';

export {
	SubtitleSettingsService,
	getSubtitleSettingsService,
	type SubtitleSettingsData,
	type SearchTrigger
} from './SubtitleSettingsService';
