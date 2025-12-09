import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtitleScheduler } from '$lib/server/subtitles/services/SubtitleScheduler';
import { logger } from '$lib/logging';

export const GET: RequestHandler = async () => {
	try {
		const scheduler = getSubtitleScheduler();
		const settings = scheduler.getSettings();

		return json({
			enabled: settings.enabled,
			searchIntervalHours: settings.searchIntervalMinutes / 60,
			minScoreForAutoDownload: settings.minScoreForAutoDownload,
			upgradeEnabled: settings.upgradeEnabled,
			autoSyncEnabled: settings.autoSyncEnabled,
			maxConcurrentSearches: settings.maxConcurrentSearches
		});
	} catch (error) {
		logger.error(
			'[API] Error getting subtitle scheduler settings',
			error instanceof Error ? error : undefined
		);
		return json({ error: 'Failed to get scheduler settings' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const scheduler = getSubtitleScheduler();

		const updateData: Record<string, unknown> = {};

		if (typeof body.enabled === 'boolean') {
			updateData.enabled = body.enabled;
		}

		if (typeof body.searchIntervalHours === 'number') {
			updateData.searchIntervalMinutes = body.searchIntervalHours * 60;
		}

		if (typeof body.minScoreForAutoDownload === 'number') {
			updateData.minScoreForAutoDownload = Math.min(100, Math.max(0, body.minScoreForAutoDownload));
		}

		if (typeof body.upgradeEnabled === 'boolean') {
			updateData.upgradeEnabled = body.upgradeEnabled;
		}

		if (typeof body.autoSyncEnabled === 'boolean') {
			updateData.autoSyncEnabled = body.autoSyncEnabled;
		}

		if (typeof body.maxConcurrentSearches === 'number') {
			updateData.maxConcurrentSearches = Math.min(10, Math.max(1, body.maxConcurrentSearches));
		}

		await scheduler.updateSettings(updateData);

		const updatedSettings = scheduler.getSettings();

		return json({
			success: true,
			settings: {
				enabled: updatedSettings.enabled,
				searchIntervalHours: updatedSettings.searchIntervalMinutes / 60,
				minScoreForAutoDownload: updatedSettings.minScoreForAutoDownload,
				upgradeEnabled: updatedSettings.upgradeEnabled,
				autoSyncEnabled: updatedSettings.autoSyncEnabled,
				maxConcurrentSearches: updatedSettings.maxConcurrentSearches
			}
		});
	} catch (error) {
		logger.error(
			'[API] Error updating subtitle scheduler settings',
			error instanceof Error ? error : undefined
		);
		return json({ error: 'Failed to update scheduler settings' }, { status: 500 });
	}
};
