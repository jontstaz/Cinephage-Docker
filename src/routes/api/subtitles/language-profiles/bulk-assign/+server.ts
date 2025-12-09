import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { movies, series } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { LanguageProfileService } from '$lib/server/subtitles/services/LanguageProfileService';
import { logger } from '$lib/logging';

/**
 * Schema for bulk profile assignment request
 */
const bulkAssignSchema = z.object({
	/** Target media type */
	mediaType: z.enum(['movie', 'series']),
	/** IDs of media items to update */
	mediaIds: z.array(z.string().uuid()).min(1, 'At least one media ID is required'),
	/** Language profile ID to assign (null to remove profile) */
	languageProfileId: z.string().uuid().nullable(),
	/** Whether to enable subtitle searching for these items */
	wantsSubtitles: z.boolean().optional()
});

/**
 * POST /api/subtitles/language-profiles/bulk-assign
 * Assign a language profile to multiple movies or series at once.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = bulkAssignSchema.safeParse(data);

	if (!result.success) {
		return json(
			{
				error: 'Validation failed',
				details: result.error.flatten()
			},
			{ status: 400 }
		);
	}

	const { mediaType, mediaIds, languageProfileId, wantsSubtitles } = result.data;

	// Validate profile exists if provided
	if (languageProfileId) {
		const profileService = LanguageProfileService.getInstance();
		const profile = await profileService.getProfile(languageProfileId);
		if (!profile) {
			return json({ error: `Language profile not found: ${languageProfileId}` }, { status: 404 });
		}
	}

	try {
		const updateData: Record<string, unknown> = {
			languageProfileId
		};

		// If wantsSubtitles is explicitly set, include it
		if (wantsSubtitles !== undefined) {
			updateData.wantsSubtitles = wantsSubtitles;
		} else if (languageProfileId) {
			// Default to enabling subtitles when assigning a profile
			updateData.wantsSubtitles = true;
		}

		if (mediaType === 'movie') {
			await db.update(movies).set(updateData).where(inArray(movies.id, mediaIds));

			logger.info('[BulkAssign] Updated movies with language profile', {
				count: mediaIds.length,
				languageProfileId
			});
		} else {
			await db.update(series).set(updateData).where(inArray(series.id, mediaIds));

			logger.info('[BulkAssign] Updated series with language profile', {
				count: mediaIds.length,
				languageProfileId
			});
		}

		return json({
			success: true,
			updated: mediaIds.length
		});
	} catch (error) {
		logger.error('[BulkAssign] Failed to bulk assign language profile', {
			error: error instanceof Error ? error.message : String(error),
			mediaType,
			mediaIds: mediaIds.length
		});

		return json(
			{
				error: 'Failed to assign language profile',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
