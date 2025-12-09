/**
 * Task History Service
 *
 * Manages task execution history and prevents concurrent task runs.
 * Tracks when tasks started, completed, failed, and their results.
 */

import { db } from '$lib/server/db';
import { taskHistory } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createChildLogger } from '$lib/logging';
import type { TaskHistoryEntry } from '$lib/types/task';

const logger = createChildLogger({ module: 'TaskHistoryService' });

/**
 * Service for managing task execution history
 */
class TaskHistoryService {
	private static instance: TaskHistoryService;

	/** In-memory set of currently running task IDs */
	private runningTasks: Set<string> = new Set();

	private constructor() {}

	static getInstance(): TaskHistoryService {
		if (!TaskHistoryService.instance) {
			TaskHistoryService.instance = new TaskHistoryService();
		}
		return TaskHistoryService.instance;
	}

	/**
	 * Start tracking a task execution.
	 * Creates a history entry with status='running'.
	 *
	 * @throws Error if the task is already running
	 */
	async startTask(taskId: string): Promise<string> {
		if (this.runningTasks.has(taskId)) {
			throw new Error(`Task '${taskId}' is already running`);
		}

		this.runningTasks.add(taskId);

		const [entry] = await db
			.insert(taskHistory)
			.values({
				taskId,
				status: 'running'
			})
			.returning({ id: taskHistory.id });

		logger.info('[TaskHistoryService] Task started', { taskId, historyId: entry.id });

		return entry.id;
	}

	/**
	 * Mark a task as completed with its results.
	 */
	async completeTask(historyId: string, results: Record<string, unknown>): Promise<void> {
		const [entry] = await db
			.update(taskHistory)
			.set({
				status: 'completed',
				results,
				completedAt: new Date().toISOString()
			})
			.where(eq(taskHistory.id, historyId))
			.returning({ taskId: taskHistory.taskId });

		if (entry) {
			this.runningTasks.delete(entry.taskId);
			logger.info('[TaskHistoryService] Task completed', { historyId, taskId: entry.taskId });
		}
	}

	/**
	 * Mark a task as failed with error messages.
	 */
	async failTask(historyId: string, errors: string[]): Promise<void> {
		const [entry] = await db
			.update(taskHistory)
			.set({
				status: 'failed',
				errors,
				completedAt: new Date().toISOString()
			})
			.where(eq(taskHistory.id, historyId))
			.returning({ taskId: taskHistory.taskId });

		if (entry) {
			this.runningTasks.delete(entry.taskId);
			logger.error('[TaskHistoryService] Task failed', {
				historyId,
				taskId: entry.taskId,
				errors
			});
		}
	}

	/**
	 * Get the most recent completed or failed run for a task.
	 */
	async getLastRunForTask(taskId: string): Promise<TaskHistoryEntry | null> {
		const [entry] = await db
			.select()
			.from(taskHistory)
			.where(eq(taskHistory.taskId, taskId))
			.orderBy(desc(taskHistory.startedAt))
			.limit(1);

		if (!entry) return null;

		return {
			id: entry.id,
			taskId: entry.taskId,
			status: entry.status as 'running' | 'completed' | 'failed',
			results: entry.results,
			errors: entry.errors,
			startedAt: entry.startedAt!,
			completedAt: entry.completedAt
		};
	}

	/**
	 * Get recent task history across all tasks.
	 */
	async getRecentHistory(limit: number = 20): Promise<TaskHistoryEntry[]> {
		const entries = await db
			.select()
			.from(taskHistory)
			.orderBy(desc(taskHistory.startedAt))
			.limit(limit);

		return entries.map((entry) => ({
			id: entry.id,
			taskId: entry.taskId,
			status: entry.status as 'running' | 'completed' | 'failed',
			results: entry.results,
			errors: entry.errors,
			startedAt: entry.startedAt!,
			completedAt: entry.completedAt
		}));
	}

	/**
	 * Check if a task is currently running.
	 */
	isTaskRunning(taskId: string): boolean {
		return this.runningTasks.has(taskId);
	}

	/**
	 * Clean up stale "running" entries on startup.
	 * This handles cases where the server crashed while a task was running.
	 */
	async cleanupStaleRunning(): Promise<void> {
		const staleEntries = await db
			.update(taskHistory)
			.set({
				status: 'failed',
				errors: ['Server restarted while task was running'],
				completedAt: new Date().toISOString()
			})
			.where(eq(taskHistory.status, 'running'))
			.returning({ id: taskHistory.id, taskId: taskHistory.taskId });

		if (staleEntries.length > 0) {
			logger.warn('[TaskHistoryService] Cleaned up stale running tasks', {
				count: staleEntries.length,
				tasks: staleEntries.map((e) => e.taskId)
			});
		}

		// Clear in-memory running set
		this.runningTasks.clear();
	}
}

export const taskHistoryService = TaskHistoryService.getInstance();
