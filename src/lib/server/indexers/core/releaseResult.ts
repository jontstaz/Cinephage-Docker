/**
 * Release result types representing search results from indexers.
 */

import type { IndexerProtocol, Category } from './types';
import type { ParsedRelease } from '../parser/types.js';
import type { QualityMatchResult, ScoreComponents } from '../../quality/types.js';
import type { TmdbMatch } from '../../quality/TmdbMatcher.js';
import type { ScoringResult } from '../../scoring/index.js';

/** A release result from an indexer */
export interface ReleaseResult {
	/** Unique identifier (indexer-specific) */
	guid: string;
	/** Release title */
	title: string;
	/** Download link (torrent file, NZB, or magnet) */
	downloadUrl: string;
	/** Magnet URL if available */
	magnetUrl?: string;
	/** Info hash for torrents */
	infoHash?: string;
	/** Link to comments/details page */
	commentsUrl?: string;
	/** Publication date */
	publishDate: Date;
	/** Size in bytes */
	size: number;
	/** Indexer ID that provided this result */
	indexerId: string;
	/** Indexer display name */
	indexerName: string;
	/** Protocol (torrent/usenet) */
	protocol: IndexerProtocol;
	/** Categories */
	categories: Category[];

	// Torrent-specific
	/** Number of seeders */
	seeders?: number;
	/** Number of leechers */
	leechers?: number;
	/** Number of completed downloads */
	grabs?: number;

	// Usenet-specific
	/** Poster name */
	poster?: string;
	/** Usenet group */
	group?: string;

	// Metadata (if indexer provides it)
	/** IMDB ID if known */
	imdbId?: string;
	/** TMDB ID if known */
	tmdbId?: number;
	/** TVDB ID if known */
	tvdbId?: number;
	/** Season number if applicable */
	season?: number;
	/** Episode number if applicable */
	episode?: number;
}

/** Minimal release info for internal processing (deduplication, ranking) */
export interface ReleaseInfo {
	guid: string;
	title: string;
	indexerId: string;
	size: number;
	seeders?: number;
	publishDate: Date;
	infoHash?: string;
}

/** Convert ReleaseResult to ReleaseInfo */
export function toReleaseInfo(release: ReleaseResult): ReleaseInfo {
	return {
		guid: release.guid,
		title: release.title,
		indexerId: release.indexerId,
		size: release.size,
		seeders: release.seeders,
		publishDate: release.publishDate,
		infoHash: release.infoHash
	};
}

/** Check if a release has usable download info */
export function hasDownloadInfo(release: ReleaseResult): boolean {
	return !!(release.downloadUrl || release.magnetUrl || release.infoHash);
}

/** Get the best download URL for a release */
export function getBestDownloadUrl(release: ReleaseResult): string | undefined {
	// Prefer magnet for torrents (no tracking, works offline)
	if (release.magnetUrl) return release.magnetUrl;
	if (release.downloadUrl) return release.downloadUrl;
	return undefined;
}

/** Format file size for display */
export function formatSize(bytes: number): string {
	if (bytes === 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

/** Parse a size string into bytes */
export function parseSize(sizeStr: string): number {
	const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)?$/i);
	if (!match) return 0;

	const value = parseFloat(match[1]);
	const unit = (match[2] || 'B').toUpperCase();

	const multipliers: Record<string, number> = {
		B: 1,
		KB: 1024,
		KIB: 1024,
		MB: 1024 * 1024,
		MIB: 1024 * 1024,
		GB: 1024 * 1024 * 1024,
		GIB: 1024 * 1024 * 1024,
		TB: 1024 * 1024 * 1024 * 1024,
		TIB: 1024 * 1024 * 1024 * 1024
	};

	return Math.round(value * (multipliers[unit] || 1));
}

/**
 * Enhanced release result with parsed metadata and quality scoring
 */
export interface EnhancedReleaseResult extends ReleaseResult {
	/** Parsed metadata from release title */
	parsed: ParsedRelease;

	/** Quality assessment result */
	quality: QualityMatchResult;

	/** Total score for ranking (quality score + other factors) */
	totalScore: number;

	/**
	 * Detailed score breakdown showing quality vs bonus components
	 * Allows UI to show why releases ranked differently
	 */
	scoreComponents?: ScoreComponents;

	/** Whether this release was rejected by quality filter */
	rejected: boolean;

	/** Reason for rejection (quality, protocol, size, etc.) */
	rejectionReason?: string;

	/** Full scoring result from scoring engine (if using enhanced scoring) */
	scoringResult?: ScoringResult;

	/** Matched format names for quick display */
	matchedFormats?: string[];

	/** TMDB match if found */
	tmdbMatch?: TmdbMatch;

	/** Episode match info for TV releases */
	episodeMatch?: {
		season: number;
		seasons?: number[];
		episodes: number[];
		isSeasonPack: boolean;
		isCompleteSeries?: boolean;
	};

	// =========================================================================
	// Upgrade decision fields (populated when evaluating against existing files)
	// =========================================================================

	/** Upgrade status compared to existing file(s) */
	upgradeStatus?: 'upgrade' | 'sidegrade' | 'downgrade' | 'new' | 'blocked' | 'rejected';

	/** Reason if release was rejected by upgrade check */
	upgradeRejectionReason?: string;

	/** Machine-readable rejection type */
	upgradeRejectionType?: string;

	/** Whether this qualifies as an upgrade */
	isUpgradeCandidate?: boolean;

	/** Upgrade statistics for season/series packs */
	upgradeStats?: {
		/** Episodes that would be upgraded */
		improved: number;
		/** Episodes that would stay the same */
		unchanged: number;
		/** Episodes that would be downgraded */
		downgraded: number;
		/** Episodes that are new (no existing file) */
		newEpisodes: number;
		/** Total episodes evaluated */
		total: number;
	};

	/** Score of existing file (if any) */
	existingScore?: number;

	/** Score improvement over existing file */
	scoreImprovement?: number;
}
