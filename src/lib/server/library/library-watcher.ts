/**
 * Library Watcher Service
 *
 * Watches root folders for filesystem changes using chokidar.
 * Triggers incremental scans when files are added, removed, or changed.
 */

import chokidar, { type FSWatcher } from 'chokidar';
import { db } from '$lib/server/db/index.js';
import { rootFolders, librarySettings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { diskScanService } from './disk-scan.js';
import { mediaMatcherService } from './media-matcher.js';
import { isVideoFile } from './media-info.js';
import { EventEmitter } from 'events';
import { logger } from '$lib/logging';

/**
 * Debounce time for processing file events (ms)
 * Groups rapid changes together
 */
const DEBOUNCE_TIME = 5000;

/**
 * File change event
 */
interface FileChange {
	type: 'add' | 'change' | 'unlink';
	path: string;
	rootFolderId: string;
	timestamp: number;
}

/**
 * LibraryWatcherService - Watch filesystem for media changes
 */
export class LibraryWatcherService extends EventEmitter {
	private static instance: LibraryWatcherService;
	private watchers: Map<string, FSWatcher> = new Map();
	private pendingChanges: Map<string, FileChange> = new Map();
	private processTimeout: NodeJS.Timeout | null = null;
	private enabled = false;
	private rootFolderMap: Map<string, string> = new Map(); // path -> id

	private constructor() {
		super();
	}

	static getInstance(): LibraryWatcherService {
		if (!LibraryWatcherService.instance) {
			LibraryWatcherService.instance = new LibraryWatcherService();
		}
		return LibraryWatcherService.instance;
	}

	/**
	 * Check if watching is enabled in settings
	 */
	private async isWatchingEnabled(): Promise<boolean> {
		const setting = await db
			.select()
			.from(librarySettings)
			.where(eq(librarySettings.key, 'watch_enabled'))
			.limit(1);

		if (setting.length > 0) {
			return setting[0].value === 'true';
		}

		// Default to true
		return true;
	}

	/**
	 * Initialize watchers for all root folders
	 */
	async initialize(): Promise<void> {
		const watchEnabled = await this.isWatchingEnabled();
		if (!watchEnabled) {
			logger.info('[LibraryWatcher] Filesystem watching is disabled');
			return;
		}

		const folders = await db.select().from(rootFolders);

		for (const folder of folders) {
			await this.watchFolder(folder.id, folder.path);
		}

		this.enabled = true;
		logger.info('[LibraryWatcher] Initialized watchers', { folderCount: folders.length });
	}

	/**
	 * Stop all watchers
	 */
	async shutdown(): Promise<void> {
		for (const [folderId, watcher] of this.watchers) {
			await watcher.close();
			logger.debug('[LibraryWatcher] Stopped watching folder', { folderId });
		}

		this.watchers.clear();
		this.rootFolderMap.clear();
		this.pendingChanges.clear();

		if (this.processTimeout) {
			clearTimeout(this.processTimeout);
			this.processTimeout = null;
		}

		this.enabled = false;
	}

	/**
	 * Watch a specific root folder
	 */
	async watchFolder(folderId: string, folderPath: string): Promise<void> {
		// Stop existing watcher if any
		if (this.watchers.has(folderId)) {
			await this.watchers.get(folderId)?.close();
		}

		// Store mapping
		this.rootFolderMap.set(folderPath, folderId);

		// Create watcher
		const watcher = chokidar.watch(folderPath, {
			persistent: true,
			ignoreInitial: true, // Don't fire events for existing files
			followSymlinks: true,
			depth: 10, // Max depth to watch
			awaitWriteFinish: {
				stabilityThreshold: 2000,
				pollInterval: 100
			},
			ignored: [
				/(^|[/\\])\../, // Ignore dotfiles
				/node_modules/,
				/@eaDir/, // Synology thumbnails
				/#recycle/i,
				/\$RECYCLE\.BIN/i
			]
		});

		// Set up event handlers
		watcher
			.on('add', (path) => this.handleFileEvent('add', path, folderId))
			.on('change', (path) => this.handleFileEvent('change', path, folderId))
			.on('unlink', (path) => this.handleFileEvent('unlink', path, folderId))
			.on('error', (error) => {
				logger.error('[LibraryWatcher] Error in folder', error, { folderId });
				this.emit('error', { folderId, error });
			})
			.on('ready', () => {
				logger.info('[LibraryWatcher] Watching folder', { folderPath });
			});

		this.watchers.set(folderId, watcher);
	}

	/**
	 * Stop watching a specific folder
	 */
	async unwatchFolder(folderId: string): Promise<void> {
		const watcher = this.watchers.get(folderId);
		if (watcher) {
			await watcher.close();
			this.watchers.delete(folderId);

			// Remove from folder map
			for (const [path, id] of this.rootFolderMap) {
				if (id === folderId) {
					this.rootFolderMap.delete(path);
					break;
				}
			}

			logger.debug('[LibraryWatcher] Stopped watching folder', { folderId });
		}
	}

	/**
	 * Handle a file event
	 */
	private handleFileEvent(
		type: 'add' | 'change' | 'unlink',
		path: string,
		rootFolderId: string
	): void {
		// Only process video files
		if (!isVideoFile(path)) {
			return;
		}

		logger.debug('[LibraryWatcher] File event', { type, path });

		// Queue the change
		this.pendingChanges.set(path, {
			type,
			path,
			rootFolderId,
			timestamp: Date.now()
		});

		// Debounce processing
		if (this.processTimeout) {
			clearTimeout(this.processTimeout);
		}

		this.processTimeout = setTimeout(() => {
			this.processPendingChanges();
		}, DEBOUNCE_TIME);
	}

	/**
	 * Process all pending file changes
	 */
	private async processPendingChanges(): Promise<void> {
		if (this.pendingChanges.size === 0) {
			return;
		}

		// Group changes by root folder
		const changesByFolder = new Map<string, FileChange[]>();

		for (const [, change] of this.pendingChanges) {
			const existing = changesByFolder.get(change.rootFolderId) || [];
			existing.push(change);
			changesByFolder.set(change.rootFolderId, existing);
		}

		// Clear pending changes
		this.pendingChanges.clear();

		// Process each folder with a SINGLE scan
		for (const [folderId, changes] of changesByFolder) {
			logger.info('[LibraryWatcher] Processing changes', { folderId, changeCount: changes.length });

			try {
				// Check if scan is already running
				if (diskScanService.scanning) {
					logger.debug('[LibraryWatcher] Scan already running, re-queueing changes', {
						changeCount: changes.length
					});
					// Re-queue the changes for later processing
					for (const change of changes) {
						this.pendingChanges.set(change.path, change);
					}
					// Trigger another debounced process
					if (this.processTimeout) {
						clearTimeout(this.processTimeout);
					}
					this.processTimeout = setTimeout(() => {
						this.processPendingChanges();
					}, DEBOUNCE_TIME);
					continue;
				}

				// Always do a single folder scan (handles adds, changes, and deletes)
				await diskScanService.scanRootFolder(folderId);

				// Process unmatched files after scan
				await mediaMatcherService.processAllUnmatched();

				this.emit('processed', { folderId, changes: changes.length });
			} catch (error) {
				logger.error('[LibraryWatcher] Error processing changes', error, { folderId });
				this.emit('error', { folderId, error });
			}
		}
	}

	/**
	 * Get watcher status
	 */
	getStatus(): { enabled: boolean; watchedFolders: string[] } {
		return {
			enabled: this.enabled,
			watchedFolders: Array.from(this.watchers.keys())
		};
	}

	/**
	 * Refresh watchers (e.g., when root folders change)
	 */
	async refresh(): Promise<void> {
		await this.shutdown();
		await this.initialize();
	}
}

export const libraryWatcherService = LibraryWatcherService.getInstance();
