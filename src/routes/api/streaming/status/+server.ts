/**
 * Streaming Status API Endpoint
 *
 * Returns health and status of all streaming providers.
 * Useful for monitoring and debugging streaming issues.
 *
 * GET /api/streaming/status - Get all provider status
 * POST /api/streaming/status - Perform actions (reset circuit breakers)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAllProviderStatus,
	resetCircuitBreaker,
	clearCaches,
	getProviderIds,
	type ProviderStatus
} from '$lib/server/streaming/providers';
import { logger } from '$lib/logging';

const streamLog = { logCategory: 'streams' as const };

/**
 * Response structure for streaming status
 */
export interface StreamingStatusResponse {
	success: boolean;
	timestamp: string;
	providers: Array<{
		id: string;
		name: string;
		enabled: boolean;
		score: number;
		circuitBreaker: {
			isOpen: boolean;
			isHalfOpen: boolean;
			failures: number;
			resetAt?: string;
		};
		health: {
			successCount: number;
			failureCount: number;
			successRate: number;
			averageLatencyMs: number;
			lastSuccess?: string;
			lastFailure?: string;
		};
	}>;
	summary: {
		totalProviders: number;
		enabledProviders: number;
		healthyProviders: number;
		circuitBrokenProviders: number;
	};
}

/**
 * GET /api/streaming/status
 * Returns comprehensive status of all streaming providers
 */
export const GET: RequestHandler = async () => {
	try {
		const statuses = getAllProviderStatus();

		const providers = statuses.map((s: ProviderStatus) => ({
			id: s.id,
			name: s.name,
			enabled: s.enabled,
			score: Math.round(s.score * 100) / 100,
			circuitBreaker: {
				isOpen: s.circuitBreaker.isOpen,
				isHalfOpen: s.circuitBreaker.isHalfOpen,
				failures: s.circuitBreaker.failures,
				resetAt: s.circuitBreaker.resetAt
					? new Date(s.circuitBreaker.resetAt).toISOString()
					: undefined
			},
			health: {
				successCount: s.health.successCount,
				failureCount: s.health.failureCount,
				successRate: Math.round(s.health.successRate * 1000) / 1000,
				averageLatencyMs: Math.round(s.health.averageLatencyMs),
				lastSuccess: s.health.lastSuccess?.toISOString(),
				lastFailure: s.health.lastFailure?.toISOString()
			}
		}));

		const enabledCount = providers.filter((p) => p.enabled).length;
		const healthyCount = providers.filter(
			(p) => p.enabled && !p.circuitBreaker.isOpen && p.health.successRate >= 0.5
		).length;
		const circuitBrokenCount = providers.filter(
			(p) => p.circuitBreaker.isOpen && !p.circuitBreaker.isHalfOpen
		).length;

		const response: StreamingStatusResponse = {
			success: true,
			timestamp: new Date().toISOString(),
			providers,
			summary: {
				totalProviders: providers.length,
				enabledProviders: enabledCount,
				healthyProviders: healthyCount,
				circuitBrokenProviders: circuitBrokenCount
			}
		};

		return json(response);
	} catch (error) {
		logger.error('Failed to get streaming status', error, streamLog);
		return json({ success: false, error: 'Failed to get streaming status' }, { status: 500 });
	}
};

/**
 * POST /api/streaming/status
 * Perform actions on streaming providers
 *
 * Actions:
 * - { action: "reset", providerId: "videasy" } - Reset single circuit breaker
 * - { action: "reset-all" } - Reset all circuit breakers and caches
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { action, providerId } = body;

		if (action === 'reset' && providerId) {
			// Validate providerId
			const validIds = getProviderIds();
			if (!validIds.includes(providerId)) {
				return json(
					{
						success: false,
						error: `Invalid provider ID: ${providerId}`,
						validIds
					},
					{ status: 400 }
				);
			}

			const success = resetCircuitBreaker(providerId);
			return json({
				success,
				message: success
					? `Circuit breaker reset for ${providerId}`
					: `Failed to reset ${providerId}`
			});
		}

		if (action === 'reset-all') {
			clearCaches();
			logger.info('All streaming caches and circuit breakers reset', streamLog);
			return json({
				success: true,
				message: 'All caches and circuit breakers reset'
			});
		}

		return json(
			{
				success: false,
				error: 'Invalid action',
				validActions: ['reset', 'reset-all']
			},
			{ status: 400 }
		);
	} catch (error) {
		logger.error('Failed to process streaming status action', error, streamLog);
		return json({ success: false, error: 'Failed to process action' }, { status: 500 });
	}
};
