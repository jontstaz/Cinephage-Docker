/**
 * Audio & HDR Pattern Matching
 *
 * Extracts audio codec, channels, Atmos modifier, and HDR format from release titles.
 * Follows Profilarr/Dictionarry patterns for accurate detection.
 *
 * Key principles:
 * - Audio codec and Atmos are detected separately (Atmos is a stackable modifier)
 * - Channel configuration is detected independently for metadata
 * - HDR formats are detected with proper fallback layer awareness
 */

import type { AudioFormat, AudioCodec, AudioChannels, HdrFormat } from '../types.js';

// =============================================================================
// Type Definitions
// =============================================================================

interface AudioMatch {
	audio: AudioFormat;
	matchedText: string;
	index: number;
}

interface EnhancedAudioMatch {
	/** Base audio codec (without Atmos modifier) */
	codec: AudioCodec;
	/** Channel configuration if detected */
	channels: AudioChannels;
	/** Whether Atmos object audio is present */
	hasAtmos: boolean;
	/** Matched text for the codec */
	matchedText: string;
	/** Index in the string where match was found */
	index: number;
}

interface HdrMatch {
	hdr: HdrFormat;
	matchedText: string;
	index: number;
}

// =============================================================================
// Audio Codec Patterns (Profilarr-style)
// =============================================================================

/**
 * Audio codec patterns ordered by specificity (most specific first)
 * Based on Profilarr regex_patterns/*.yml
 */
const AUDIO_CODEC_PATTERNS: Array<{ pattern: RegExp; codec: AudioCodec }> = [
	// =========================================================================
	// LOSSLESS CODECS
	// =========================================================================

	// TrueHD (Dolby lossless) - Pattern: True[ .-]?HD[ .-]?
	// Must check before generic patterns
	{ pattern: /\bTrue[ ._-]?HD/i, codec: 'truehd' },

	// DTS:X (object-based DTS, lossless core) - Pattern: DTS-X
	// Must check before DTS-HD MA and basic DTS
	{ pattern: /\bDTS[ ._-]?X\b/i, codec: 'dts-x' },

	// DTS-HD MA (Master Audio, lossless) - Pattern: \b(dts[-_. ]?(ma|hd([-_. ]?ma)?|xll))(\b|\d)
	// Must check before DTS-HD HRA and generic DTS-HD
	{ pattern: /\bDTS[ ._-]?HD[ ._-]?MA\b/i, codec: 'dts-hdma' },
	{ pattern: /\bDTS[ ._-]?MA\b/i, codec: 'dts-hdma' },
	{ pattern: /\bDTS[ ._-]?XLL\b/i, codec: 'dts-hdma' }, // XLL = lossless extension

	// PCM (uncompressed) - Pattern: \b(l?)PCM(\b|\d)
	{ pattern: /\bL?PCM\b/i, codec: 'pcm' },

	// FLAC (lossless) - Pattern: \bFLAC(\b|\d)
	{ pattern: /\bFLAC\b/i, codec: 'flac' },

	// =========================================================================
	// HIGH QUALITY LOSSY CODECS
	// =========================================================================

	// DTS-HD HRA (High Resolution Audio, lossy) - Pattern: dts[-. ]?(hd[. ]?)?(hra?|hi\b)
	// Must check before generic DTS-HD
	{ pattern: /\bDTS[ ._-]?HD[ ._-]?HRA?\b/i, codec: 'dts-hd-hra' },
	{ pattern: /\bDTS[ ._-]?HD[ ._-]?Hi\b/i, codec: 'dts-hd-hra' },
	{ pattern: /\bDTS[ ._-]?HRA\b/i, codec: 'dts-hd-hra' },

	// DTS-HD (generic, unspecified) - Must check after MA and HRA
	{ pattern: /\bDTS[ ._-]?HD\b/i, codec: 'dts-hd' },

	// DTS-ES (Extended Surround, legacy 6.1) - Pattern: dts[-. ]?es\b
	{ pattern: /\bDTS[ ._-]?ES\b/i, codec: 'dts-es' },

	// =========================================================================
	// STANDARD LOSSY CODECS
	// =========================================================================

	// DTS (basic) - Pattern: DTS[ .]?[1-9] (with channel number)
	// Must be checked after all DTS variants
	{ pattern: /\bDTS[ ._]?[1-9]/i, codec: 'dts' },
	{ pattern: /\bDTS\b(?![ ._-]?(HD|MA|X|ES|HRA))/i, codec: 'dts' },

	// Dolby Digital Plus (E-AC3) - Pattern: \bDD[P+]|\b(e[-_. ]?ac3)\b
	// Must check before basic DD
	{ pattern: /\bDD[P+]/i, codec: 'dd+' },
	{ pattern: /\bDDP[ ._]?[0-9]/i, codec: 'dd+' },
	{ pattern: /\bE[ ._-]?AC[ ._-]?3\b/i, codec: 'dd+' },
	{ pattern: /\bEAC3\b/i, codec: 'dd+' },
	{ pattern: /\bDolby[ ._-]?Digital[ ._-]?Plus\b/i, codec: 'dd+' },
	// DDPA = DD+ Atmos (Profilarr BTN Atmos pattern includes this)
	{ pattern: /\bDDPA[ ._]?[0-9]/i, codec: 'dd+' },

	// Dolby Digital (AC3) - Pattern: \bDD[^a-z+]|(?<!e)ac3
	// Must check after DD+
	{ pattern: /\bDD[ ._]?[0-9]/i, codec: 'dd' },
	{ pattern: /\bAC[ ._-]?3\b/i, codec: 'dd' },
	{ pattern: /\bAC3\b/i, codec: 'dd' },
	{ pattern: /\bDolby[ ._-]?Digital\b(?![ ._-]?Plus)/i, codec: 'dd' },

	// Opus (modern efficient) - Pattern: \bOPUS(\b|\d)(?!.*[ ._-](\d{3,4}p))
	// Profilarr excludes matches where "Opus" is followed by resolution (movie title)
	{ pattern: /\bOpus[ ._]?[0-9]/i, codec: 'opus' },
	{ pattern: /\bOpus\b(?!.*\d{3,4}p)/i, codec: 'opus' },

	// AAC
	{ pattern: /\bAAC[ ._-]?[0-9]/i, codec: 'aac' },
	{ pattern: /\bAAC\b/i, codec: 'aac' },

	// MP3
	{ pattern: /\bMP3\b/i, codec: 'mp3' }
];

