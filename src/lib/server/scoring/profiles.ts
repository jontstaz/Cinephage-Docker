/**
 * Default Scoring Profiles
 *
 * Three quality-focused profiles with different philosophies:
 *
 * - Best: Absolute best quality, no compromise. Remux, lossless audio,
 *   top-tier groups. Will always upgrade to better quality.
 *
 * - Efficient: High quality with efficient encoding. Prioritizes x265/HEVC
 *   from quality groups like Tigole, QxR, TAoE. Doesn't sacrifice quality
 *   but uses efficient codecs. Think Dictionarry/Profilarry efficient.
 *
 * - Micro: Quality-focused micro encodes. Prioritizes the BEST micro
 *   encoders (Tigole, QxR) over lower quality ones (YTS). Still about
 *   getting good quality, just in smaller packages (~2.5GB or less).
 *
 * File size limits are NOT baked into profiles - users set those per-profile.
 * These profiles define QUALITY preferences, not size restrictions.
 */

import type { ScoringProfile } from './types.js';
import { BANNED_SCORE, DEFAULT_RESOLUTION_ORDER } from './types.js';

// =============================================================================
// Best Profile - Maximum Quality
// =============================================================================

/**
 * Best Profile: Absolute best quality, no compromise
 *
 * Philosophy: Get the highest quality available, period. Remux over encode,
 * lossless audio over lossy, HDR over SDR, 4K over 1080p. Storage is not
 * a concern. Will continuously upgrade until hitting the best possible.
 *
 * Ideal for: Home theater enthusiasts, quality purists, unlimited storage
 */
