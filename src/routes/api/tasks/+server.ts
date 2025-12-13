/**
 * Unified Tasks API
 *
 * GET /api/tasks - Returns all tasks with their current status
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	UNIFIED_TASK_DEFINITIONS,
	type UnifiedTask,
	type UnifiedTaskDefinition
} from '$lib/server/tasks/UnifiedTaskRegistry';
import { monitoringScheduler } from '$lib/server/monitoring/MonitoringScheduler';
import { taskHistoryService } from '$lib/server/tasks/TaskHistoryService';

/**
 * GET /api/tasks
 *
 * Returns all unified tasks with their current status including:
 * - Task definitions (name, description, category)
 * - Runtime status (lastRunTime, nextRunTime, intervalHours, isRunning)
 */
export const GET: RequestHandler = async () => {
	// Get monitoring status for scheduled tasks
	const monitoringStatus = await monitoringScheduler.getStatus();

	// Build unified task list with status
	const tasks: UnifiedTask[] = await Promise.all(
		UNIFIED_TASK_DEFINITIONS.map(async (def: UnifiedTaskDefinition) => {
			if (def.category === 'scheduled') {
				// Get status from MonitoringScheduler
				const taskKey = def.id as keyof typeof monitoringStatus.tasks;
				const status = monitoringStatus.tasks[taskKey];

				return {
					...def,
					lastRunTime: status?.lastRunTime?.toISOString() ?? null,
					nextRunTime: status?.nextRunTime?.toISOString() ?? null,
					intervalHours: status?.intervalHours ?? def.defaultIntervalHours ?? null,
					isRunning: status?.isRunning ?? false
				};
			} else {
				// Get status from TaskHistoryService for maintenance tasks
				const lastRun = await taskHistoryService.getLastRunForTask(def.id);
				const isRunning = taskHistoryService.isTaskRunning(def.id);

				return {
					...def,
					lastRunTime: lastRun?.completedAt ?? lastRun?.startedAt ?? null,
					nextRunTime: null, // Manual tasks don't have scheduled next runs
					intervalHours: null, // Manual tasks don't have intervals
					isRunning
				};
			}
		})
	);

	return json({
		success: true,
		tasks
	});
};