// =============================================================================
// Atmos Detection Patterns
// =============================================================================

/**
 * Atmos detection patterns
 * Profilarr pattern: \bATMOS|DDPA(\b|\d)
 * Also includes BTN naming convention: \bTrue[ .-]?HDA[ .-]?[57]\.1
 */
const ATMOS_PATTERNS: RegExp[] = [
	/\bAtmos\b/i,
	/\bDolby[ ._-]?Atmos\b/i,
	// DDPA = Dolby Digital Plus Atmos (common in WEB-DL)
	/\bDDPA/i,
	// BTN naming convention: TrueHDA7.1 = TrueHD Atmos 7.1
	/\bTrue[ ._-]?HDA[ ._-]?[57]\.1/i
];

// =============================================================================
// Audio Channel Patterns
// =============================================================================

/**
 * Audio channel configuration patterns
 * Profilarr pattern for 7.1: '7\.1'
 */
const CHANNEL_PATTERNS: Array<{ pattern: RegExp; channels: AudioChannels }> = [
	{ pattern: /\b7\.1\b/, channels: '7.1' },
	{ pattern: /\b5\.1\b/, channels: '5.1' },
	{ pattern: /\b2\.0\b/, channels: '2.0' },
	{ pattern: /\bStereo\b/i, channels: '2.0' },
	{ pattern: /\b1\.0\b/, channels: '1.0' },
	{ pattern: /\bMono\b/i, channels: '1.0' }
];

// =============================================================================
// HDR Format Patterns (Enhanced)
// =============================================================================

