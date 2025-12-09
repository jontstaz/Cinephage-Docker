/**
 * OpenSubtitles.com API Types
 * Based on the REST API v1: https://opensubtitles.stoplight.io/
 */

/** API authentication response */
export interface OpenSubtitlesAuthResponse {
	user: {
		allowed_downloads: number;
		level: string;
		user_id: number;
		ext_installed: boolean;
		vip: boolean;
	};
	base_url: string;
	token: string;
	status: number;
}

/** Search request parameters */
export interface OpenSubtitlesSearchParams {
	// File-based search
	moviehash?: string;
	moviehash_match?: 'include' | 'only';

	// ID-based search
	imdb_id?: string;
	tmdb_id?: number;
	parent_tmdb_id?: number; // For TV shows

	// Text-based search
	query?: string;

	// TV show specific
	season_number?: number;
	episode_number?: number;

	// Filters
	languages?: string; // Comma-separated language codes
	year?: number;
	type?: 'movie' | 'episode' | 'all';
	hearing_impaired?: 'include' | 'exclude' | 'only';
	foreign_parts_only?: 'include' | 'exclude' | 'only';
	machine_translated?: 'include' | 'exclude';
	ai_translated?: 'include' | 'exclude';
	trusted_sources?: 'include' | 'only';

	// Ordering
	order_by?:
		| 'language'
		| 'download_count'
		| 'new_download_count'
		| 'hearing_impaired'
		| 'hd'
		| 'fps'
		| 'votes'
		| 'points'
		| 'ratings'
		| 'from_trusted'
		| 'foreign_parts_only'
		| 'upload_date'
		| 'ai_translated'
		| 'machine_translated';
	order_direction?: 'asc' | 'desc';

	// Pagination
	page?: number;
}

/** Single subtitle result from search */
export interface OpenSubtitlesResult {
	id: string;
	type: 'subtitle';
	attributes: {
		subtitle_id: string;
		language: string;
		download_count: number;
		new_download_count: number;
		hearing_impaired: boolean;
		hd: boolean;
		fps: number;
		votes: number;
		points: number;
		ratings: number;
		from_trusted: boolean;
		foreign_parts_only: boolean;
		upload_date: string;
		ai_translated: boolean;
		machine_translated: boolean;
		release: string;
		comments: string;
		legacy_subtitle_id: number;
		legacy_uploader_id: number;
		uploader: {
			uploader_id: number;
			name: string;
			rank: string;
		};
		feature_details: {
			feature_id: number;
			feature_type: 'Movie' | 'Episode';
			year: number;
			title: string;
			movie_name: string;
			imdb_id: number;
			tmdb_id: number;
			season_number?: number;
			episode_number?: number;
			parent_imdb_id?: number;
			parent_title?: string;
			parent_tmdb_id?: number;
			parent_feature_id?: number;
		};
		url: string;
		related_links: Array<{
			label: string;
			url: string;
			img_url: string;
		}>;
		files: Array<{
			file_id: number;
			cd_number: number;
			file_name: string;
		}>;
		moviehash_match?: boolean;
	};
}

/** Search response */
export interface OpenSubtitlesSearchResponse {
	total_pages: number;
	total_count: number;
	per_page: number;
	page: number;
	data: OpenSubtitlesResult[];
}

/** Download request */
export interface OpenSubtitlesDownloadRequest {
	file_id: number;
	sub_format?: 'srt' | 'webvtt';
	file_name?: string;
	in_fps?: number;
	out_fps?: number;
	timeshift?: number;
	force_download?: boolean;
}

/** Download response */
export interface OpenSubtitlesDownloadResponse {
	link: string;
	file_name: string;
	requests: number;
	remaining: number;
	message: string;
	reset_time: string;
	reset_time_utc: string;
}

/** User info response */
export interface OpenSubtitlesUserInfo {
	data: {
		allowed_downloads: number;
		allowed_translations: number;
		level: string;
		user_id: number;
		ext_installed: boolean;
		vip: boolean;
		downloads_count: number;
		remaining_downloads: number;
	};
}

/** API error response */
export interface OpenSubtitlesError {
	message?: string;
	errors?: string[];
	status?: number;
}

/** Supported languages by OpenSubtitles (ISO 639-1 codes) */
export const OPENSUBTITLES_LANGUAGES = [
	'af',
	'sq',
	'ar',
	'an',
	'hy',
	'at',
	'eu',
	'be',
	'bn',
	'bs',
	'br',
	'bg',
	'my',
	'ca',
	'zh',
	'cs',
	'da',
	'nl',
	'en',
	'eo',
	'et',
	'fi',
	'fr',
	'gl',
	'ka',
	'de',
	'el',
	'he',
	'hi',
	'hr',
	'hu',
	'is',
	'id',
	'it',
	'ja',
	'kn',
	'kk',
	'km',
	'ko',
	'ku',
	'lv',
	'lt',
	'lb',
	'mk',
	'ms',
	'ml',
	'mn',
	'no',
	'oc',
	'fa',
	'pl',
	'pt',
	'ro',
	'ru',
	'sr',
	'si',
	'sk',
	'sl',
	'es',
	'sw',
	'sv',
	'sy',
	'tl',
	'te',
	'th',
	'tr',
	'uk',
	'ur',
	'vi',
	'cy'
];
