import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LanguageProfileService } from '$lib/server/subtitles/services/LanguageProfileService';
import { languageProfileCreateSchema } from '$lib/validation/schemas';
import type { LanguagePreference } from '$lib/server/db/schema';

/**
 * GET /api/subtitles/language-profiles
 * List all language profiles.
 */
export const GET: RequestHandler = async () => {
	const service = LanguageProfileService.getInstance();
	const profiles = await service.getProfiles();

	return json(profiles);
};

/**
 * POST /api/subtitles/language-profiles
 * Create a new language profile.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = languageProfileCreateSchema.safeParse(data);

	if (!result.success) {
		return json(
			{
				error: 'Validation failed',
				details: result.error.flatten()
			},
			{ status: 400 }
		);
	}

	const validated = result.data;
	const service = LanguageProfileService.getInstance();

	try {
		const created = await service.createProfile({
			name: validated.name,
			languages: validated.languages as LanguagePreference[],
			upgradesAllowed: validated.upgradesAllowed,
			isDefault: validated.isDefault,
			cutoffIndex: validated.cutoffIndex,
			minimumScore: validated.minimumScore
		});

		return json({ success: true, profile: created });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