/**
 * HDR format patterns with fallback layer awareness
 * Based on Profilarr patterns with enhancements for DV profile detection
 */
const HDR_PATTERNS: Array<{ pattern: RegExp; hdr: NonNullable<HdrFormat> }> = [
	// =========================================================================
	// Dolby Vision with fallback layer detection
	// =========================================================================

	// DV + HDR10+ (combo format)
	{ pattern: /\b(DV|DoVi|Dolby[ ._-]?Vision)[ ._-]?HDR10\+/i, hdr: 'dolby-vision-hdr10' },
	{ pattern: /\bHDR10\+[ ._-]?(DV|DoVi|Dolby[ ._-]?Vision)\b/i, hdr: 'dolby-vision-hdr10' },

	// DV + HDR10 (common combo, Profile 7/8)
	{ pattern: /\b(DV|DoVi|Dolby[ ._-]?Vision)[ ._-]?HDR10\b/i, hdr: 'dolby-vision-hdr10' },
	{ pattern: /\bHDR10[ ._-]?(DV|DoVi|Dolby[ ._-]?Vision)\b/i, hdr: 'dolby-vision-hdr10' },

	// DV + HDR (assume HDR10 fallback)
	{ pattern: /\b(DV|DoVi|Dolby[ ._-]?Vision)[ ._-]?HDR\b/i, hdr: 'dolby-vision-hdr10' },
	{ pattern: /\bHDR[ ._-]?(DV|DoVi|Dolby[ ._-]?Vision)\b/i, hdr: 'dolby-vision-hdr10' },

	// DV + HLG fallback
	{ pattern: /\b(DV|DoVi|Dolby[ ._-]?Vision)[ ._-]?HLG\b/i, hdr: 'dolby-vision-hlg' },
	{ pattern: /\bDV[ ._]HLG\b/i, hdr: 'dolby-vision-hlg' },

	// DV + SDR fallback (compatibility mode, often penalized)
	{ pattern: /\b(DV|DoVi|Dolby[ ._-]?Vision)[ ._-]?SDR\b/i, hdr: 'dolby-vision-sdr' },
	{ pattern: /\bDV[ ._]SDR\b/i, hdr: 'dolby-vision-sdr' },

	// Generic Dolby Vision (no explicit fallback mentioned)
	// Profilarr pattern: \b(dv(?![ .](HLG|SDR))|dovi|dolby[ .]?vision)\b
	{ pattern: /\bDolby[ ._-]?Vision\b/i, hdr: 'dolby-vision' },
	{ pattern: /\bDoVi\b/i, hdr: 'dolby-vision' },
	// DV but not followed by HLG or SDR (those are handled above)
	{ pattern: /\bDV\b(?![ ._-]?(HLG|SDR|D))/i, hdr: 'dolby-vision' },

	// =========================================================================
	// HDR10+ (Samsung dynamic HDR)
	// Pattern: \bHDR10.?(\+|P(lus)?\b)
	// =========================================================================
	{ pattern: /\bHDR10[ ._-]?\+/i, hdr: 'hdr10+' },
	{ pattern: /\bHDR10[ ._-]?Plus\b/i, hdr: 'hdr10+' },
	{ pattern: /\bHDR10P\b/i, hdr: 'hdr10+' },

	// =========================================================================
	// HDR10 (static HDR)
	// Pattern: \bHDR10(?!\+|Plus)\b
	// =========================================================================
	{ pattern: /\bHDR10\b(?![ ._-]?\+|Plus)/i, hdr: 'hdr10' },
	{ pattern: /\bHDR[ ._-]?10\b/i, hdr: 'hdr10' },

	// =========================================================================
	// HLG (Hybrid Log-Gamma, broadcast HDR)
	// =========================================================================
	{ pattern: /\bHLG\b/i, hdr: 'hlg' },

	// =========================================================================
	// PQ (Perceptual Quantizer)
	// =========================================================================
	{ pattern: /\bPQ\b/i, hdr: 'pq' },

	// =========================================================================
	// SDR (explicit Standard Dynamic Range)
	// Pattern: \b(SDR)\b
	// =========================================================================
	{ pattern: /\bSDR\b/i, hdr: 'sdr' },

	// =========================================================================
	// Generic HDR (unspecified type, assume basic HDR)
	// Must be last to not override specific formats
	// =========================================================================
	{ pattern: /\bHDR\b(?!10)/i, hdr: 'hdr' }
];

