/**
 * AnimeKai End-to-End Stream Extraction Test
 * Tests the complete flow: AniList → MAL ID → AnimeKai content ID → Stream extraction
 */

async function testAnimeKaiStreams() {
	console.log('='.repeat(70));
	console.log('AnimeKai End-to-End Stream Extraction Test');
	console.log('='.repeat(70));

	const { getProviderById } = await import('../src/lib/server/streaming/providers');
	const { anilistResolver } = await import('../src/lib/server/streaming/anilist');

	const animeKai = getProviderById('animekai');
	if (!animeKai) {
		console.log('AnimeKai provider not found!');
		return;
	}

	// Test: Attack on Titan S1E1
	const title = 'Attack on Titan';
	const year = 2013;
	const tmdbId = '1429';
	const imdbId = 'tt2560140';
	const season = 1;
	const episode = 1;

	console.log('\n🎌 Test: Attack on Titan S1E1');
	console.log('   TMDB:', tmdbId, '| IMDB:', imdbId);

	// Step 1: AniList Resolution
	console.log('\n1. AniList Resolution...');
	const anilistResult = await anilistResolver.resolve(title, year);
	if (anilistResult.success) {
		console.log('   ✓ MAL ID:', anilistResult.malId);
		console.log('   ✓ AniList ID:', anilistResult.anilistId);
	} else {
		console.log('   ✗ AniList failed:', anilistResult.error);
	}

	// Step 2: AnimeKai Extraction
	console.log('\n2. AnimeKai Stream Extraction...');
	const startTime = Date.now();

	const result = await animeKai.extract({
		tmdbId,
		type: 'tv',
		season,
		episode,
		imdbId,
		title,
		year,
		malId: anilistResult.malId ?? undefined,
		anilistId: anilistResult.anilistId ?? undefined
	});

	const duration = Date.now() - startTime;

	if (result.success && result.streams && result.streams.length > 0) {
		console.log('   ✓ Extraction successful! (' + duration + 'ms)');
		console.log('   Streams found:', result.streams.length);
		result.streams.slice(0, 5).forEach((s, i) => {
			console.log(
				'   ' + (i + 1) + '. ' + (s.quality || 'Auto') + ' - ' + (s.server || s.title || 'Unknown')
			);
			console.log('      URL: ' + s.url.substring(0, 80) + '...');
			if (s.subtitles && s.subtitles.length > 0) {
				console.log('      Subtitles: ' + s.subtitles.length + ' tracks');
			}
		});
	} else {
		console.log('   ✗ Extraction failed (' + duration + 'ms)');
		console.log('   Error:', result.error || 'No streams');
	}

	console.log('\n' + '='.repeat(70));
}

testAnimeKaiStreams().catch(console.error);
