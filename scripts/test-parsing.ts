/**
 * Quick test script to verify parsing and scoring with real torrent names
 * Run: npx tsx scripts/test-parsing.ts
 */

import { ReleaseParser } from '../src/lib/server/indexers/parser/ReleaseParser.js';
import { scoreRelease } from '../src/lib/server/scoring/scorer.js';
import type { ScoringProfile } from '../src/lib/server/scoring/types.js';

const parser = new ReleaseParser();

// =============================================================================
// TEST RELEASES - Real-world torrent names
// =============================================================================

const testReleases = [
	// UHD BluRay REMUX - Best quality
	'The.Matrix.1999.2160p.UHD.BluRay.REMUX.DV.HDR.TrueHD.Atmos.7.1-FGT',
	'Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.HDR10+.TrueHD.7.1.Atmos-FraMeSToR',
	'Oppenheimer.2023.2160p.UHD.BluRay.REMUX.HDR.DTS-HD.MA.5.1-EPSiLON',

	// UHD BluRay Encodes - High quality
	'The.Batman.2022.2160p.BluRay.x265.10bit.HDR.DTS-HD.MA.7.1-SWTYBLZ',
	'Top.Gun.Maverick.2022.2160p.BluRay.x265.HDR10+.TrueHD.Atmos.7.1-SURFINBIRD',

	// 1080p BluRay - Good quality
	'Inception.2010.1080p.BluRay.REMUX.AVC.DTS-HD.MA.5.1-EPSiLON',
	'The.Dark.Knight.2008.1080p.BluRay.x264.DTS-FGT',
	'Interstellar.2014.1080p.BluRay.x265.10bit.DTS-HD.MA.5.1-SWTYBLZ',

	// WEB-DL - Streaming quality
	'House.of.the.Dragon.S02E08.2160p.MAX.WEB-DL.DDP5.1.Atmos.DV.H.265-FLUX',
	'The.Last.of.Us.S01E01.2160p.AMZN.WEB-DL.DDP5.1.DV.HDR.H.265-NTb',
	'Severance.S02E01.1080p.ATVP.WEB-DL.DDP5.1.Atmos.H.264-FLUX',

	// WEB-DL with BTN naming convention
	'The.Last.of.Us.S01.2160p.UHD.BluRay.Remux.TrueHDA7.1.H.265-PmP',

	// HDTV - Lower quality
	'Game.of.Thrones.S08E06.720p.HDTV.x264-AVS',
	'Breaking.Bad.S05E16.HDTV.x264-ASAP',

	// Problematic releases (should be flagged/banned)
	'Movie.2024.2160p.AI.UPSCALE.x265-GROUP', // AI upscaled
	'Movie.2024.DVDSCR.XviD-GROUP', // Xvid + screener
	'Movie.2024.2160p.BluRay.x264-GROUP', // x264 at 4K (bad)

	// Season packs
	'Breaking.Bad.S01-S05.1080p.BluRay.x264.DTS-FGT',
	'The.Office.US.S01.1080p.BluRay.x265.10bit.AAC.5.1-GROUP',

	// Various audio formats
	'Movie.2024.1080p.BluRay.DTS-X.7.1-GROUP',
	'Movie.2024.1080p.BluRay.FLAC.2.0-GROUP',
	'Movie.2024.1080p.WEB-DL.Opus.5.1-GROUP',
	'Movie.2024.1080p.WEB-DL.AAC.2.0-GROUP'
];

// =============================================================================
// TEST PROFILE - Profilarr-style scoring
// =============================================================================

const testProfile: ScoringProfile = {
	id: 1,
	name: 'Test Profile - UHD Preferred',
	description: 'Test profile with Profilarr-style scoring',
	formatScores: {
		// HDR Formats (highest priority)
		'hdr-dolby-vision': 3000,
		'hdr-dolby-vision-no-fallback': 1500, // Lower - no HDR fallback
		'hdr-hdr10plus': 2500,
		'hdr-hdr10': 2000,
		'hdr-generic': 1500,
		'hdr-hlg': 1000,
		'hdr-pq': 800,
		'hdr-sdr': 0,

		// Audio - Lossless
		'audio-truehd': 1200,
		'audio-truehd-missing': 1100,
		'audio-dts-x': 1100,
		'audio-dts-hdma': 1000,
		'audio-pcm': 900,
		'audio-flac': 800,

		// Audio - Atmos modifier (stacks)
		'audio-atmos': 400,
		'audio-atmos-missing': 350,

		// Audio - HQ Lossy
		'audio-dts-hd-hra': 600,
		'audio-dts-es': 500,
		'audio-opus': 400,
		'audio-ddplus': 300,

		// Audio - Standard
		'audio-dts': 200,
		'audio-dd': 100,
		'audio-aac': 50,
		'audio-mp3': 0,

		// Banned formats
		'banned-upscaled': -999999,
		'banned-ai-upscaled-tv': -999999,
		'banned-ai-upscaled-movie': -999999,
		'banned-3d': -999999,
		'banned-xvid': -999999,
		'banned-x264-2160p': -999999
	},
	// Size limits
	movieMinSizeGb: '1',
	movieMaxSizeGb: '100',
	episodeMinSizeMb: '100',
	episodeMaxSizeMb: '8000'
};

// =============================================================================
// RUN TESTS
// =============================================================================

console.log('='.repeat(80));
console.log('RELEASE PARSING & SCORING TEST');
console.log('='.repeat(80));
console.log('');

