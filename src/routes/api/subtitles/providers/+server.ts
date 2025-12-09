import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtitleProviderManager } from '$lib/server/subtitles/services/SubtitleProviderManager';
import { SubtitleProviderFactory } from '$lib/server/subtitles/providers/SubtitleProviderFactory';
import { subtitleProviderCreateSchema } from '$lib/validation/schemas';

/**
 * GET /api/subtitles/providers
 * List all configured subtitle providers.
 * Note: API keys and passwords are redacted for security.
 */
export const GET: RequestHandler = async () => {
	const manager = await getSubtitleProviderManager();
	const providers = await manager.getProviders();

	// Redact sensitive fields
	const redactedProviders = providers.map((provider) => ({
		...provider,
		apiKey: provider.apiKey ? '[REDACTED]' : null,
		password: provider.password ? '[REDACTED]' : null,
		settings: provider.settings
			? Object.fromEntries(
					Object.entries(provider.settings).map(([key, value]) => {
						const lowerKey = key.toLowerCase();
						if (
							lowerKey.includes('key') ||
							lowerKey.includes('password') ||
							lowerKey.includes('secret') ||
							lowerKey.includes('token')
						) {
							return [key, value ? '[REDACTED]' : null];
						}
						return [key, value];
					})
				)
			: null
	}));

	return json(redactedProviders);
};

/**
 * POST /api/subtitles/providers
 * Create a new subtitle provider.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = subtitleProviderCreateSchema.safeParse(data);

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

	// Verify the implementation is supported
	const factory = new SubtitleProviderFactory();
	const definition = factory.getDefinition(validated.implementation);
	if (!definition) {
		return json(
			{
				error: 'Invalid implementation',
				details: `Unknown provider implementation: ${validated.implementation}`
			},
			{ status: 400 }
		);
	}

	try {
		const created = await manager.createProvider({
			name: validated.name,
			implementation: validated.implementation,
			enabled: validated.enabled,
			priority: validated.priority,
			apiKey: validated.apiKey ?? undefined,
			username: validated.username ?? undefined,
			password: validated.password ?? undefined,
			settings: (validated.settings as Record<string, unknown>) ?? undefined,
			requestsPerMinute: validated.requestsPerMinute
		});

		return json({ success: true, provider: created });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