// =============================================================================
// Legacy Audio Patterns (for backwards compatibility)
// =============================================================================

/**
 * Legacy audio format patterns (includes Atmos as a codec)
 * @deprecated Use AUDIO_CODEC_PATTERNS and ATMOS_PATTERNS separately
 */
const AUDIO_PATTERNS: Array<{ pattern: RegExp; audio: AudioFormat }> = [
	// Dolby Atmos (object-based audio)
	{ pattern: /\bAtmos\b/i, audio: 'atmos' },
	{ pattern: /\bDolby[ ._-]?Atmos\b/i, audio: 'atmos' },

	// TrueHD (lossless Dolby)
	{ pattern: /\bTrueHD\b/i, audio: 'truehd' },
	{ pattern: /\bTrue[ ._-]?HD\b/i, audio: 'truehd' },

	// DTS:X (object-based DTS)
	{ pattern: /\bDTS[ ._-]?X\b/i, audio: 'dts-x' },

	// DTS-HD Master Audio (lossless DTS)
	{ pattern: /\bDTS[ ._-]?HD[ ._-]?MA\b/i, audio: 'dts-hdma' },
	{ pattern: /\bDTS[ ._-]?HD\s+MA\b/i, audio: 'dts-hdma' },
	{ pattern: /\bDTS[ ._-]?HD[ ._-]?Master\b/i, audio: 'dts-hdma' },

	// DTS-HD (high resolution, but lossy core)
	{ pattern: /\bDTS[ ._-]?HD\b/i, audio: 'dts-hd' },

	// FLAC (lossless)
	{ pattern: /\bFLAC\b/i, audio: 'flac' },

	// Standard DTS
	{ pattern: /\bDTS\b/i, audio: 'dts' },

	// Dolby Digital Plus (E-AC3)
	{ pattern: /\bDD\+/i, audio: 'dd+' },
	{ pattern: /\bDD[ ._-]?Plus\b/i, audio: 'dd+' },
	{ pattern: /\bDDP[ ._-]?5[ ._-]?1\b/i, audio: 'dd+' },
	{ pattern: /\bDDP\b/i, audio: 'dd+' },
	{ pattern: /\bE[ ._-]?AC[ ._-]?3\b/i, audio: 'dd+' },
	{ pattern: /\bEAC3\b/i, audio: 'dd+' },
	{ pattern: /\bDolby[ ._-]?Digital[ ._-]?Plus\b/i, audio: 'dd+' },

	// Dolby Digital (AC3)
	{ pattern: /\bDD[ ._-]?5\.1\b/i, audio: 'dd' },
	{ pattern: /\bAC[ ._-]?3\b/i, audio: 'dd' },
	{ pattern: /\bAC3\b/i, audio: 'dd' },
	{ pattern: /\bDolby[ ._-]?Digital\b/i, audio: 'dd' },
	{ pattern: /\bDD\b(?![+Pp])/i, audio: 'dd' },

	// Opus (modern efficient lossy)
	{ pattern: /\bOpus\b/i, audio: 'opus' },

	// AAC
	{ pattern: /\bAAC2[ ._-]?0\b/i, audio: 'aac' },
	{ pattern: /\bAAC5[ ._-]?1\b/i, audio: 'aac' },
	{ pattern: /\bAAC[ ._-]?2[ ._-]?0\b/i, audio: 'aac' },
	{ pattern: /\bAAC[ ._-]?5[ ._-]?1\b/i, audio: 'aac' },
	{ pattern: /\bAAC\b/i, audio: 'aac' },

	// MP3
	{ pattern: /\bMP3\b/i, audio: 'mp3' }
];

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Extract enhanced audio information from a release title
 * This is the new preferred method that separates codec, channels, and Atmos
 *
 * @param title - The release title to parse
 * @returns Enhanced audio match info
 */