export const BEST_PROFILE: ScoringProfile = {
	id: 'best',
	name: 'Best',
	description: 'Absolute best quality - Remux, lossless audio, no compromise',
	tags: ['quality', 'remux', 'lossless', 'no-compromise'],
	icon: 'Star',
	color: 'text-yellow-500',
	category: 'quality',
	upgradesAllowed: true,
	minScore: 0,
	upgradeUntilScore: 100000, // Effectively unlimited - always upgrade
	minScoreIncrement: 500, // Meaningful upgrades only
	resolutionOrder: DEFAULT_RESOLUTION_ORDER,
	allowedProtocols: ['torrent', 'usenet'], // No streaming - torrents/usenet only
	formatScores: {
		// Resolution + Source (highest priority for Remux and Bluray)
		'2160p-remux': 20000,
		'2160p-bluray': 15000,
		'2160p-webdl': 8000,
		'2160p-webrip': 5000,
		'1080p-remux': 12000,
		'1080p-bluray': 8000,
		'1080p-webdl': 4000,
		'1080p-webdl-hevc': 4500,
		'1080p-webrip': 2000,
		'1080p-hdtv': 1000,
		'720p-bluray': 3000,
		'720p-webdl': 1500,
		'720p-webrip': 800,
		'720p-hdtv': 500,
		'480p-webdl': 100,
		dvd: 50,
		'dvd-remux': 150,

		// Release Group Tiers - 2160p (high scores for quality groups)
		'2160p-quality-tier-1': 2000,
		'2160p-quality-tier-2': 1500,
		'2160p-quality-tier-3': 1000,

		// Release Group Tiers - 1080p Quality
		'1080p-quality-tier-1': 1800,
		'1080p-quality-tier-2': 1400,
		'1080p-quality-tier-3': 1000,
		'1080p-quality-tier-4': 700,
		'1080p-quality-tier-5': 400,
		'1080p-quality-tier-6': 200,

		// Release Group Tiers - 1080p Efficient (slightly lower for Best profile)
		'1080p-efficient-tier-1': 1200,
		'1080p-efficient-tier-2': 900,
		'1080p-efficient-tier-3': 600,
		'1080p-efficient-tier-4': 400,
		'1080p-efficient-tier-5': 200,

		// Remux Tiers (high value in Best profile)
		'remux-tier-1': 2500,
		'remux-tier-2': 2000,
		'remux-tier-3': 1500,

		// WEB-DL Tiers
		'webdl-tier-1': 1000,
		'webdl-tier-2': 700,
		'webdl-tier-3': 400,

		// 720p Tiers
		'720p-quality-tier-1': 800,
		'720p-quality-tier-2': 500,

		// Audio - Lossless (very high scores)
		'audio-truehd-atmos': 3000,
		'audio-truehd': 2500,
		'audio-dts-x': 2800,
		'audio-dts-hdma': 2400,
		'audio-flac': 1800,
		'audio-pcm': 2000,

		// Audio - HQ Lossy (moderate scores)
		'audio-atmos': 1500,
		'audio-dts-hd-hra': 1000,
		'audio-dts-hd': 900,
		'audio-dts-es': 600,
		'audio-ddplus': 800,
		'audio-dts': 500,
		'audio-dd51': 400,

		// Audio - Standard (lower scores)
		'audio-aac': 100,
		'audio-mp3': 50,

		// HDR (all valued in Best)
		'hdr-dv-p5': 2500, // DV Profile 5 (with HDR10 fallback)
		'hdr-dv-p8': 2000, // DV Profile 8 (HDR10 base)
		'hdr-dv': 1800, // DV Generic
		'hdr-hdr10plus': 1600,
		'hdr-hdr10': 1200,
		'hdr-hlg': 800,
		'hdr-sdr': 0, // SDR is baseline

		// Streaming Services (premium valued higher)
		'streaming-amzn': 500,
		'streaming-nf': 500,
		'streaming-atvp': 700,
		'streaming-dsnp': 500,
		'streaming-hbo': 500,
		'streaming-hmax': 500,
		'streaming-max': 500,
		'streaming-pcok': 400,
		'streaming-pmtp': 400,
		'streaming-hulu': 300,
		'streaming-it': 400,
		'streaming-stan': 300,
		'streaming-crav': 300,
		'streaming-now': 200,
		'streaming-sho': 300,
		'streaming-roku': 200,

		// Micro Encoders - PENALIZED in Best profile (not preferred)
		'micro-yts': -5000,
		'micro-yify': -5000,
		'micro-rarbg': -2000,
		'micro-psa': -3000,
		'micro-megusta': -3000,
		'micro-galaxyrg': -2500,
		'micro-tigole': -1500, // Tigole is higher quality for micro
		'micro-qxr': -1000, // QxR is decent quality

		// Enhancements
		repack: 500,
		proper: 500,
		remastered: 300,
		unrated: 100,
		extended: 200,
		imax: 400,
		theatrical: 100,
		'directors-cut': 150,
		hybrid: 300,
		'codec-x265': 200, // Slight bonus for HEVC in Best (efficient)
		'codec-x264': 100,
		'codec-av1': 300, // Future-proof codec
		daily: 0,
		anime: 0,

		// Low Quality Groups - HEAVILY PENALIZED in Best profile
		'lq-nahom': -5000,
		'lq-oeplus': -5000,
		'lq-4k4u': -5000,
		'lq-aoc': -5000,
		'lq-beyondhd-encode': -4000,
		'lq-hds': -5000,
		'lq-d3g': -5000,
		'lq-flights': -5000,
		'lq-classicalhd': -4000,
		'lq-creative24': -4000,
		'lq-depraved': -4000,
		'lq-devisive': -4000,
		'lq-drx': -4000,
		'lq-blasphemy': -4000,
		'lq-bols': -4000,
		'lq-btm': -4000,
		'lq-fgt': -4000,
		'lq-ivy': -4000,
		'lq-kc': -4000,

		// Banned formats (deceptive/unusable - hard blocked)
		'banned-aroma': BANNED_SCORE,
		'banned-lama': BANNED_SCORE,
		'banned-telly': BANNED_SCORE,
		'banned-bitor': BANNED_SCORE,
		'banned-visionxpert': BANNED_SCORE,
		'banned-sasukeduck': BANNED_SCORE,
		'banned-jennaortegauhd': BANNED_SCORE,
		'banned-extras': BANNED_SCORE,
		'banned-sample': BANNED_SCORE,
		'banned-upscaled': BANNED_SCORE,
		'banned-3d': BANNED_SCORE,
		'banned-cam': BANNED_SCORE,
		'banned-telesync': BANNED_SCORE,
		'banned-telecine': BANNED_SCORE,
		'banned-screener': BANNED_SCORE
	}
};

