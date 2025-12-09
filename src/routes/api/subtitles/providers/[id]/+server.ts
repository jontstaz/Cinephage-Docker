import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtitleProviderManager } from '$lib/server/subtitles/services/SubtitleProviderManager';
import { subtitleProviderUpdateSchema } from '$lib/validation/schemas';

/**
 * GET /api/subtitles/providers/:id
 * Get a single subtitle provider by ID.
 */
export const GET: RequestHandler = async ({ params }) => {
	const manager = await getSubtitleProviderManager();
	const provider = await manager.getProvider(params.id);

	if (!provider) {
		return json({ error: 'Provider not found' }, { status: 404 });
	}

	// Redact sensitive fields
	return json({
		...provider,
		apiKey: provider.apiKey ? '[REDACTED]' : null,
		password: provider.password ? '[REDACTED]' : null
	});
};

/**
 * PUT /api/subtitles/providers/:id
 * Update a subtitle provider.
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = subtitleProviderUpdateSchema.safeParse(data);

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
	const manager = await getSubtitleProviderManager();

	try {
		const updated = await manager.updateProvider(params.id, {
			name: validated.name,
			enabled: validated.enabled,
			priority: validated.priority,
			apiKey: validated.apiKey ?? undefined,
			username: validated.username ?? undefined,
			password: validated.password ?? undefined,
			settings: (validated.settings as Record<string, unknown>) ?? undefined,
			requestsPerMinute: validated.requestsPerMinute
		});

		return json({ success: true, provider: updated });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		if (message.includes('not found')) {
			return json({ error: message }, { status: 404 });
		}
		return json({ error: message }, { status: 500 });
	}
};

/**
 * DELETE /api/subtitles/providers/:id
 * Delete a subtitle provider.
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const manager = await getSubtitleProviderManager();

	try {
		await manager.deleteProvider(params.id);
		return json({ success: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		if (message.includes('not found')) {
			return json({ error: message }, { status: 404 });
		}
		return json({ error: message }, { status: 500 });
	}
};
