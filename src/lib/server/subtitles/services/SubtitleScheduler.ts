/**
 * Subtitle Scheduler
 *
 * Automated background service for:
 * - Searching for missing subtitles
 * - Upgrading existing subtitles when better matches are found
 * - Processing newly imported media
 */

import { db } from '$lib/server/db';
import { movies, series, episodes, subtitleSettings } from '$lib/server/db/schema';
import { eq, isNotNull, and } from 'drizzle-orm';
import { getSubtitleSearchService } from './SubtitleSearchService';
import { getSubtitleDownloadService } from './SubtitleDownloadService';
import { LanguageProfileService } from './LanguageProfileService';
import { logger } from '$lib/logging';

interface SchedulerSettings {
	enabled: boolean;
	searchIntervalMinutes: number;
	upgradeEnabled: boolean;
	autoSyncEnabled: boolean;
	maxConcurrentSearches: number;
	minScoreForAutoDownload: number;
}

const DEFAULT_SETTINGS: SchedulerSettings = {
	enabled: true,
	searchIntervalMinutes: 360, // 6 hours
	upgradeEnabled: true,
	autoSyncEnabled: true,
	maxConcurrentSearches: 3,
	minScoreForAutoDownload: 80
};

class SubtitleScheduler {
	private isRunning = false;
	private intervalId: NodeJS.Timeout | null = null;
	private settings: SchedulerSettings = DEFAULT_SETTINGS;

	constructor() {}

