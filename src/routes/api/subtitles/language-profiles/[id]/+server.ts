import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LanguageProfileService } from '$lib/server/subtitles/services/LanguageProfileService';
import { languageProfileUpdateSchema } from '$lib/validation/schemas';
import type { LanguagePreference } from '$lib/server/db/schema';

/**
 * GET /api/subtitles/language-profiles/:id
 * Get a single language profile by ID.
 */
export const GET: RequestHandler = async ({ params }) => {
	const service = LanguageProfileService.getInstance();
	const profile = await service.getProfile(params.id);

	if (!profile) {
		return json({ error: 'Profile not found' }, { status: 404 });
	}

	return json(profile);
};

/**
 * PUT /api/subtitles/language-profiles/:id
 * Update a language profile.
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = languageProfileUpdateSchema.safeParse(data);

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
		const updated = await service.updateProfile(params.id, {
			name: validated.name,
			languages: validated.languages as LanguagePreference[] | undefined,
			upgradesAllowed: validated.upgradesAllowed,
			isDefault: validated.isDefault,
			cutoffIndex: validated.cutoffIndex,
			minimumScore: validated.minimumScore
		});

		return json({ success: true, profile: updated });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		if (message.includes('not found')) {
			return json({ error: message }, { status: 404 });
		}
		return json({ error: message }, { status: 500 });
	}
};

/**
 * DELETE /api/subtitles/language-profiles/:id
 * Delete a language profile.
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const service = LanguageProfileService.getInstance();

	try {
		await service.deleteProfile(params.id);
		return json({ success: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		if (message.includes('not found')) {
			return json({ error: message }, { status: 404 });
		}
		return json({ error: message }, { status: 500 });
	}
};
