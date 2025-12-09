/**
 * Release Parser
 *
 * Parses release titles to extract structured metadata including:
 * - Quality attributes (resolution, source, codec, audio, HDR)
 * - TV episode information (season, episode, packs)
 * - Language information
 * - Release group
 * - Edition and special flags (PROPER, REPACK, REMUX, 3D)
 */

import type { ParsedRelease } from './types.js';
import { extractResolution } from './patterns/resolution.js';
import { extractSource } from './patterns/source.js';
import { extractCodec } from './patterns/codec.js';
import { extractAudio, extractHdr } from './patterns/audio.js';
import { extractLanguages } from './patterns/language.js';
import { extractEpisode, extractTitleBeforeEpisode } from './patterns/episode.js';
import { extractReleaseGroup } from './patterns/releaseGroup.js';

/**
 * Patterns for extracting year from title
 */
const YEAR_PATTERN = /\b(19\d{2}|20\d{2})\b/;

/**
 * Patterns for edition detection
 */
const EDITION_PATTERNS: Array<{ pattern: RegExp; edition: string }> = [
	{ pattern: /\bdirector'?s?[\s._-]?cut\b/i, edition: "Director's Cut" },
	{ pattern: /\bextended[\s._-]?(?:cut|edition)?\b/i, edition: 'Extended' },
	{ pattern: /\bunrated\b/i, edition: 'Unrated' },
	{ pattern: /\btheatrical\b/i, edition: 'Theatrical' },
	{ pattern: /\bremastered\b/i, edition: 'Remastered' },
	{ pattern: /\bimax\b/i, edition: 'IMAX' },
	{ pattern: /\bcriterion\b/i, edition: 'Criterion' },
	{ pattern: /\bspecial[\s._-]?edition\b/i, edition: 'Special Edition' },
	{ pattern: /\banniversary[\s._-]?edition\b/i, edition: 'Anniversary Edition' },
	{ pattern: /\bcollector'?s?[\s._-]?edition\b/i, edition: "Collector's Edition" },
	{ pattern: /\bultimate[\s._-]?edition\b/i, edition: 'Ultimate Edition' },
	{ pattern: /\bopen[\s._-]?matte\b/i, edition: 'Open Matte' }
];

/**
 * Special flag patterns
 */
const FLAG_PATTERNS = {
	proper: /\bproper\b/i,
	repack: /\brepack\b/i,
	remux: /\bremux\b/i,
	is3d: /\b3d\b/i,
	hardcodedSubs: /\bhc\b|\bhardcoded\b|\bkorsub\b/i
};

/**
 * ReleaseParser - Main parser class for release titles
 */
export class ReleaseParser {
	/**
	 * Parse a release title into structured metadata
	 *
	 * @param title - The release title to parse
	 * @returns Parsed release information
	 */
	parse(title: string): ParsedRelease {
		const originalTitle = title;

		// Normalize the title for parsing
		const normalized = this.normalizeTitle(title);

		// Extract quality attributes
		const resolutionMatch = extractResolution(normalized);
		const sourceMatch = extractSource(normalized);
		const codecMatch = extractCodec(normalized);
		const audioMatch = extractAudio(normalized);
		const hdrMatch = extractHdr(normalized);

		// Extract episode info (determines if TV release)
		const episodeMatch = extractEpisode(normalized);

		// Extract other metadata
		const languageMatch = extractLanguages(normalized);
		const groupMatch = extractReleaseGroup(normalized);
		const year = this.extractYear(normalized);
		const edition = this.extractEdition(normalized);

		// Extract special flags
		const isProper = FLAG_PATTERNS.proper.test(normalized);
		const isRepack = FLAG_PATTERNS.repack.test(normalized);
		const isRemux = FLAG_PATTERNS.remux.test(normalized) || sourceMatch?.source === 'remux';
		const is3d = FLAG_PATTERNS.is3d.test(normalized);
		const hasHardcodedSubs = FLAG_PATTERNS.hardcodedSubs.test(normalized);

		// Extract clean title
		const cleanTitle = this.extractCleanTitle(normalized, {
			isTv: episodeMatch !== null,
			year,
			resolutionIndex: resolutionMatch?.index,
			sourceIndex: sourceMatch?.index
		});

		// Calculate confidence score
		const confidence = this.calculateConfidence({
			hasResolution: resolutionMatch !== null,
			hasSource: sourceMatch !== null,
			hasCodec: codecMatch !== null,
			hasYear: year !== undefined,
			hasGroup: groupMatch !== null,
			titleLength: cleanTitle.length
		});

		return {
			originalTitle,
			cleanTitle,
			year,
			resolution: resolutionMatch?.resolution ?? 'unknown',
			source: sourceMatch?.source ?? 'unknown',
			codec: codecMatch?.codec ?? 'unknown',
			hdr: hdrMatch?.hdr ?? null,
			audio: audioMatch?.audio ?? 'unknown',
			episode: episodeMatch?.info,
			languages: languageMatch.languages,
			releaseGroup: groupMatch?.group,
			edition,
			isProper,
			isRepack,
			isRemux,
			is3d,
			hasHardcodedSubs,
			confidence
		};
	}

	/**
	 * Normalize a release title for consistent parsing
	 * - Replace dots, underscores with spaces
	 * - Normalize multiple spaces
	 * - Trim whitespace
	 */
	private normalizeTitle(title: string): string {
		return (
			title
				// Replace common separators with spaces
				.replace(/[._]/g, ' ')
				// Normalize multiple spaces
				.replace(/\s+/g, ' ')
				// Trim
				.trim()
		);
	}

	/**
	 * Extract year from title
	 */
	private extractYear(title: string): number | undefined {
		const match = title.match(YEAR_PATTERN);
		if (match) {
			const year = parseInt(match[1], 10);
			// Sanity check: year should be reasonable
			if (year >= 1900 && year <= new Date().getFullYear() + 2) {
				return year;
			}
		}
		return undefined;
	}

	/**
	 * Extract edition from title
	 */
	private extractEdition(title: string): string | undefined {
		for (const { pattern, edition } of EDITION_PATTERNS) {
			if (pattern.test(title)) {
				return edition;
			}
		}
		return undefined;
	}

	/**
	 * Extract clean title (movie/show name only)
	 */
	private extractCleanTitle(
		normalized: string,
		context: {
			isTv: boolean;
			year?: number;
			resolutionIndex?: number;
			sourceIndex?: number;
		}
	): string {
		let title = normalized;

		// For TV shows, use the title before episode info
		if (context.isTv) {
			title = extractTitleBeforeEpisode(title);
		}

		// Find the earliest quality indicator to truncate at
		let cutoffIndex = title.length;

		// Resolution/source typically marks quality section
		if (context.resolutionIndex !== undefined) {
			cutoffIndex = Math.min(cutoffIndex, context.resolutionIndex);
		}
		if (context.sourceIndex !== undefined) {
			cutoffIndex = Math.min(cutoffIndex, context.sourceIndex);
		}

		// For movies with year: cut BEFORE the year (year is extracted separately to parsedYear)
		// This ensures cleanTitle contains just the title for better TMDB search matching
		if (context.year && !context.isTv) {
			const yearStr = String(context.year);
			const yearIndex = title.indexOf(yearStr);
			if (yearIndex !== -1) {
				// Cut before the year (and any preceding parenthesis/space)
				let cutBeforeYear = yearIndex;
				if (cutBeforeYear > 0 && title[cutBeforeYear - 1] === '(') {
					cutBeforeYear--;
				}
				cutoffIndex = Math.min(cutoffIndex, cutBeforeYear);
			}
		}

		// Cut at the earliest indicator
		title = title.slice(0, cutoffIndex);

		// Clean up common artifacts
		title = title
			// Remove trailing/leading separators and spaces
			.replace(/^[\s\-._]+|[\s\-._]+$/g, '')
			// Remove common prefix artifacts
			.replace(/^\[.*?\]\s*/g, '')
			// Normalize spaces
			.replace(/\s+/g, ' ')
			.trim();

		// Title case for nicer output
		return this.toTitleCase(title);
	}

	/**
	 * Convert string to title case
	 */
	private toTitleCase(str: string): string {
		const smallWords = new Set([
			'a',
			'an',
			'and',
			'as',
			'at',
			'but',
			'by',
			'for',
			'in',
			'nor',
			'of',
			'on',
			'or',
			'so',
			'the',
			'to',
			'up',
			'yet'
		]);

		return str
			.toLowerCase()
			.split(' ')
			.map((word, index) => {
				// Always capitalize first word
				if (index === 0) {
					return word.charAt(0).toUpperCase() + word.slice(1);
				}
				// Keep small words lowercase
				if (smallWords.has(word)) {
					return word;
				}
				// Capitalize other words
				return word.charAt(0).toUpperCase() + word.slice(1);
			})
			.join(' ');
	}

	/**
	 * Calculate parsing confidence score
	 */
	private calculateConfidence(indicators: {
		hasResolution: boolean;
		hasSource: boolean;
		hasCodec: boolean;
		hasYear: boolean;
		hasGroup: boolean;
		titleLength: number;
	}): number {
		let score = 0;

		// Each quality indicator adds to confidence
		if (indicators.hasResolution) score += 0.2;
		if (indicators.hasSource) score += 0.2;
		if (indicators.hasCodec) score += 0.15;
		if (indicators.hasYear) score += 0.15;
		if (indicators.hasGroup) score += 0.1;

		// Reasonable title length adds confidence
		if (indicators.titleLength >= 2 && indicators.titleLength <= 100) {
			score += 0.1;
		}

		// Base confidence for any parse
		score += 0.1;

		return Math.min(1, score);
	}
}

/**
 * Singleton instance for convenience
 */
export const releaseParser = new ReleaseParser();

/**
 * Convenience function to parse a release title
 */
export function parseRelease(title: string): ParsedRelease {
	return releaseParser.parse(title);
}