	/**
	 * Start the scheduler
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			logger.warn('SubtitleScheduler already running');
			return;
		}

		await this.loadSettings();

		if (!this.settings.enabled) {
			logger.info('SubtitleScheduler disabled in settings');
			return;
		}

		this.isRunning = true;
		logger.info('SubtitleScheduler started', {
			intervalMinutes: this.settings.searchIntervalMinutes
		});

		// Run initial search after a short delay
		setTimeout(() => this.runSearchCycle(), 60000); // 1 minute delay

		// Set up recurring interval
		this.intervalId = setInterval(
			() => this.runSearchCycle(),
			this.settings.searchIntervalMinutes * 60 * 1000
		);
	}

	/**
	 * Stop the scheduler
	 */
	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.isRunning = false;
		logger.info('SubtitleScheduler stopped');
	}

	/**
	 * Load settings from database
	 */
	private async loadSettings(): Promise<void> {
		try {
			const settingsRecord = await db.query.subtitleSettings.findFirst({
				where: eq(subtitleSettings.key, 'scheduler')
			});

			if (settingsRecord?.value) {
				const parsed =
					typeof settingsRecord.value === 'string'
						? JSON.parse(settingsRecord.value)
						: settingsRecord.value;
				this.settings = {
					...DEFAULT_SETTINGS,
					...(parsed as Partial<SchedulerSettings>)
				};
			}
		} catch (error) {
			logger.warn('SubtitleScheduler failed to load settings, using defaults', { error });
		}
	}

	/**
	 * Update scheduler settings
	 */
	async updateSettings(newSettings: Partial<SchedulerSettings>): Promise<void> {
		this.settings = { ...this.settings, ...newSettings };

		// Save to database
		const settingsJson = JSON.stringify(this.settings);
		await db
			.insert(subtitleSettings)
			.values({
				key: 'scheduler',
				value: settingsJson
			})
			.onConflictDoUpdate({
				target: subtitleSettings.key,
				set: {
					value: settingsJson
				}
			});

		// Restart with new interval if running
		if (this.isRunning) {
			this.stop();
			await this.start();
		}
	}

	/**
	 * Get current settings
	 */
	getSettings(): SchedulerSettings {
		return { ...this.settings };
	}

	/**
	 * Run a complete search cycle
	 */
	async runSearchCycle(): Promise<void> {
		if (!this.settings.enabled) {
			return;
		}

		logger.info('SubtitleScheduler starting search cycle');

		try {
			const searchService = getSubtitleSearchService();
			const downloadService = getSubtitleDownloadService();
			const profileService = LanguageProfileService.getInstance();

			// Get all movies with language profiles that want subtitles
			const moviesWithProfiles = await db
				.select()
				.from(movies)
				.where(and(isNotNull(movies.languageProfileId), eq(movies.wantsSubtitles, true)));

			let processed = 0;
			let downloaded = 0;

			for (const movie of moviesWithProfiles) {
				if (!movie.languageProfileId) continue;

				try {
					// Check if subtitles are missing
					const status = await profileService.getMovieSubtitleStatus(movie.id);

					if (!status.satisfied && status.missing.length > 0) {
						// Get profile languages
						const profile = await profileService.getProfile(movie.languageProfileId);
						if (!profile) continue;

						const languages = profile.languages.map((l) => l.code);

						// Search for subtitles
						const results = await searchService.searchForMovie(movie.id, languages);

						// Download best match for each missing language
						for (const missing of status.missing) {
							const bestMatch = results.results.find(
								(r) =>
									r.language === missing.code &&
									r.matchScore >= this.settings.minScoreForAutoDownload
							);

							if (bestMatch) {
								try {
									await downloadService.downloadForMovie(movie.id, bestMatch);
									downloaded++;
								} catch (downloadError) {
									logger.warn('SubtitleScheduler failed to download subtitle for movie', {
										movieId: movie.id,
										error: downloadError
									});
								}
							}
						}
					}

					processed++;
				} catch (error) {
					logger.warn('SubtitleScheduler error processing movie', { movieId: movie.id, error });
				}
			}

			// Get all series with language profiles that want subtitles
			const seriesWithProfiles = await db
				.select()
				.from(series)
				.where(and(isNotNull(series.languageProfileId), eq(series.wantsSubtitles, true)));

			for (const show of seriesWithProfiles) {
				if (!show.languageProfileId) continue;

				try {
					// Get profile languages
					const profile = await profileService.getProfile(show.languageProfileId);
					if (!profile) continue;

					const languages = profile.languages.map((l) => l.code);

					// Get episodes missing subtitles
					const episodesMissing = await profileService.getSeriesEpisodesMissingSubtitles(show.id);

					for (const episodeId of episodesMissing) {
						try {
							// Check if episode has explicitly disabled subtitles
							const episodeData = await db.query.episodes.findFirst({
								where: eq(episodes.id, episodeId)
							});

							// Skip if episode has wantsSubtitlesOverride = false
							if (episodeData?.wantsSubtitlesOverride === false) {
								continue;
							}

							const results = await searchService.searchForEpisode(episodeId, languages);

							// Get status for this episode
							const status = await profileService.getEpisodeSubtitleStatus(episodeId);

							for (const missing of status.missing) {
								const bestMatch = results.results.find(
									(r) =>
										r.language === missing.code &&
										r.matchScore >= this.settings.minScoreForAutoDownload
								);

								if (bestMatch) {
									try {
										await downloadService.downloadForEpisode(episodeId, bestMatch);
										downloaded++;
									} catch (downloadError) {
										logger.warn('SubtitleScheduler failed to download subtitle for episode', {
											episodeId,
											error: downloadError
										});
									}
								}
							}

							processed++;
						} catch (error) {
							logger.warn('SubtitleScheduler error processing episode', {
								episodeId,
								error
							});
						}
					}
				} catch (error) {
					logger.warn('SubtitleScheduler error processing series', { seriesId: show.id, error });
				}
			}

			logger.info('SubtitleScheduler search cycle completed', {
				processed,
				downloaded
			});
		} catch (error) {
			logger.error('SubtitleScheduler error in search cycle', { error });
		}
	}

	/**
	 * Process a single media item (triggered on import)
	 */
	async processNewMedia(
		mediaType: 'movie' | 'episode',
		mediaId: string
	): Promise<{ downloaded: number; errors: string[] }> {
		const result = { downloaded: 0, errors: [] as string[] };

		try {
			const searchService = getSubtitleSearchService();
			const downloadService = getSubtitleDownloadService();
			const profileService = LanguageProfileService.getInstance();

			if (mediaType === 'movie') {
				const movie = await db.query.movies.findFirst({
					where: eq(movies.id, mediaId)
				});

				// Skip if movie doesn't want subtitles or has no language profile
				if (!movie?.languageProfileId || movie.wantsSubtitles === false) {
					return result;
				}

				const profile = await profileService.getProfile(movie.languageProfileId);
				if (!profile) return result;

				const languages = profile.languages.map((l) => l.code);
				const searchResults = await searchService.searchForMovie(mediaId, languages);
				const status = await profileService.getMovieSubtitleStatus(mediaId);

				for (const missing of status.missing) {
					const bestMatch = searchResults.results.find(
						(r) =>
							r.language === missing.code && r.matchScore >= this.settings.minScoreForAutoDownload
					);

					if (bestMatch) {
						try {
							await downloadService.downloadForMovie(mediaId, bestMatch);
							result.downloaded++;
						} catch (error) {
							result.errors.push(error instanceof Error ? error.message : String(error));
						}
					}
				}
			} else {
				// Episode
				const episode = await db.query.episodes.findFirst({
					where: eq(episodes.id, mediaId)
				});

				if (!episode) return result;

				// Check if episode has explicitly disabled subtitles
				if (episode.wantsSubtitlesOverride === false) {
					return result;
				}

				const seriesData = await db.query.series.findFirst({
					where: eq(series.id, episode.seriesId)
				});

				// Skip if series doesn't want subtitles or has no language profile
				if (!seriesData?.languageProfileId || seriesData.wantsSubtitles === false) {
					return result;
				}

				const profile = await profileService.getProfile(seriesData.languageProfileId);
				if (!profile) return result;

				const languages = profile.languages.map((l) => l.code);
				const searchResults = await searchService.searchForEpisode(mediaId, languages);
				const status = await profileService.getEpisodeSubtitleStatus(mediaId);

				for (const missing of status.missing) {
					const bestMatch = searchResults.results.find(
						(r) =>
							r.language === missing.code && r.matchScore >= this.settings.minScoreForAutoDownload
					);

					if (bestMatch) {
						try {
							await downloadService.downloadForEpisode(mediaId, bestMatch);
							result.downloaded++;
						} catch (error) {
							result.errors.push(error instanceof Error ? error.message : String(error));
						}
					}
				}
			}
		} catch (error) {
			result.errors.push(error instanceof Error ? error.message : String(error));
		}

		return result;
	}

	/**
	 * Manual trigger for search cycle
	 */
	async triggerSearch(): Promise<void> {
		await this.runSearchCycle();
	}

	/**
	 * Check if scheduler is running
	 */
	isActive(): boolean {
		return this.isRunning;
	}
}

// Singleton instance
let schedulerInstance: SubtitleScheduler | null = null;

export function getSubtitleScheduler(): SubtitleScheduler {
	if (!schedulerInstance) {
		schedulerInstance = new SubtitleScheduler();
	}
	return schedulerInstance;
}

export { SubtitleScheduler };