for (const release of testReleases) {
	console.log(`\n${'─'.repeat(80)}`);
	console.log(`📦 ${release}`);
	console.log('─'.repeat(80));

	// Parse the release
	const parsed = parser.parse(release);

	console.log('\n📋 PARSED ATTRIBUTES:');
	console.log(`   Resolution:  ${parsed.resolution || 'unknown'}`);
	console.log(`   Source:      ${parsed.source || 'unknown'}`);
	console.log(`   Codec:       ${parsed.codec || 'unknown'}`);
	console.log(`   Audio:       ${parsed.audio || 'unknown'}`);
	console.log(`   HDR:         ${parsed.hdr || 'none'}`);
	console.log(`   Group:       ${parsed.releaseGroup || 'unknown'}`);
	console.log(`   REMUX:       ${parsed.isRemux}`);
	console.log(`   Proper:      ${parsed.isProper}`);
	console.log(`   Repack:      ${parsed.isRepack}`);
	if (parsed.episode) {
		console.log(
			`   Season:      ${parsed.episode.season ?? parsed.episode.seasons?.join('-') ?? 'unknown'}`
		);
		console.log(
			`   Episode:     ${parsed.episode.episodes?.join(', ') ?? (parsed.episode.isSeasonPack ? 'full season pack' : 'unknown')}`
		);
		console.log(`   Season Pack: ${parsed.episode.isSeasonPack}`);
	}

	// Score the release
	const result = scoreRelease(release, testProfile);

	console.log('\n📊 SCORING RESULT:');
	console.log(`   Total Score: ${result.totalScore}`);
	console.log(
		`   Banned:      ${result.isBanned}${result.bannedReasons?.length ? ` (${result.bannedReasons.join(', ')})` : ''}`
	);

	if (result.matchedFormats.length > 0) {
		console.log('\n   Matched Formats:');
		for (const mf of result.matchedFormats) {
			const score = testProfile.formatScores?.[mf.format.id] ?? mf.format.defaultScore;
			const scoreStr = score >= 0 ? `+${score}` : `${score}`;
			console.log(`     • ${mf.format.name} [${mf.format.id}]: ${scoreStr}`);
		}
	}

	if (result.breakdown) {
		console.log('\n   Category Breakdown:');
		for (const [category, data] of Object.entries(result.breakdown)) {
			if (data.totalScore !== 0) {
				console.log(`     ${category}: ${data.totalScore >= 0 ? '+' : ''}${data.totalScore}`);
			}
		}
	}
}

// =============================================================================
// COMPARISON TEST
// =============================================================================

console.log('\n\n' + '='.repeat(80));
console.log('RELEASE COMPARISON TEST');
console.log('='.repeat(80));

const comparisonSets = [
	{
		name: 'Same Movie - Different Quality',
		releases: [
			'The.Matrix.1999.2160p.UHD.BluRay.REMUX.DV.HDR.TrueHD.Atmos.7.1-FGT',
			'The.Matrix.1999.2160p.BluRay.x265.HDR10.DTS-HD.MA.5.1-GROUP',
			'The.Matrix.1999.1080p.BluRay.x264.DTS-FGT',
			'The.Matrix.1999.720p.BluRay.x264.DD5.1-GROUP'
		]
	},
	{
		name: 'Same Movie - Different Audio',
		releases: [
			'Movie.2024.1080p.BluRay.TrueHD.Atmos.7.1-GROUP',
			'Movie.2024.1080p.BluRay.TrueHD.7.1-GROUP',
			'Movie.2024.1080p.BluRay.DTS-HD.MA.5.1-GROUP',
			'Movie.2024.1080p.BluRay.DTS.5.1-GROUP',
			'Movie.2024.1080p.BluRay.DD5.1-GROUP'
		]
	},
	{
		name: 'Same Movie - Different HDR',
		releases: [
			'Movie.2024.2160p.BluRay.REMUX.DV.HDR-GROUP',
			'Movie.2024.2160p.BluRay.REMUX.HDR10+-GROUP',
			'Movie.2024.2160p.BluRay.REMUX.HDR10-GROUP',
			'Movie.2024.2160p.BluRay.REMUX.HDR-GROUP',
			'Movie.2024.2160p.BluRay.REMUX.SDR-GROUP'
		]
	},
	{
		name: 'TV Episode Sources',
		releases: [
			'Show.S01E01.2160p.UHD.BluRay.REMUX.DV.TrueHD.Atmos-GROUP',
			'Show.S01E01.2160p.AMZN.WEB-DL.DDP5.1.Atmos.DV-GROUP',
			'Show.S01E01.1080p.BluRay.x264.DTS-GROUP',
			'Show.S01E01.1080p.WEB-DL.DD5.1-GROUP',
			'Show.S01E01.720p.HDTV.x264-GROUP'
		]
	}
];

for (const set of comparisonSets) {
	console.log(`\n\n📊 ${set.name}:`);
	console.log('─'.repeat(60));

	const scored = set.releases.map((r) => ({
		release: r,
		result: scoreRelease(r, testProfile)
	}));

	// Sort by score (highest first)
	scored.sort((a, b) => b.result.totalScore - a.result.totalScore);

	let rank = 1;
	for (const { release, result } of scored) {
		const shortName = release.length > 55 ? release.substring(0, 52) + '...' : release;
		const banned = result.isBanned ? ' ❌ BANNED' : '';
		console.log(`  ${rank}. [${result.totalScore.toString().padStart(5)}] ${shortName}${banned}`);
		rank++;
	}
}

console.log('\n\n' + '='.repeat(80));
console.log('✅ TEST COMPLETE');
console.log('='.repeat(80));
