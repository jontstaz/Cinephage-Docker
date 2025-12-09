import type { RequestHandler } from './$types.js';
import { librarySchedulerService, diskScanService } from '$lib/server/library/index.js';

/**
 * GET /api/library/scan/status
 * Get current scan status (Server-Sent Events for real-time updates)
 */
export const GET: RequestHandler = async ({ request }) => {
	// Check if client wants SSE
	const acceptHeader = request.headers.get('accept');
	const wantsSSE = acceptHeader?.includes('text/event-stream');

	if (wantsSSE) {
		// Return Server-Sent Events stream for real-time progress
		const encoder = new TextEncoder();
		let cancelled = false;

		const stream = new ReadableStream({
			async start(controller) {
				// Send current status immediately
				const status = await librarySchedulerService.getStatus();
				const event = `data: ${JSON.stringify(status)}\n\n`;
				controller.enqueue(encoder.encode(event));

				// Progress event handler
				const onProgress = (progress: unknown) => {
					if (cancelled) return;
					try {
						const event = `event: progress\ndata: ${JSON.stringify(progress)}\n\n`;
						controller.enqueue(encoder.encode(event));
					} catch {
						// Stream might be closed
					}
				};

				// Scan start handler
				const onScanStart = (data: unknown) => {
					if (cancelled) return;
					try {
						const event = `event: scanStart\ndata: ${JSON.stringify(data)}\n\n`;
						controller.enqueue(encoder.encode(event));
					} catch {
						// Stream might be closed
					}
				};

				// Scan complete handler
				const onScanComplete = (data: unknown) => {
					if (cancelled) return;
					try {
						const event = `event: scanComplete\ndata: ${JSON.stringify(data)}\n\n`;
						controller.enqueue(encoder.encode(event));
					} catch {
						// Stream might be closed
					}
				};

				// Scan error handler
				const onScanError = (data: unknown) => {
					if (cancelled) return;
					try {
						const event = `event: scanError\ndata: ${JSON.stringify(data)}\n\n`;
						controller.enqueue(encoder.encode(event));
					} catch {
						// Stream might be closed
					}
				};

				// Listen to events from both services
				diskScanService.on('progress', onProgress);
				librarySchedulerService.on('scanStart', onScanStart);
				librarySchedulerService.on('scanComplete', onScanComplete);
				librarySchedulerService.on('scanError', onScanError);

				// Keep connection alive with heartbeat
				const heartbeat = setInterval(() => {
					if (cancelled) {
						clearInterval(heartbeat);
						return;
					}
					try {
						controller.enqueue(encoder.encode(': heartbeat\n\n'));
					} catch {
						clearInterval(heartbeat);
					}
				}, 30000);

				// Cleanup when cancelled
				request.signal.addEventListener('abort', () => {
					cancelled = true;
					clearInterval(heartbeat);
					diskScanService.removeListener('progress', onProgress);
					librarySchedulerService.removeListener('scanStart', onScanStart);
					librarySchedulerService.removeListener('scanComplete', onScanComplete);
					librarySchedulerService.removeListener('scanError', onScanError);
					try {
						controller.close();
					} catch {
						// Already closed
					}
				});
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	}

	// Regular JSON response
	const status = await librarySchedulerService.getStatus();

	return new Response(JSON.stringify({ success: true, ...status }), {
		headers: {
			'Content-Type': 'application/json'
		}
	});
};
