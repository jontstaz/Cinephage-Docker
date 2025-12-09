/**
 * Task Registry
 *
 * Central registry of all available system tasks.
 * Tasks are manual maintenance operations that users can trigger from the Tasks page.
 *
 * To add a new task:
 * 1. Add an entry to TASK_DEFINITIONS with a unique id
 * 2. Ensure the endpoint exists and returns { success: boolean, ... }
 */

import type { TaskDefinition } from '$lib/types/task';

/**
 * All available system tasks
 */
export const TASK_DEFINITIONS: TaskDefinition[] = [
	{
		id: 'update-strm-urls',
		name: 'Update .strm URLs',
		description:
			'Update all .strm files with the current streaming base URL. Run this after changing your server address, port, or domain.',
		endpoint: '/api/streaming/strm/update',
		category: 'maintenance'
	}
	// Future tasks can be added here:
	// {
	//   id: 'clean-orphaned-files',
	//   name: 'Clean Orphaned Files',
	//   description: 'Remove files on disk that have no matching database entries.',
	//   endpoint: '/api/library/clean-orphaned',
	//   category: 'housekeeping'
	// },
	// {
	//   id: 'refresh-metadata',
	//   name: 'Refresh All Metadata',
	//   description: 'Re-fetch TMDB metadata for all movies and TV shows.',
	//   endpoint: '/api/library/refresh-metadata',
	//   category: 'sync'
	// },
];

/**
 * Get a task definition by its ID
 */
export function getTaskById(id: string): TaskDefinition | undefined {
	return TASK_DEFINITIONS.find((t) => t.id === id);
}

/**
 * Get all tasks in a specific category
 */
export function getTasksByCategory(category: TaskDefinition['category']): TaskDefinition[] {
	return TASK_DEFINITIONS.filter((t) => t.category === category);
}
