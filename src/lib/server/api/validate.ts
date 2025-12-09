/**
 * API validation helpers.
 * Reduces boilerplate for Zod validation in API routes.
 */

import { json } from '@sveltejs/kit';
import type { z } from 'zod';

/**
 * Result of validating a request body.
 */
export type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; response: Response };

/**
 * Validate a request body against a Zod schema.
 *
 * @example
 * const validation = await validateRequestBody(request, mySchema);
 * if (!validation.success) return validation.response;
 * const { data } = validation;
 */
export async function validateRequestBody<T>(
	request: Request,
	schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return {
			success: false,
			response: json({ error: 'Invalid JSON body' }, { status: 400 })
		};
	}

	const result = schema.safeParse(body);

	if (!result.success) {
		return {
			success: false,
			response: json(
				{
					error: 'Validation failed',
					details: result.error.flatten()
				},
				{ status: 400 }
			)
		};
	}

	return { success: true, data: result.data };
}

/**
 * Validate URL search params against a Zod schema.
 *
 * @example
 * const validation = validateSearchParams(url.searchParams, mySchema);
 * if (!validation.success) return validation.response;
 * const { data } = validation;
 */
export function validateSearchParams<T>(
	searchParams: URLSearchParams,
	schema: z.ZodSchema<T>
): ValidationResult<T> {
	const params = Object.fromEntries(searchParams.entries());
	const result = schema.safeParse(params);

	if (!result.success) {
		return {
			success: false,
			response: json(
				{
					error: 'Invalid query parameters',
					details: result.error.flatten()
				},
				{ status: 400 }
			)
		};
	}

	return { success: true, data: result.data };
}

/**
 * Create a standard error response.
 */
export function errorResponse(message: string, status: number = 500): Response {
	return json({ error: message }, { status });
}

/**
 * Create a standard success response.
 */
export function successResponse<T>(data: T, status: number = 200): Response {
	return json(data, { status });
}
