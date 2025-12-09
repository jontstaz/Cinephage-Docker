/**
 * Common types for stream extraction
 */

// ============================================================================
// Subtitle Types
// ============================================================================

/**
 * A subtitle track associated with a stream
 */
export interface SubtitleTrack {
	/** Subtitle file URL */
	url: string;

	/** Language code (e.g., 'en', 'es') */
	language: string;

	/** Display label (e.g., 'English', 'Spanish') */
	label: string;
}

// ============================================================================
// Stream Source Types
// ============================================================================

export interface StreamSource {
	/** Quality label (e.g., '1080p', '720p', '4K', 'Auto') */
	quality: string;

	/** Display title for the stream */
	title: string;

	/** Stream URL (HLS/M3U8/MP4) */
	url: string;

	/** Stream type */
	type: 'hls' | 'm3u8';

	/** Referer header needed to play the stream */
	referer: string;

	/** Whether the stream requires segment proxying */
	requiresSegmentProxy: boolean;

	/** Stream availability status */
	status?: 'working' | 'down' | 'unknown';

	/** Server/source name within the provider */
	server?: string;

	/** Associated subtitle tracks */
	subtitles?: SubtitleTrack[];

	/** Additional headers needed for playback */
	headers?: Record<string, string>;
}

// ============================================================================
// Extraction Result Types
// ============================================================================

export interface ExtractionResult {
	/** Whether extraction was successful */
	success: boolean;

	/** Extracted stream sources */
	sources: StreamSource[];

	/** Error message if failed */
	error?: string;

	/** Provider that produced this result */
	provider?: string;
}

// ============================================================================
// Extraction Options Types
// ============================================================================

export interface ExtractorOptions {
	/** TMDB ID (required) */
	tmdbId: string;

	/** Media type */
	type: 'movie' | 'tv';

	/** Season number for TV shows */
	season?: number;

	/** Episode number for TV shows */
	episode?: number;

	/** IMDB ID (optional, some providers use it) */
	imdbId?: string;

	/** Content title (optional, some providers use it) */
	title?: string;

	/** Release year (optional) */
	year?: number;
}
