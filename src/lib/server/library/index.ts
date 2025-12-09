/**
 * Library Module
 *
 * Re-exports all library services for easy importing.
 */

export { mediaInfoService, MediaInfoService, isVideoFile } from './media-info.js';
export {
	diskScanService,
	DiskScanService,
	type ScanProgress,
	type ScanResult,
	type DiscoveredFile
} from './disk-scan.js';
export { mediaMatcherService, MediaMatcherService, type MatchResult } from './media-matcher.js';
export { libraryWatcherService, LibraryWatcherService } from './library-watcher.js';
export { librarySchedulerService, LibrarySchedulerService } from './library-scheduler.js';
