import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SubtitleProviderFactory } from '$lib/server/subtitles/providers/SubtitleProviderFactory';

/**
 * GET /api/subtitles/providers/definitions
 * Get all available subtitle provider definitions.
 */
export const GET: RequestHandler = async () => {
	const factory = new SubtitleProviderFactory();
	const definitions = factory.getDefinitions();

	return json(definitions);
};
