/**
 * HLS Stream Proxy - Path-based routing
 *
 * Handles proxy requests with path suffixes like /segment.ts or /playlist.m3u8
 * This is needed because FFmpeg's HLS parser requires URLs to end with
 * recognized extensions (.ts, .m3u8, etc.)
 *
 * GET /api/streaming/proxy/segment.ts?url=<encoded_url>&referer=<encoded_referer>
 * GET /api/streaming/proxy/playlist.m3u8?url=<encoded_url>&referer=<encoded_referer>
 */

import type { RequestHandler } from './$types';
import { GET as proxyHandler, OPTIONS as optionsHandler } from '../+server';

// Forward all requests to the main proxy handler
// The path suffix (segment.ts, playlist.m3u8, etc.) is just for FFmpeg compatibility
// Cast needed because routes have different path signatures but same logic
export const GET: RequestHandler = proxyHandler as unknown as RequestHandler;
export const OPTIONS: RequestHandler = optionsHandler as unknown as RequestHandler;
