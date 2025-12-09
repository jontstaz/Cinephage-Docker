import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { subtitleProviderTestSchema } from '$lib/validation/schemas';
import { SubtitleProviderFactory } from '$lib/server/subtitles/providers/SubtitleProviderFactory';

/**
 * POST /api/subtitles/providers/test
 * Test a subtitle provider configuration.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = subtitleProviderTestSchema.safeParse(data);

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
	const factory = new SubtitleProviderFactory();

	// Create a temporary provider config for testing
	const testConfig = {
		id: 'test',
		name: 'Test Provider',
		implementation: validated.implementation,
		enabled: true,
		priority: 1,
		apiKey: validated.apiKey ?? undefined,
		username: validated.username ?? undefined,
		password: validated.password ?? undefined,
		settings: (validated.settings as Record<string, unknown>) ?? undefined,
		requestsPerMinute: 60,
		consecutiveFailures: 0
	};

	try {
		const provider = factory.createProvider(testConfig);
		const testResult = await provider.test();

		return json({
			success: testResult.success,
			message: testResult.message,
			responseTime: testResult.responseTime
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json(
			{
				success: false,
				message,
				responseTime: 0
			},
			{ status: 200 }
		); // Return 200 since the test itself completed, just with a failure
	}
};