export function extractEnhancedAudio(title: string): EnhancedAudioMatch {
	let codec: AudioCodec = 'unknown';
	let matchedText = '';
	let index = 0;

	// Find the audio codec
	for (const { pattern, codec: c } of AUDIO_CODEC_PATTERNS) {
		const match = title.match(pattern);
		if (match) {
			codec = c;
			matchedText = match[0];
			index = match.index ?? 0;
			break;
		}
	}

	// Detect Atmos modifier (independent of codec)
	const hasAtmosFlag = ATMOS_PATTERNS.some((pattern) => pattern.test(title));

	// Detect channel configuration
	let channels: AudioChannels = 'unknown';
	for (const { pattern, channels: ch } of CHANNEL_PATTERNS) {
		if (pattern.test(title)) {
			channels = ch;
			break;
		}
	}

	return {
		codec,
		channels,
		hasAtmos: hasAtmosFlag,
		matchedText,
		index
	};
}

/**
 * Extract audio format from a release title (legacy function)
 *
 * @param title - The release title to parse
 * @returns Audio match info or null if not found
 * @deprecated Use extractEnhancedAudio instead
 */
export function extractAudio(title: string): AudioMatch | null {
	for (const { pattern, audio } of AUDIO_PATTERNS) {
		const match = title.match(pattern);
		if (match) {
			return {
				audio,
				matchedText: match[0],
				index: match.index ?? 0
			};
		}
	}
	return null;
}

/**
 * Extract HDR format from a release title
 *
 * @param title - The release title to parse
 * @returns HDR match info or null if not found
 */
export function extractHdr(title: string): HdrMatch | null {
	for (const { pattern, hdr } of HDR_PATTERNS) {
		const match = title.match(pattern);
		if (match) {
			return {
				hdr,
				matchedText: match[0],
				index: match.index ?? 0
			};
		}
	}
	return null;
}

/**
 * Check if Atmos is present in the release title
 */
export function hasAtmos(title: string): boolean {
	return ATMOS_PATTERNS.some((pattern) => pattern.test(title));
}

/**
 * Extract audio channel configuration from a release title
 */
export function extractChannels(title: string): AudioChannels {
	for (const { pattern, channels } of CHANNEL_PATTERNS) {
		if (pattern.test(title)) {
			return channels;
		}
	}
	return 'unknown';
}

/**
 * Check if a string likely contains audio info
 */
export function hasAudioInfo(title: string): boolean {
	return AUDIO_PATTERNS.some(({ pattern }) => pattern.test(title));
}

/**
 * Check if a string likely contains HDR info
 */
export function hasHdrInfo(title: string): boolean {
	return HDR_PATTERNS.some(({ pattern }) => pattern.test(title));
}

/**
 * Check if a release has Dolby Vision without HDR fallback
 * This is typically penalized as it may not play on all devices
 *
 * Profilarr pattern: (?<=^(?!.*(HDR|HULU|REMUX|BLURAY)).*?)\b(DV|Dovi|Dolby[- .]?V(ision)?)\b
 */
export function hasDolbyVisionWithoutFallback(title: string): boolean {
	const hasDV =
		/\b(DV|DoVi|Dolby[ ._-]?Vision)\b/i.test(title) && !/\bDV[ ._]?(HLG|SDR)\b/i.test(title);

	if (!hasDV) return false;

	// Check for HDR fallback indicators
	const hasHdrFallback = /\bHDR/i.test(title);
	const isRemux = /\bRemux\b/i.test(title);
	const isBluray = /\bBlu[ ._-]?Ray\b/i.test(title);
	const isHulu = /\bHULU\b/i.test(title); // Hulu WEB-DLs typically have HDR10 fallback

	// DV without any HDR indicator and not from known fallback sources
	return !hasHdrFallback && !isRemux && !isBluray && !isHulu;
}
