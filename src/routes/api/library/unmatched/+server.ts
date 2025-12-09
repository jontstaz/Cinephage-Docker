import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { unmatchedFiles, rootFolders } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { mediaMatcherService } from '$lib/server/library/index.js';
import { logger } from '$lib/logging';

/**
 * GET /api/library/unmatched
 * List all unmatched files awaiting manual review
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const mediaType = url.searchParams.get('mediaType'); // 'movie' | 'tv' | null

		const query = db
			.select({
				id: unmatchedFiles.id,
				path: unmatchedFiles.path,
				rootFolderId: unmatchedFiles.rootFolderId,
				rootFolderPath: rootFolders.path,
				mediaType: unmatchedFiles.mediaType,
				size: unmatchedFiles.size,
				parsedTitle: unmatchedFiles.parsedTitle,
				parsedYear: unmatchedFiles.parsedYear,
				parsedSeason: unmatchedFiles.parsedSeason,
				parsedEpisode: unmatchedFiles.parsedEpisode,
				suggestedMatches: unmatchedFiles.suggestedMatches,
				reason: unmatchedFiles.reason,
				discoveredAt: unmatchedFiles.discoveredAt
			})
			.from(unmatchedFiles)
			.leftJoin(rootFolders, eq(unmatchedFiles.rootFolderId, rootFolders.id));

		const files = mediaType
			? await query.where(eq(unmatchedFiles.mediaType, mediaType))
			: await query;

		return json({
			success: true,
			files,
			total: files.length
		});
	} catch (error) {
		logger.error(
			'[API] Error fetching unmatched files',
			error instanceof Error ? error : undefined
		);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch unmatched files'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/library/unmatched
 * Process all unmatched files (attempt to match them)
 */
export const POST: RequestHandler = async () => {
	try {
		const results = await mediaMatcherService.processAllUnmatched();

		const matched = results.filter((r) => r.matched).length;
		const failed = results.filter((r) => !r.matched).length;

		return json({
			success: true,
			processed: results.length,
			matched,
			failed,
			results
		});
	} catch (error) {
		logger.error(
			'[API] Error processing unmatched files',
			error instanceof Error ? error : undefined
		);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to process unmatched files'
			},
			{ status: 500 }
		);
	}
};
