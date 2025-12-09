/**
 * Test Scoring Script
 *
 * Tests the scoring system against real release names to verify
 * format matching and profile-based scoring works correctly.
 *
 * Usage: npx tsx scripts/test-scoring.ts
 */

import { scoreRelease, parseRelease } from '../src/lib/server/scoring/scorer.js';
import { DEFAULT_PROFILES } from '../src/lib/server/scoring/profiles.js';
import type { ScoringResult } from '../src/lib/server/scoring/types.js';

// =============================================================================
// Test Releases - Mix of quality levels
// =============================================================================

const TEST_RELEASES = [
	// === HIGH QUALITY (Remux, Top Tier Groups) ===
	'Oppenheimer.2023.2160p.UHD.BluRay.REMUX.DV.HDR.TrueHD.Atmos.7.1-FraMeSToR',
	'Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.HDR10+.TrueHD.7.1.Atmos-EPSiLON',
	'The.Batman.2022.1080p.BluRay.REMUX.AVC.TrueHD.7.1.Atmos-FGT',

	// === QUALITY ENCODES (Good Groups) ===
	'Oppenheimer.2023.2160p.BluRay.x265.10bit.HDR.DTS-HD.MA.5.1-SWTYBLZ',
	'Dune.Part.Two.2024.1080p.BluRay.x264.DTS-HD.MA.7.1-GECKOS',
	'The.Shawshank.Redemption.1994.REMASTERED.1080p.BluRay.x264.DTS-HD.MA.5.1-SWTYBLZ',

	// === WEB-DL (Streaming Sources) ===
	'Shogun.2024.S01E01.2160p.DSNP.WEB-DL.DDP5.1.Atmos.DV.H.265-FLUX',
	'The.Bear.S03E01.1080p.HULU.WEB-DL.DDP5.1.H.264-NTb',
	'Fallout.S01.2160p.AMZN.WEB-DL.DDP5.1.DV.HDR.H.265-NTb',
	'House.of.the.Dragon.S02E01.1080p.MAX.WEB-DL.DDP5.1.Atmos.H.264-FLUX',

	// === EFFICIENT ENCODES (x265, Tigole, QxR) ===
	'Oppenheimer.2023.2160p.BluRay.x265.10bit.HDR.DTS-HD.MA.5.1-Tigole',
	'Dune.Part.Two.2024.1080p.BluRay.x265.10bit.DTS-HD.MA.7.1-QxR',
	'The.Matrix.1999.1080p.BluRay.x265.10bit.AAC.5.1-Tigole',

	// === MICRO (YTS, YIFY, RARBG) ===
	'Oppenheimer.2023.1080p.BluRay.x264-YTS.MX',
	'Dune.Part.Two.2024.720p.BluRay.x264-YIFY',
	'The.Batman.2022.1080p.BluRay.H264.AAC-RARBG',
	'Interstellar.2014.1080p.WEBRip.x264-RARBG',

	// === LOW QUALITY GROUPS (Should be penalized but not banned) ===
	'Movie.2024.1080p.BluRay.x264-FGT',
	'Movie.2024.1080p.WEB-DL.H264-AOC',
	'Movie.2024.720p.BluRay.x264-d3g',

	// === BANNED (Deceptive/Unusable - Should be hard blocked) ===
	'Movie.2024.2160p.UHD.BluRay.HDR.x265-BiTOR', // Fake HDR
	'Movie.2024.1080p.BluRay.x264-AROMA', // Retagging
	'Movie.2024.CAM.x264-GROUP', // CAM
	'Movie.2024.TS.x264-GROUP', // Telesync
	'Movie.2024.HDTS.x264-GROUP', // HD Telesync
	'Movie.2024.DVDScr.x264-GROUP' // Screener
];

// =============================================================================
// Formatting Helpers
// =============================================================================

function formatScore(score: number): string {
	if (score === -Infinity) return '    -∞';
	if (score >= 0) return `+${score.toString().padStart(5)}`;
	return score.toString().padStart(6);
}

function formatBanned(result: ScoringResult): string {
	if (result.isBanned) {
		return `⛔ BANNED: ${result.bannedReasons.join(', ')}`;
	}
	return '';
}

function getTopFormats(result: ScoringResult, count: number = 5): string {
	const sorted = [...result.matchedFormats]
		.filter((f) => f.score !== 0)
		.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
		.slice(0, count);

	if (sorted.length === 0) return 'No scored formats';

	return sorted.map((f) => `${f.format.name}(${f.score >= 0 ? '+' : ''}${f.score})`).join(', ');
}

function truncate(str: string, len: number): string {
	if (str.length <= len) return str.padEnd(len);
	return str.slice(0, len - 3) + '...';
}

// =============================================================================
// Main Test
// =============================================================================

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                        SCORING SYSTEM TEST                                     ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