// =============================================================================
// Efficient Profile - Quality with Size Consideration
// =============================================================================

/**
 * Efficient Profile: High quality with efficient encoding
 *
 * Philosophy: Get excellent quality but prefer efficient x265/HEVC encodes.
 * Think Dictionarry/Profilarry "Efficient" - quality groups that use modern
 * codecs. Tigole, QxR, TAoE, BHDStudio are the target. Doesn't sacrifice
 * quality, just prefers smart encoding over bloated files.
 *
 * Bluray encodes > Remux (because Remux is wasteful for this philosophy)
 * x265 > x264 (more efficient at same quality)
 * DD+ Atmos > TrueHD (transparent at fraction of size)
 *
 * Ideal for: Quality-conscious users with reasonable storage, streamers
 */
export const EFFICIENT_PROFILE: ScoringProfile = {
	id: 'efficient',
	name: 'Efficient',
	description: 'High quality with efficient encoding - x265, quality groups',
	tags: ['quality', 'x265', 'efficient', 'tigole'],
	icon: 'Zap',
	color: 'text-green-500',
	category: 'efficient',
	upgradesAllowed: true,
	minScore: 0,
	upgradeUntilScore: 25000,
	minScoreIncrement: 50,
	resolutionOrder: DEFAULT_RESOLUTION_ORDER,
	allowedProtocols: ['torrent', 'usenet'], // No streaming - torrents/usenet only
	formatScores: {
		// Resolution + Source (HEVC variants get bonus)
		'2160p-remux': 10000,
		'2160p-bluray': 15000, // Encodes preferred over Remux for size
		'2160p-webdl': 12000,
		'2160p-webrip': 8000,
		'1080p-remux': 5000,
		'1080p-bluray': 8000,
		'1080p-webdl': 6000,
		'1080p-webdl-hevc': 9000, // HEVC WEB-DL gets bonus
		'1080p-webrip': 4000,
		'1080p-hdtv': 2000,
		'720p-bluray': 3000,
		'720p-webdl': 2500,
		'720p-webrip': 1500,
		'720p-hdtv': 1000,
		'480p-webdl': 200,
		dvd: 100,
		'dvd-remux': 50, // DVD Remux less valuable - prefer encodes

		// Release Group Tiers - 2160p
		'2160p-quality-tier-1': 1500,
		'2160p-quality-tier-2': 1200,
		'2160p-quality-tier-3': 800,

		// Release Group Tiers - 1080p Quality (valued but not as much)
		'1080p-quality-tier-1': 1000,
		'1080p-quality-tier-2': 800,
		'1080p-quality-tier-3': 600,
		'1080p-quality-tier-4': 400,
		'1080p-quality-tier-5': 200,
		'1080p-quality-tier-6': 100,

		// Release Group Tiers - 1080p Efficient (HIGHLY VALUED)
		'1080p-efficient-tier-1': 2000,
		'1080p-efficient-tier-2': 1700,
		'1080p-efficient-tier-3': 1400,
		'1080p-efficient-tier-4': 1000,
		'1080p-efficient-tier-5': 600,

		// Remux Tiers (lower value - we prefer encodes)
		'remux-tier-1': 800,
		'remux-tier-2': 600,
		'remux-tier-3': 400,

		// WEB-DL Tiers
		'webdl-tier-1': 1200,
		'webdl-tier-2': 900,
		'webdl-tier-3': 600,

		// 720p Tiers
		'720p-quality-tier-1': 600,
		'720p-quality-tier-2': 400,

		// Audio - Lossless (moderate - we accept some quality loss for size)
		'audio-truehd-atmos': 2000,
		'audio-truehd': 1500,
		'audio-dts-x': 1800,
		'audio-dts-hdma': 1400,
		'audio-flac': 1200,
		'audio-pcm': 1000,

		// Audio - HQ Lossy (good value in Efficient)
		'audio-atmos': 1800, // Atmos without TrueHD is great for efficiency
		'audio-dts-hd-hra': 1000,
		'audio-dts-hd': 800,
		'audio-dts-es': 500,
		'audio-ddplus': 1200, // DD+ is very efficient
		'audio-dts': 400,
		'audio-dd51': 500,

		// Audio - Standard
		'audio-aac': 300,
		'audio-mp3': 100,

		// HDR
		'hdr-dv-p5': 2000,
		'hdr-dv-p8': 1800,
		'hdr-dv': 1500,
		'hdr-hdr10plus': 1400,
		'hdr-hdr10': 1000,
		'hdr-hlg': 600,
		'hdr-sdr': 0,

		// Streaming Services
		'streaming-amzn': 600,
		'streaming-nf': 600,
		'streaming-atvp': 800,
		'streaming-dsnp': 500,
		'streaming-hbo': 500,
		'streaming-hmax': 500,
		'streaming-max': 500,
		'streaming-pcok': 400,
		'streaming-pmtp': 400,
		'streaming-hulu': 300,
		'streaming-it': 400,
		'streaming-stan': 300,
		'streaming-crav': 300,
		'streaming-now': 200,
		'streaming-sho': 300,
		'streaming-roku': 200,

		// Micro Encoders - Quality micros are great here!
		'micro-tigole': 3500, // Tigole is PERFECT for Efficient
		'micro-qxr': 3000, // QxR is excellent
		'micro-rarbg': 500, // RARBG is acceptable
		'micro-yts': -2000, // YTS sacrifices too much quality
		'micro-yify': -2000,
		'micro-psa': -500,
		'micro-megusta': -500,
		'micro-galaxyrg': 0,

		// Enhancements - x265 is the key
		repack: 600,
		proper: 600,
		remastered: 400,
		unrated: 150,
		extended: 250,
		imax: 500,
		theatrical: 150,
		'directors-cut': 250,
		hybrid: 400,
		'codec-x265': 2500, // MAJOR bonus for HEVC
		'codec-x264': 0,
		'codec-av1': 3000, // AV1 is even more efficient
		daily: 0,
		anime: 0,

		// Low Quality Groups - Penalized but not as harshly
		'lq-nahom': -3000,
		'lq-oeplus': -3000,
		'lq-4k4u': -3000,
		'lq-aoc': -3000,
		'lq-beyondhd-encode': -2000,
		'lq-hds': -3000,
		'lq-d3g': -3000,
		'lq-flights': -3000,
		'lq-classicalhd': -2500,
		'lq-creative24': -2500,
		'lq-depraved': -2500,
		'lq-devisive': -2500,
		'lq-drx': -2500,
		'lq-blasphemy': -2500,
		'lq-bols': -2500,
		'lq-btm': -2500,
		'lq-fgt': -2500,
		'lq-ivy': -2500,
		'lq-kc': -2500,

		// Banned formats (deceptive/unusable - hard blocked)
		'banned-aroma': BANNED_SCORE,
		'banned-lama': BANNED_SCORE,
		'banned-telly': BANNED_SCORE,
		'banned-bitor': BANNED_SCORE,
		'banned-visionxpert': BANNED_SCORE,
		'banned-sasukeduck': BANNED_SCORE,
		'banned-jennaortegauhd': BANNED_SCORE,
		'banned-extras': BANNED_SCORE,
		'banned-sample': BANNED_SCORE,
		'banned-upscaled': BANNED_SCORE,
		'banned-3d': BANNED_SCORE,
		'banned-cam': BANNED_SCORE,
		'banned-telesync': BANNED_SCORE,
		'banned-telecine': BANNED_SCORE,
		'banned-screener': BANNED_SCORE
	}
};

