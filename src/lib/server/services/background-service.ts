/**
 * Background Service Interface
 *
 * Defines the contract for services that run in the background
 * without blocking the main event loop or HTTP request handling.
 */

export type ServiceStatus = 'pending' | 'starting' | 'ready' | 'error';

/**
 * BackgroundService interface
 *
 * All background services should implement this interface.
 * Key principle: start() must return immediately and perform
 * work asynchronously via setImmediate() or similar mechanisms.
 */
export interface BackgroundService {
	/**
	 * Unique name for the service
	 */
	readonly name: string;

	/**
	 * Current status of the service
	 */
	readonly status: ServiceStatus;

	/**
	 * Error if status is 'error'
	 */
	readonly error?: Error;

	/**
	 * Start the service (non-blocking)
	 *
	 * This method MUST return immediately without blocking.
	 * Use setImmediate() or queueMicrotask() to defer actual work.
	 */
	start(): void;

	/**
	 * Stop the service gracefully
	 *
	 * This can be async and should clean up resources.
	 */
	stop(): Promise<void>;
}

/**
 * Service status info returned by the manager
 */
export interface ServiceStatusInfo {
	name: string;
	status: ServiceStatus;
	error?: string;
}