// Test each profile
for (const profile of DEFAULT_PROFILES) {
	console.log(`\n${'═'.repeat(80)}`);
	console.log(`PROFILE: ${profile.name.toUpperCase()}`);
	console.log(`Description: ${profile.description}`);
	console.log(`Min Score: ${profile.minScore} | Upgrade Until: ${profile.upgradeUntilScore}`);
	console.log('═'.repeat(80));

	const results: { release: string; result: ScoringResult }[] = [];

	for (const release of TEST_RELEASES) {
		const result = scoreRelease(release, profile);
		results.push({ release, result });
	}

	// Sort by score (highest first, banned at bottom)
	results.sort((a, b) => {
		if (a.result.isBanned && !b.result.isBanned) return 1;
		if (!a.result.isBanned && b.result.isBanned) return -1;
		return b.result.totalScore - a.result.totalScore;
	});

	console.log('\n  RANK │ SCORE  │ RELEASE');
	console.log('───────┼────────┼' + '─'.repeat(70));

	let rank = 1;
	for (const { release, result } of results) {
		const scoreStr = formatScore(result.totalScore);
		const bannedStr = formatBanned(result);
		const releaseStr = truncate(release, 65);

		if (result.isBanned) {
			console.log(`   --  │${scoreStr} │ ${releaseStr}`);
			console.log(`       │        │ ${bannedStr}`);
		} else {
			console.log(`  ${rank.toString().padStart(3)} │${scoreStr} │ ${releaseStr}`);
			rank++;
		}
	}

	// Show top 3 with format breakdown
	console.log('\n  TOP 3 FORMAT BREAKDOWN:');
	console.log('─'.repeat(80));

	const top3 = results.filter((r) => !r.result.isBanned).slice(0, 3);
	for (const { release, result } of top3) {
		console.log(`\n  ${truncate(release, 75)}`);
		console.log(`  Score: ${result.totalScore} | Formats: ${getTopFormats(result, 6)}`);
	}
}

// =============================================================================
// Quick Comparison: Same Content, Different Quality
// =============================================================================

console.log('\n\n');
console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    SAME CONTENT - QUALITY COMPARISON                           ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

const OPPENHEIMER_RELEASES = [
	'Oppenheimer.2023.2160p.UHD.BluRay.REMUX.DV.HDR.TrueHD.Atmos.7.1-FraMeSToR',
	'Oppenheimer.2023.2160p.BluRay.x265.10bit.HDR.DTS-HD.MA.5.1-SWTYBLZ',
	'Oppenheimer.2023.2160p.BluRay.x265.10bit.HDR.DTS-HD.MA.5.1-Tigole',
	'Oppenheimer.2023.1080p.BluRay.x264.DTS-HD.MA.5.1-GROUP',
	'Oppenheimer.2023.1080p.BluRay.x265.AAC.5.1-Tigole',
	'Oppenheimer.2023.1080p.BluRay.x264-YTS.MX',
	'Oppenheimer.2023.720p.BluRay.x264-YIFY'
];

console.log('OPPENHEIMER (2023) - Ranked by each profile:\n');

// Table header row
console.log(
	`${'Release'.padEnd(50)} │ ${DEFAULT_PROFILES.map((p) => p.name.padStart(10)).join(' │ ')}`
);
console.log('─'.repeat(50) + '─┼─' + DEFAULT_PROFILES.map(() => '─'.repeat(10)).join('─┼─'));

for (const release of OPPENHEIMER_RELEASES) {
	const shortRelease = truncate(release, 48);
	const scores = DEFAULT_PROFILES.map((profile) => {
		const result = scoreRelease(release, profile);
		return formatScore(result.totalScore);
	});
	console.log(`${shortRelease} │ ${scores.join(' │ ')}`);
}

// =============================================================================
// Detailed Parse Example
// =============================================================================

console.log('\n\n');
console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                         DETAILED PARSE EXAMPLE                                 ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

const EXAMPLE = 'Shogun.2024.S01E01.2160p.DSNP.WEB-DL.DDP5.1.Atmos.DV.H.265-FLUX';

console.log(`Release: ${EXAMPLE}\n`);

const attrs = parseRelease(EXAMPLE);
console.log('Parsed Attributes:');
console.log(`  Resolution: ${attrs.resolution}`);
console.log(`  Source: ${attrs.source}`);
console.log(`  Codec: ${attrs.codec}`);
console.log(`  HDR: ${Array.isArray(attrs.hdr) ? attrs.hdr.join(', ') : attrs.hdr || 'None'}`);
console.log(
	`  Audio: ${Array.isArray(attrs.audio) ? attrs.audio.join(', ') : attrs.audio || 'Unknown'}`
);
console.log(`  Group: ${attrs.releaseGroup}`);
console.log(`  Title: ${attrs.releaseTitle}`);

console.log('\nScores by Profile:');
for (const profile of DEFAULT_PROFILES) {
	const result = scoreRelease(EXAMPLE, profile);
	console.log(`\n  ${profile.name}:`);
	console.log(`    Total Score: ${result.totalScore}`);
	console.log(`    Matched Formats (${result.matchedFormats.length}):`);

	// Group by category
	const byCategory = new Map<string, { name: string; score: number }[]>();
	for (const sf of result.matchedFormats) {
		if (sf.score === 0) continue;
		const cat = sf.format.category;
		if (!byCategory.has(cat)) byCategory.set(cat, []);
		byCategory.get(cat)!.push({ name: sf.format.name, score: sf.score });
	}

	for (const [cat, formats] of byCategory) {
		const formatStr = formats
			.map((f) => `${f.name}(${f.score >= 0 ? '+' : ''}${f.score})`)
			.join(', ');
		console.log(`      ${cat}: ${formatStr}`);
	}
}

console.log('\n✅ Scoring test complete!\n');