// =============================================================================
// Micro Profile - Quality Micro Encodes
// =============================================================================

/**
 * Micro Profile: Quality-focused micro encodes
 *
 * Philosophy: Get the BEST quality possible in small packages (~2.5GB or less).
 * This is NOT about accepting garbage - it's about finding the best micro
 * encoders. Tigole > QxR > RARBG > YTS. A good Tigole encode beats a bad Remux.
 *
 * Prioritizes:
 * - Quality micro groups (Tigole, QxR)
 * - x265/HEVC for efficiency
 * - Good streaming sources
 * - 1080p > 720p (quality still matters)
 *
 * Deprioritizes:
 * - Remux (way too big)
 * - Lossless audio (unnecessary bloat)
 * - Low-tier YTS/YIFY (too compressed)
 *
 * Ideal for: Limited storage, large libraries, quality-conscious streamers
 */
export const MICRO_PROFILE: ScoringProfile = {
	id: 'micro',
	name: 'Micro',
	description: 'Quality micro encodes - Tigole, QxR, efficient x265',
	tags: ['micro', 'efficient', 'tigole', 'qxr', 'small'],
	icon: 'Minimize2',
	color: 'text-purple-500',
	category: 'micro',
	upgradesAllowed: true,
	minScore: -5000, // Accept lower quality
	upgradeUntilScore: 10000,
	minScoreIncrement: 10,
	resolutionOrder: DEFAULT_RESOLUTION_ORDER,
	allowedProtocols: ['torrent', 'usenet'], // No streaming - torrents/usenet only
	formatScores: {
		// Resolution + Source
		// IMPORTANT: Resolution hierarchy is preserved (1080p > 720p > 480p)
		// Within each resolution, prefer efficient sources (webrip/webdl > bluray > remux)

		// 4K - Generally too big for Micro, but accept efficient encodes
		'2160p-remux': -5000, // WAY too big
		'2160p-bluray': -2000, // Still too big
		'2160p-webdl': 3000, // Acceptable if efficient
		'2160p-webrip': 3500, // Better - usually smaller

		// 1080p - Good quality tier for Micro (base: 5000-8000)
		'1080p-webdl-hevc': 8000, // HEVC WEB-DL is ideal for Micro
		'1080p-webrip': 7000, // WEBRip great - usually small
		'1080p-webdl': 6500, // WEB-DL good
		'1080p-bluray': 5500, // Bluray acceptable but larger
		'1080p-hdtv': 5000, // HDTV fine
		'1080p-remux': -3000, // Too big for Micro

		// 720p - Acceptable tier for Micro (base: 3000-4500)
		'720p-webdl': 4500, // Best 720p option
		'720p-webrip': 4000, // Good
		'720p-bluray': 3500, // Acceptable
		'720p-hdtv': 3000, // Fine

		// SD - Last resort but acceptable (base: 1000-2500)
		'480p-webdl': 2500,
		dvd: 2000,
		'dvd-remux': 1500,

		// Release Group Tiers - 2160p (penalized - too big)
		'2160p-quality-tier-1': -500,
		'2160p-quality-tier-2': -300,
		'2160p-quality-tier-3': -100,

		// Release Group Tiers - 1080p Quality (moderate value)
		'1080p-quality-tier-1': 400,
		'1080p-quality-tier-2': 350,
		'1080p-quality-tier-3': 300,
		'1080p-quality-tier-4': 250,
		'1080p-quality-tier-5': 200,
		'1080p-quality-tier-6': 150,

		// Release Group Tiers - 1080p Efficient (highly valued in Micro)
		'1080p-efficient-tier-1': 2500,
		'1080p-efficient-tier-2': 2200,
		'1080p-efficient-tier-3': 1800,
		'1080p-efficient-tier-4': 1400,
		'1080p-efficient-tier-5': 1000,

		// Remux Tiers (negative - way too big)
		'remux-tier-1': -2000,
		'remux-tier-2': -1500,
		'remux-tier-3': -1000,

		// WEB-DL Tiers (valued in Micro)
		'webdl-tier-1': 1200,
		'webdl-tier-2': 900,
		'webdl-tier-3': 600,

		// 720p Tiers (moderate value)
		'720p-quality-tier-1': 800,
		'720p-quality-tier-2': 600,

		// Audio - Lossless (penalized - too big)
		'audio-truehd-atmos': -1000,
		'audio-truehd': -800,
		'audio-dts-x': -900,
		'audio-dts-hdma': -700,
		'audio-flac': -500,
		'audio-pcm': -600,

		// Audio - HQ Lossy (neutral to positive)
		'audio-atmos': 500,
		'audio-dts-hd-hra': 200,
		'audio-dts-hd': 100,
		'audio-dts-es': 100,
		'audio-ddplus': 1000, // DD+ preferred
		'audio-dts': 200,
		'audio-dd51': 600,

		// Audio - Standard (preferred for Micro)
		'audio-aac': 1500, // AAC is perfect
		'audio-mp3': 1000,

		// HDR (slight value but not priority)
		'hdr-dv-p5': 600,
		'hdr-dv-p8': 500,
		'hdr-dv': 400,
		'hdr-hdr10plus': 450,
		'hdr-hdr10': 350,
		'hdr-hlg': 200,
		'hdr-sdr': 0,

		// Streaming Services (lower priority)
		'streaming-amzn': 300,
		'streaming-nf': 300,
		'streaming-atvp': 400,
		'streaming-dsnp': 300,
		'streaming-hbo': 300,
		'streaming-hmax': 300,
		'streaming-max': 300,
		'streaming-pcok': 200,
		'streaming-pmtp': 200,
		'streaming-hulu': 150,
		'streaming-it': 200,
		'streaming-stan': 150,
		'streaming-crav': 150,
		'streaming-now': 100,
		'streaming-sho': 150,
		'streaming-roku': 100,

		// Micro Encoders - THE HEART OF THIS PROFILE
		// Quality micros are highly valued, low-quality ones less so
		'micro-tigole': 8000, // Tigole is THE BEST micro encoder
		'micro-qxr': 7000, // QxR is excellent
		'micro-rarbg': 4000, // RARBG is solid
		'micro-psa': 3000, // PSA is decent
		'micro-megusta': 2500,
		'micro-galaxyrg': 3000,
		'micro-yts': 2000, // YTS is acceptable (not great)
		'micro-yify': 1500, // YIFY is lower quality

		// Enhancements
		repack: 200,
		proper: 200,
		remastered: 100,
		unrated: 25,
		extended: 50,
		imax: 100,
		theatrical: 25,
		'directors-cut': 50,
		hybrid: 100,
		'codec-x265': 3000, // HEVC essential for Micro
		'codec-x264': 0,
		'codec-av1': 4000, // AV1 is even better
		daily: 0,
		anime: 0,

		// Low Quality Groups - ACCEPTABLE in Micro (neutral to positive)
		// These groups often produce small files which is perfect for Micro
		'lq-nahom': 0,
		'lq-oeplus': 0,
		'lq-4k4u': 0,
		'lq-aoc': 0,
		'lq-beyondhd-encode': 200,
		'lq-hds': 0,
		'lq-d3g': 0,
		'lq-flights': 0,
		'lq-classicalhd': 100,
		'lq-creative24': 100,
		'lq-depraved': 100,
		'lq-devisive': 100,
		'lq-drx': 100,
		'lq-blasphemy': 100,
		'lq-bols': 100,
		'lq-btm': 100,
		'lq-fgt': 100,
		'lq-ivy': 100,
		'lq-kc': 100,

		// Banned formats (even Micro has standards - deceptive/unusable)
		'banned-aroma': BANNED_SCORE,
		'banned-lama': BANNED_SCORE,
		'banned-telly': BANNED_SCORE,
		'banned-bitor': BANNED_SCORE,
		'banned-visionxpert': BANNED_SCORE,
		'banned-sasukeduck': BANNED_SCORE,
		'banned-jennaortegauhd': BANNED_SCORE,
		'banned-extras': BANNED_SCORE,
		'banned-sample': BANNED_SCORE,
		'banned-upscaled': BANNED_SCORE,
		'banned-3d': BANNED_SCORE,
		'banned-cam': BANNED_SCORE,
		'banned-telesync': BANNED_SCORE,
		'banned-telecine': BANNED_SCORE,
		'banned-screener': BANNED_SCORE
	}
};

