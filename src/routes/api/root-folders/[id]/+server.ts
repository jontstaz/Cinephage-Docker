import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRootFolderService } from '$lib/server/downloadClients';
import { rootFolderUpdateSchema } from '$lib/validation/schemas';

/**
 * GET /api/root-folders/[id]
 * Get a single root folder with current free space.
 */
export const GET: RequestHandler = async ({ params }) => {
	const service = getRootFolderService();
	const folder = await service.getFolder(params.id);

	if (!folder) {
		return json({ error: 'Root folder not found' }, { status: 404 });
	}

	return json(folder);
};

/**
 * PUT /api/root-folders/[id]
 * Update a root folder.
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = rootFolderUpdateSchema.safeParse(data);

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
	const service = getRootFolderService();

	try {
		const updated = await service.updateFolder(params.id, validated);
		return json({ success: true, folder: updated });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		if (message.includes('not found')) {
			return json({ error: message }, { status: 404 });
		}
		return json({ error: message }, { status: 500 });
	}
};

/**
 * DELETE /api/root-folders/[id]
 * Delete a root folder.
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const service = getRootFolderService();

	try {
		await service.deleteFolder(params.id);
		return json({ success: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
