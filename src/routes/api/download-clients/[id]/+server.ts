import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDownloadClientManager } from '$lib/server/downloadClients';
import { downloadClientUpdateSchema } from '$lib/validation/schemas';

/**
 * GET /api/download-clients/[id]
 * Get a single download client.
 */
export const GET: RequestHandler = async ({ params }) => {
	const manager = getDownloadClientManager();
	const client = await manager.getClient(params.id);

	if (!client) {
		return json({ error: 'Download client not found' }, { status: 404 });
	}

	return json(client);
};

/**
 * PUT /api/download-clients/[id]
 * Update a download client.
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = downloadClientUpdateSchema.safeParse(data);

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
	const manager = getDownloadClientManager();

	try {
		const updated = await manager.updateClient(params.id, validated);
		return json({ success: true, client: updated });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		if (message.includes('not found')) {
			return json({ error: message }, { status: 404 });
		}
		return json({ error: message }, { status: 500 });
	}
};

/**
 * DELETE /api/download-clients/[id]
 * Delete a download client.
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const manager = getDownloadClientManager();

	try {
		await manager.deleteClient(params.id);
		return json({ success: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