// =============================================================================
// Streaming Profile - Placeholder Quality
// =============================================================================

/**
 * Streaming Profile: Instant availability, always upgradeable
 *
 * Philosophy: Get something watchable immediately via free streaming sources.
 * This is the lowest tier of quality - it exists purely to provide instant
 * playback while waiting for higher quality torrents to download.
 *
 * The streaming indexer assigns a fixed score of 10 to all streaming releases.
 * This profile ensures:
 * 1. Streaming releases are always accepted (minScore: 0)
 * 2. Upgrades are always allowed and encouraged (upgradesAllowed: true)
 * 3. Any torrent will trigger an upgrade (upgradeUntilScore: 100000)
 * 4. Even small improvements trigger upgrades (minScoreIncrement: 1)
 *
 * The formatScores are minimal since streaming releases don't have traditional
 * quality indicators - they're transcoded by the streaming source.
 *
 * Ideal for: Users who want instant access, will auto-upgrade to torrents
 */
export const STREAMING_PROFILE: ScoringProfile = {
	id: 'streaming',
	name: 'Streaming',
	description: 'Instant streaming with auto-upgrade to higher quality',
	tags: ['streaming', 'instant', 'placeholder', 'auto-upgrade'],
	icon: 'Play',
	color: 'text-cyan-500',
	category: 'streaming',
	upgradesAllowed: true,
	minScore: 0, // Accept any streaming release
	upgradeUntilScore: 100000, // Always upgrade - streaming is just a placeholder
	minScoreIncrement: 1, // Any improvement triggers upgrade
	resolutionOrder: DEFAULT_RESOLUTION_ORDER,
	allowedProtocols: ['streaming'], // ONLY streaming - torrents rejected
	formatScores: {
		// Streaming protocol releases get a proper score
		// This is the primary format for the streaming-only profile
		'streaming-protocol': 50000,

		// Banned formats - reject even for streaming
		'banned-aroma': BANNED_SCORE,
		'banned-lama': BANNED_SCORE,
		'banned-telly': BANNED_SCORE,
		'banned-bitor': BANNED_SCORE,
		'banned-visionxpert': BANNED_SCORE,
		'banned-sasukeduck': BANNED_SCORE,
		'banned-jennaortegauhd': BANNED_SCORE,
		'banned-extras': BANNED_SCORE,
		'banned-sample': BANNED_SCORE,
		'banned-upscaled': BANNED_SCORE,
		'banned-3d': BANNED_SCORE,
		'banned-cam': BANNED_SCORE,
		'banned-telesync': BANNED_SCORE,
		'banned-telecine': BANNED_SCORE,
		'banned-screener': BANNED_SCORE
	}
};

// =============================================================================
// Exports
// =============================================================================

/**
 * All default profiles
 */
export const DEFAULT_PROFILES: ScoringProfile[] = [
	BEST_PROFILE,
	EFFICIENT_PROFILE,
	MICRO_PROFILE,
	STREAMING_PROFILE
];

/**
 * Profile lookup by ID
 */
export const PROFILE_BY_ID: Map<string, ScoringProfile> = new Map(
	DEFAULT_PROFILES.map((p) => [p.id, p])
);

/**
 * Get a profile by ID
 */
export function getProfile(id: string): ScoringProfile | undefined {
	return PROFILE_BY_ID.get(id);
}

/**
 * Create a custom profile from a base profile
 */
export function createCustomProfile(
	base: ScoringProfile,
	overrides: Partial<ScoringProfile>
): ScoringProfile {
	return {
		...base,
		...overrides,
		id: overrides.id ?? `${base.id}-custom`,
		name: overrides.name ?? `${base.name} (Custom)`,
		formatScores: {
			...base.formatScores,
			...(overrides.formatScores ?? {})
		}
	};
}
