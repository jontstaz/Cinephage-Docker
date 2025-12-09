/**
 * AniList Integration Test Script
 *
 * Tests the AniList ID resolver and its integration with AnimeKai.
 * Run with: npx tsx scripts/test-anilist.ts
 */

import { getAniListClient } from '../src/lib/server/streaming/anilist/client';
import { getAniListResolver } from '../src/lib/server/streaming/anilist/AniListResolver';

// Test cases - popular anime with known MAL IDs
const TEST_CASES = [
	{ title: 'Attack on Titan', year: 2013, expectedMalId: 16498 },
	{ title: 'Cyberpunk: Edgerunners', year: 2022, expectedMalId: 42310 },
	{ title: 'Demon Slayer', year: 2019, expectedMalId: 38000 },
	{ title: 'Spy x Family', year: 2022, expectedMalId: 50265 },
	{ title: 'One Punch Man', year: 2015, expectedMalId: 30276 },
	{ title: 'Death Note', year: 2006, expectedMalId: 1535 },
	{ title: 'My Hero Academia', year: 2016, expectedMalId: 31964 },
	{ title: 'Jujutsu Kaisen', year: 2020, expectedMalId: 40748 }
];

async function testClient() {
	console.log('\n' + '='.repeat(60));
	console.log('Testing AniList Client');
	console.log('='.repeat(60));

	const client = getAniListClient();

	// Test search
	console.log('\nSearching for "Attack on Titan"...');
	const results = await client.searchAnime('Attack on Titan', 5);

	if (results.length > 0) {
		console.log(`Found ${results.length} results:`);
		results.forEach((r, i) => {
			console.log(`  ${i + 1}. ${r.title.english || r.title.romaji} (${r.seasonYear})`);
			console.log(`     AniList ID: ${r.id}, MAL ID: ${r.idMal || 'N/A'}`);
		});
	} else {
		console.log('No results found!');
	}
}

async function testResolver() {
	console.log('\n' + '='.repeat(60));
	console.log('Testing AniList Resolver');
	console.log('='.repeat(60));

	const resolver = getAniListResolver();

	let passed = 0;
	let failed = 0;

	for (const testCase of TEST_CASES) {
		console.log(`\nResolving: "${testCase.title}" (${testCase.year})`);

		const result = await resolver.resolve(testCase.title, testCase.year);

		if (result.success) {
			const malMatch = result.malId === testCase.expectedMalId;
			const status = malMatch ? '✓' : '⚠';

			console.log(`  ${status} Found: ${result.matchedTitle}`);
			console.log(`    AniList ID: ${result.anilistId}`);
			console.log(`    MAL ID: ${result.malId} (expected: ${testCase.expectedMalId})`);
			console.log(`    Confidence: ${(result.confidence * 100).toFixed(1)}%`);
			console.log(`    Cached: ${result.cached}`);

			if (malMatch) {
				passed++;
			} else {
				failed++;
				console.log(`    ⚠ MAL ID mismatch!`);
			}
		} else {
			failed++;
			console.log(`  ✗ Failed: ${result.error}`);
		}
	}

	console.log('\n' + '-'.repeat(60));
	console.log(`Results: ${passed}/${TEST_CASES.length} passed, ${failed} failed`);

	// Test cache hit
	console.log('\n' + '='.repeat(60));
	console.log('Testing Cache Hit');
	console.log('='.repeat(60));

	const cacheTest = await resolver.resolve('Attack on Titan', 2013);
	console.log(`\nSecond lookup for "Attack on Titan":`);
	console.log(`  Cached: ${cacheTest.cached} (should be true)`);
	console.log(`  Cache stats:`, resolver.getCacheStats());
}

async function main() {
	console.log('AniList Integration Test');
	console.log('========================\n');

	try {
		await testClient();
		await testResolver();

		console.log('\n' + '='.repeat(60));
		console.log('All tests completed!');
		console.log('='.repeat(60));
	} catch (error) {
		console.error('\nTest failed with error:', error);
		process.exit(1);
	}
}

main();
