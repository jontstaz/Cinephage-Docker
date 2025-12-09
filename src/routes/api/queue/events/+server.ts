import type { RequestHandler } from './$types';
import { downloadMonitor } from '$lib/server/downloadClients/monitoring';

/**
 * Server-Sent Events endpoint for real-time queue updates
 *
 * Events emitted:
 * - queue:added - New item added to queue
 * - queue:updated - Item status/progress changed
 * - queue:completed - Download completed
 * - queue:imported - Item imported to library
 * - queue:failed - Download or import failed
 * - queue:removed - Item removed from queue
 */
export const GET: RequestHandler = async ({ request }) => {
	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			// Send helper function
			const send = (event: string, data: unknown) => {
				controller.enqueue(encoder.encode(`event: ${event}\n`));
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
			};

			// Send initial connection event
			send('connected', { timestamp: new Date().toISOString() });

			// Set up heartbeat to keep connection alive
			const heartbeatInterval = setInterval(() => {
				try {
					send('heartbeat', { timestamp: new Date().toISOString() });
				} catch {
					// Connection closed
					clearInterval(heartbeatInterval);
				}
			}, 30000);

			// Subscribe to download monitor events
			const onQueueAdded = (item: unknown) => {
				try {
					send('queue:added', item);
				} catch {
					// Connection closed
				}
			};

			const onQueueUpdated = (item: unknown) => {
				try {
					send('queue:updated', item);
				} catch {
					// Connection closed
				}
			};

			const onQueueCompleted = (item: unknown) => {
				try {
					send('queue:completed', item);
				} catch {
					// Connection closed
				}
			};

			const onQueueFailed = (data: unknown) => {
				try {
					send('queue:failed', data);
				} catch {
					// Connection closed
				}
			};

			const onQueueImported = (data: unknown) => {
				try {
					send('queue:imported', data);
				} catch {
					// Connection closed
				}
			};

			const onQueueRemoved = (id: unknown) => {
				try {
					send('queue:removed', { id });
				} catch {
					// Connection closed
				}
			};

			// Register event handlers - match the event names from DownloadMonitorService
			downloadMonitor.on('queue:added', onQueueAdded);
			downloadMonitor.on('queue:updated', onQueueUpdated);
			downloadMonitor.on('queue:completed', onQueueCompleted);
			downloadMonitor.on('queue:failed', onQueueFailed);
			downloadMonitor.on('queue:imported', onQueueImported);
			downloadMonitor.on('queue:removed', onQueueRemoved);

			// Cleanup when connection closes
			request.signal.addEventListener('abort', () => {
				clearInterval(heartbeatInterval);
				downloadMonitor.off('queue:added', onQueueAdded);
				downloadMonitor.off('queue:updated', onQueueUpdated);
				downloadMonitor.off('queue:completed', onQueueCompleted);
				downloadMonitor.off('queue:failed', onQueueFailed);
				downloadMonitor.off('queue:imported', onQueueImported);
				downloadMonitor.off('queue:removed', onQueueRemoved);
				try {
					controller.close();
				} catch {
					// Controller may already be closed
				}
			});
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no' // Disable nginx buffering
		}
	});
};
