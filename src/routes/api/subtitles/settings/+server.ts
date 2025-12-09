import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtitleSettingsService } from '$lib/server/subtitles/services/SubtitleSettingsService';
import { subtitleSettingsUpdateSchema } from '$lib/validation/schemas';

/**
 * GET /api/subtitles/settings
 * Get all subtitle system settings.
 */
export const GET: RequestHandler = async () => {
	const settingsService = getSubtitleSettingsService();
	const settings = await settingsService.getAll();
	return json(settings);
};

/**
 * PUT /api/subtitles/settings
 * Update subtitle system settings.
 */
export const PUT: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = subtitleSettingsUpdateSchema.safeParse(data);

	if (!result.success) {
		return json(
			{
				error: 'Validation failed',
				details: result.error.flatten()
			},
			{ status: 400 }
		);
	}

	try {
		const settingsService = getSubtitleSettingsService();
		const updated = await settingsService.update(result.data);
		return json(updated);
	} catch (error) {
		return json(
			{
				error: 'Failed to update settings',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/subtitles/settings
 * Reset all subtitle settings to defaults.
 */
export const DELETE: RequestHandler = async () => {
	try {
		const settingsService = getSubtitleSettingsService();
		const defaults = await settingsService.resetToDefaults();
		return json(defaults);
	} catch (error) {
		return json(
			{
				error: 'Failed to reset settings',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
