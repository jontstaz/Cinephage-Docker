/**
 * Unit3D API Types
 *
 * Type definitions for the Unit3D torrent tracker software API.
 * Unit3D is a popular open-source torrent tracker software used by many
 * private trackers including Aither, BLU, Torrentleech, etc.
 *
 * @see https://github.com/HDIndustry/UNIT3D-Community-Edition
 */

/**
 * Unit3D API response wrapper.
 * The API returns data in a JSON:API-like structure.
 */
export interface Unit3dResponse {
	/** Array of torrent results */
	data: Unit3dTorrent[];
	/** Pagination links */
	links?: Unit3dLinks;
	/** Current page metadata */
	meta?: Unit3dMeta;
}

/**
 * Individual torrent result from Unit3D API.
 */
export interface Unit3dTorrent {
	/** Resource type (always "torrent") */
	type: string;
	/** Torrent ID */
	id: string;
	/** Torrent attributes/data */
	attributes: Unit3dTorrentAttributes;
}

/**
 * Torrent attributes from Unit3D API.
 */
export interface Unit3dTorrentAttributes {
	/** Torrent name/title */
	name: string;

	/** Release year */
	release_year?: number;

	/** Category name (e.g., "Movies", "TV") */
	category: string;

	/** Encoding/codec */
	encode?: string;

	/** Resolution (e.g., "2160p", "1080p") */
	resolution?: string;

	/** Type name (e.g., "Remux", "Encode") */
	type?: string;

	/** File size in bytes */
	size: number;

	/** Number of files */
	num_file?: number;

	/** Number of times downloaded/completed */
	times_completed: number;

	/** Number of seeders */
	seeders: number;

	/** Number of leechers */
	leechers: number;

	/** Creation timestamp (ISO 8601 format) */
	created_at: string;

	/** Download URL (includes passkey) */
	download_link: string;

	/** Details page URL */
	details_link: string;

	/** Info hash (lowercase hex) */
	info_hash?: string;

	/** IMDB ID (format: tt1234567, just 1234567, or numeric) */
	imdb_id?: string | number;

	/** TMDB ID */
	tmdb_id?: string | number;

	/** TVDB ID */
	tvdb_id?: string | number;

	/** IGDB ID (games) */
	igdb_id?: string | number;

	/** MyAnimeList ID */
	mal_id?: string | number;

	/** Is double upload active */
	double_upload?: boolean;

	/** Is freeleech active (can be boolean or string like "100%", "50%") */
	freeleech?: boolean | string;

	/** Is featured/sticky */
	featured?: boolean;

	/** Is internal release */
	internal?: boolean;

	/** Is personal release */
	personal_release?: boolean;

	/** Uploader username */
	uploader?: string;
}

/**
 * Pagination links in Unit3D API response.
 */
export interface Unit3dLinks {
	/** First page URL */
	first?: string;
	/** Last page URL */
	last?: string;
	/** Previous page URL */
	prev?: string;
	/** Next page URL */
	next?: string;
	/** Current page URL */
	self?: string;
}

/**
 * Pagination metadata in Unit3D API response.
 */
export interface Unit3dMeta {
	/** Current page number */
	current_page?: number;
	/** Items per page */
	per_page?: number;
	/** Total number of items */
	total?: number;
	/** Last page number */
	last_page?: number;
}

/**
 * Unit3D indexer settings.
 */
export interface Unit3dSettings {
	/** API key/token for authentication */
	apiKey: string;

	/** Filter to freeleech only */
	freeleechOnly?: boolean;

	/** Filter to double upload only */
	doubleUploadOnly?: boolean;

	/** Filter to internal releases only */
	internalOnly?: boolean;

	/** Filter to personal releases only */
	personalReleaseOnly?: boolean;

	/** Default categories to include */
	defaultCategories?: number[];
}

/**
 * Category mapping for Unit3D trackers.
 * Maps Unit3D category names to Newznab category IDs.
 */
export interface Unit3dCategoryMapping {
	/** Unit3D category name (e.g., "Movies") */
	name: string;
	/** Newznab category ID */
	id: number;
	/** Optional subcategories */
	subCategories?: Unit3dCategoryMapping[];
}

/**
 * Search parameters for Unit3D API /api/torrents/filter endpoint.
 * @see https://hdinnovations.github.io/UNIT3D/torrent_api.html
 */
export interface Unit3dSearchParams {
	/** API token (required) */
	api_token: string;

	// Pagination & Sorting
	/** Amount of results to return per page (default: 25) */
	perPage?: number;
	/** Field to sort by */
	sortField?: string;
	/** Direction to sort: 'asc' or 'desc' (default: 'asc') */
	sortDirection?: 'asc' | 'desc';

	// Text Filters
	/** Filter by the torrent's name */
	name?: string;
	/** Filter by the torrent's description */
	description?: string;
	/** Filter by the torrent's MediaInfo */
	mediainfo?: string;
	/** Filter by the torrent's BDInfo */
	bdinfo?: string;
	/** Filter by the torrent uploader's username */
	uploader?: string;
	/** Filter by any of the torrent's keywords (comma-separated) */
	keywords?: string;
	/** Filter by the name of a file within a torrent */
	file_name?: string;

	// Year Filters
	/** Return only torrents whose content was released after or in the given year */
	startYear?: number;
	/** Return only torrents whose content was released before or in the given year */
	endYear?: number;

	// Category/Type Filters (arrays)
	/** Filter by the torrent's category (array of IDs) */
	categories?: number[];
	/** Filter by the torrent's type (array of IDs) */
	types?: number[];
	/** Filter by the torrent's resolution (array of IDs) */
	resolutions?: number[];
	/** Filter by the torrent's genre (array of IDs) */
	genres?: number[];

	// External ID Filters
	/** Filter by the torrent's TMDB ID */
	tmdbId?: number;
	/** Filter by the torrent's IMDB ID */
	imdbId?: number | string;
	/** Filter by the torrent's TVDB ID */
	tvdbId?: number;
	/** Filter by the torrent's MAL ID */
	malId?: number;

	// Collection Filters
	/** Return only torrents within the playlist of the given ID */
	playlistId?: number;
	/** Return only torrents within the collection of the given ID */
	collectionId?: number;

	// Promo/Status Filters
	/** Filter by the torrent's freeleech discount (0-100) */
	free?: number;
	/** Filter by if the torrent offers double upload */
	doubleup?: boolean;
	/** Filter by if the torrent is featured on the front page */
	featured?: boolean;
	/** Filter by if the torrent is refundable */
	refundable?: boolean;
	/** Filter by if the torrent has seedbox seeders */
	highspeed?: boolean;
	/** Filter by if the torrent is an internal release */
	internal?: boolean;
	/** Filter by if the torrent's content is created by the uploader */
	personalRelease?: boolean;

	// Seeder Status Filters
	/** Filter by if the torrent has 1 or more seeders */
	alive?: boolean;
	/** Filter by if the torrent has 1 seeder and >3 downloads */
	dying?: boolean;
	/** Filter by if the torrent has 0 seeders */
	dead?: boolean;

	// TV Filters
	/** Filter by the torrent's season number */
	seasonNumber?: number;
	/** Filter by the torrent's episode number */
	episodeNumber?: number;
}
