/**
 * Release Group Pattern Matching
 *
 * Extracts release group name from release titles
 * Release groups typically appear at the end of the title, often after a dash
 */

interface ReleaseGroupMatch {
	group: string;
	matchedText: string;
	index: number;
}

/**
 * Words/patterns that should NOT be considered release groups
 */
const GROUP_BLACKLIST = [
	// Quality indicators
	/^(720p?|1080p?|2160p?|4k|uhd|hd|sd|hdr|dv|hdr10|hlg)$/i,
	// Codecs
	/^(x264|x265|h264|h265|hevc|avc|av1|xvid|divx)$/i,
	// Sources
	/^(bluray|bdrip|brrip|webrip|webdl|hdtv|dvdrip|remux|web)$/i,
	// Audio
	/^(aac|ac3|dts|truehd|atmos|flac|mp3|opus|dd|dd\+|ddp)$/i,
	// Common endings
	/^(mkv|mp4|avi|proper|repack|internal|real|rerip)$/i,
	// Languages
	/^(english|german|french|spanish|multi|dual|audio)$/i,
	// File sizes
	/^\d+(\.\d+)?\s*(gb|mb|tb)$/i,
	// Dates
	/^\d{4}$/,
	// Generic terms
	/^(extended|directors|cut|edition|unrated|theatrical|imax)$/i,
	// Indexer suffixes (not release groups)
	/^(eztv|yify|yts|rarbg|ettv|ethd|tgx)$/i
];

/**
 * Known indexer suffixes to strip before group extraction
 */
const INDEXER_SUFFIXES = [
	/\s+EZTV$/i,
	/\s+YIFY$/i,
	/\s+YTS(\.[A-Z]{2,3})?$/i,
	/\s+RARBG$/i,
	/\s+\[?ettv\]?$/i,
	/\s+\[?eztv[x]?\.[a-z]+\]?$/i
];

/**
 * Patterns to identify where release group might be
 */
const GROUP_EXTRACTION_PATTERNS = [
	// Group after last dash: "Movie.2024.1080p.WEB-DL-GROUP"
	/-([a-zA-Z0-9]+)$/,
	// Group in brackets at end: "Movie (2024) [GROUP]"
	/\[([a-zA-Z0-9]+)\]$/,
	// Group after @ sign: "Movie.2024@GROUP"
	/@([a-zA-Z0-9]+)$/
];

/**
 * Check if a potential group name is blacklisted
 */
function isBlacklisted(name: string): boolean {
	return GROUP_BLACKLIST.some((pattern) => pattern.test(name));
}

/**
 * Check if a name looks like a valid release group
 */
function isValidGroupName(name: string): boolean {
	// Must be 2-20 characters
	if (name.length < 2 || name.length > 20) {
		return false;
	}

	// Must not be blacklisted
	if (isBlacklisted(name)) {
		return false;
	}

	// Must be alphanumeric (can include some special chars)
	if (!/^[a-zA-Z0-9]+$/.test(name)) {
		return false;
	}

	// Must not be all numbers
	if (/^\d+$/.test(name)) {
		return false;
	}

	return true;
}

/**
 * Strip known indexer suffixes from title
 */
function stripIndexerSuffixes(title: string): string {
	let result = title;
	for (const pattern of INDEXER_SUFFIXES) {
		result = result.replace(pattern, '');
	}
	return result;
}

/**
 * Extract release group from a release title
 *
 * @param title - The release title to parse
 * @returns Release group match info or null if not found
 */
export function extractReleaseGroup(title: string): ReleaseGroupMatch | null {
	// Remove file extension if present
	let cleanTitle = title.replace(/\.(mkv|mp4|avi|m4v|webm)$/i, '');

	// Strip indexer suffixes (EZTV, YIFY, etc.)
	cleanTitle = stripIndexerSuffixes(cleanTitle);

	// Try each extraction pattern
	for (const pattern of GROUP_EXTRACTION_PATTERNS) {
		const match = cleanTitle.match(pattern);
		if (match) {
			const potentialGroup = match[1];
			if (isValidGroupName(potentialGroup)) {
				return {
					group: potentialGroup,
					matchedText: match[0],
					index: match.index ?? 0
				};
			}
		}
	}

	// Fallback: try to find the last dash-separated segment
	// "Movie.2024.1080p.WEB-DL.x264-GROUP"
	const parts = cleanTitle.split(/[-._]/);
	if (parts.length > 0) {
		const lastPart = parts[parts.length - 1];
		if (isValidGroupName(lastPart)) {
			const index = cleanTitle.lastIndexOf(lastPart);
			return {
				group: lastPart,
				matchedText: lastPart,
				index
			};
		}
	}

	return null;
}

/**
 * Check if title contains identifiable release group
 */
export function hasReleaseGroup(title: string): boolean {
	return extractReleaseGroup(title) !== null;
}
