/**
 * Tasks Page Server Load
 *
 * Loads task definitions, their current status, and recent history.
 */

import type { PageServerLoad } from './$types';
import { TASK_DEFINITIONS } from '$lib/server/tasks/registry';
import { taskHistoryService } from '$lib/server/tasks/TaskHistoryService';
import type { TaskStatus } from '$lib/types/task';

export const load: PageServerLoad = async () => {
	// Get status for each task (last run info and running state)
	const taskStatuses: TaskStatus[] = await Promise.all(
		TASK_DEFINITIONS.map(async (def) => ({
			taskId: def.id,
			lastRun: await taskHistoryService.getLastRunForTask(def.id),
			isRunning: taskHistoryService.isTaskRunning(def.id)
		}))
	);

	// Get recent task history
	const recentHistory = await taskHistoryService.getRecentHistory(20);

	return {
		tasks: TASK_DEFINITIONS,
		taskStatuses,
		recentHistory
	};
};
