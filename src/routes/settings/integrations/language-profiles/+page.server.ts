import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { LanguageProfileService } from '$lib/server/subtitles/services/LanguageProfileService';
import { getSubtitleSettingsService } from '$lib/server/subtitles/services/SubtitleSettingsService';
import type { LanguagePreference } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const profileService = LanguageProfileService.getInstance();
	const settingsService = getSubtitleSettingsService();

	const profiles = await profileService.getProfiles();
	const settings = await settingsService.getAll();

	return {
		profiles,
		defaultProfileId: settings.defaultLanguageProfileId,
		defaultFallbackLanguage: settings.defaultFallbackLanguage
	};
};

export const actions: Actions = {
	createProfile: async ({ request }) => {
		const data = await request.formData();
		const jsonData = data.get('data');

		if (!jsonData || typeof jsonData !== 'string') {
			return fail(400, { error: 'Invalid request data' });
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(jsonData);
		} catch {
			return fail(400, { error: 'Invalid JSON data' });
		}

		const profileService = LanguageProfileService.getInstance();

		try {
			const profileData = parsed as {
				name: string;
				languages: LanguagePreference[];
				upgradesAllowed: boolean;
				isDefault: boolean;
				cutoffIndex: number;
				minimumScore: number;
			};

			await profileService.createProfile({
				name: profileData.name,
				languages: profileData.languages,
				upgradesAllowed: profileData.upgradesAllowed,
				isDefault: profileData.isDefault,
				cutoffIndex: profileData.cutoffIndex,
				minimumScore: profileData.minimumScore
			});

			return { success: true };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			return fail(500, { error: message });
		}
	},

	updateProfile: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		const jsonData = data.get('data');

		if (!id || typeof id !== 'string') {
			return fail(400, { error: 'Missing profile ID' });
		}

		if (!jsonData || typeof jsonData !== 'string') {
			return fail(400, { error: 'Invalid request data' });
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(jsonData);
		} catch {
			return fail(400, { error: 'Invalid JSON data' });
		}

		const profileService = LanguageProfileService.getInstance();

		try {
			const profileData = parsed as {
				name: string;
				languages: LanguagePreference[];
				upgradesAllowed: boolean;
				isDefault: boolean;
				cutoffIndex: number;
				minimumScore: number;
			};

			await profileService.updateProfile(id, {
				name: profileData.name,
				languages: profileData.languages,
				upgradesAllowed: profileData.upgradesAllowed,
				isDefault: profileData.isDefault,
				cutoffIndex: profileData.cutoffIndex,
				minimumScore: profileData.minimumScore
			});

			return { success: true };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			return fail(500, { error: message });
		}
	},

	deleteProfile: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');

		if (!id || typeof id !== 'string') {
			return fail(400, { error: 'Missing profile ID' });
		}

		const profileService = LanguageProfileService.getInstance();

		try {
			await profileService.deleteProfile(id);
			return { success: true };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			return fail(500, { error: message });
		}
	},

	updateSettings: async ({ request }) => {
		const data = await request.formData();
		const defaultProfileId = data.get('defaultProfileId');
		const fallbackLanguage = data.get('fallbackLanguage');

		const settingsService = getSubtitleSettingsService();

		try {
			if (typeof defaultProfileId === 'string') {
				await settingsService.set('defaultLanguageProfileId', defaultProfileId || null);
			}

			if (typeof fallbackLanguage === 'string' && fallbackLanguage) {
				await settingsService.set('defaultFallbackLanguage', fallbackLanguage);
			}

			return { success: true };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			return fail(500, { error: message });
		}
	}
};
