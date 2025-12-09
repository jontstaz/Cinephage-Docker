import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { unmatchedFiles, rootFolders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const files = await db
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

	return {
		files,
		total: files.length
	};
};
