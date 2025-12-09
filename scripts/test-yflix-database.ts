/**
 * YFlix Database Integration Test
 *
 * Tests the new enc-dec.app YFlix database API integration.
 * Run with: npx tsx scripts/test-yflix-database.ts
 */

const ENC_DEC_API_URL = 'https://enc-dec.app/api';
const ENC_DEC_DB_URL = 'https://enc-dec.app';
const YFLIX_AJAX = 'https://yflix.to/ajax';

const HEADERS = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
	'Content-Type': 'application/json',
	Accept: 'application/json'
};

// Test cases
const MOVIE_TEST = {
	name: 'Movie: The Shawshank Redemption',
	tmdbId: '278',
	type: 'movie' as const
};

const TV_TEST = {
	name: 'TV: Cyberpunk Edgerunners S01E01',
	tmdbId: '105248',
	type: 'tv' as const,
	season: 1,
	episode: 1
};

// ============================================================================
// API Helpers
// ============================================================================

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...options,
		headers: { ...HEADERS, ...options?.headers }
	});
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}
	return response.json();
}

// ============================================================================
// Test Functions
// ============================================================================

interface YFlixDbItem {
	info: {
		title_en: string;
		type: 'movie' | 'tv';
		year: number;
		flix_watch: string;
		flix_id: string;
		tmdb_id: number;
		imdb_id: string;
		episode_count?: number;
	};
	episodes: Record<string, Record<string, { title: string; eid: string }>>;
}

interface TestResult {
	step: string;
	success: boolean;
	data?: unknown;
	error?: string;
	durationMs: number;
}

async function testDatabaseLookup(
	tmdbId: string,
	type: 'movie' | 'tv'
): Promise<{ result: TestResult; dbItem: YFlixDbItem | null }> {
	const start = Date.now();
	try {
		const url = `${ENC_DEC_DB_URL}/db/flix/find?tmdb_id=${tmdbId}&type=${type}`;
		console.log(`    → GET ${url}`);

		const response = await fetchJson<YFlixDbItem[]>(url);
		const dbItem = response[0] ?? null;

		if (!dbItem) {
			return {
				result: {
					step: 'Database Lookup',
					success: false,
					error: 'Not found in database',
					durationMs: Date.now() - start
				},
				dbItem: null
			};
		}

		return {
			result: {
				step: 'Database Lookup',
				success: true,
				data: {
					title: dbItem.info.title_en,
					flix_id: dbItem.info.flix_id,
					tmdb_id: dbItem.info.tmdb_id,
					year: dbItem.info.year,
					episodeCount: Object.keys(dbItem.episodes).length > 0 ? 'has episodes' : 'no episodes'
				},
				durationMs: Date.now() - start
			},
			dbItem
		};
	} catch (error) {
		return {
			result: {
				step: 'Database Lookup',
				success: false,
				error: error instanceof Error ? error.message : String(error),
				durationMs: Date.now() - start
			},
			dbItem: null
		};
	}
}

async function testEpisodeIdFromDatabase(
	dbItem: YFlixDbItem,
	season: number,
	episode: number
): Promise<TestResult> {
	const start = Date.now();

	const seasonStr = season.toString();
	const episodeStr = episode.toString();
	const episodeData = dbItem.episodes[seasonStr]?.[episodeStr];

	if (!episodeData) {
		return {
			step: 'Episode ID from Database',
			success: false,
			error: `Episode S${season}E${episode} not found. Available seasons: ${Object.keys(dbItem.episodes).join(', ')}`,
			durationMs: Date.now() - start
		};
	}

	return {
		step: 'Episode ID from Database',
		success: true,
		data: {
			episodeId: episodeData.eid,
			episodeTitle: episodeData.title
		},
		durationMs: Date.now() - start
	};
}

async function testServersFetch(
	episodeId: string
): Promise<{ result: TestResult; lid: string | null }> {
	const start = Date.now();
	try {
		// Encrypt episode ID
		const encUrl = `${ENC_DEC_API_URL}/enc-movies-flix?text=${episodeId}`;
		console.log(`    → GET ${encUrl}`);
		const encResponse = await fetchJson<{ result: string }>(encUrl);
		const encEid = encResponse.result;

		// Fetch servers list
		const serversUrl = `${YFLIX_AJAX}/links/list?eid=${episodeId}&_=${encEid}`;
		console.log(`    → GET ${serversUrl}`);
		const serversResponse = await fetchJson<{ result: string }>(serversUrl);

		// Parse HTML to get server ID
		const parseUrl = `${ENC_DEC_API_URL}/parse-html`;
		console.log(`    → POST ${parseUrl}`);
		const servers = await fetchJson<{
			result: Record<string, Record<string, Record<string, string>>>;
		}>(parseUrl, {
			method: 'POST',
			body: JSON.stringify({ text: serversResponse.result })
		});

		const lid = servers.result?.['default']?.['1']?.lid;

		if (!lid) {
			return {
				result: {
					step: 'Servers Fetch',
					success: false,
					error: 'No server ID found',
					data: { availableServers: Object.keys(servers.result || {}) },
					durationMs: Date.now() - start
				},
				lid: null
			};
		}

		return {
			result: {
				step: 'Servers Fetch',
				success: true,
				data: { serverId: lid },
				durationMs: Date.now() - start
			},
			lid
		};
	} catch (error) {
		return {
			result: {
				step: 'Servers Fetch',
				success: false,
				error: error instanceof Error ? error.message : String(error),
				durationMs: Date.now() - start
			},
			lid: null
		};
	}
}

async function testHosterResolution(embedUrl: string): Promise<TestResult> {
	const start = Date.now();
	try {
		// Convert embed URL to media URL
		// /e/{id} -> /media/{id}
		const mediaUrl = embedUrl.replace('/e/', '/media/');
		console.log(`    → GET ${mediaUrl}`);

		const response = await fetch(mediaUrl, { headers: HEADERS });
		const data = (await response.json()) as { result?: string };

		if (!data.result) {
			return {
				step: 'Hoster Resolution',
				success: false,
				error: 'No encrypted result from hoster',
				durationMs: Date.now() - start
			};
		}

		// Decrypt via enc-dec.app
		const decryptUrl = `${ENC_DEC_API_URL}/dec-rapid`;
		console.log(`    → POST ${decryptUrl}`);
		const decrypted = await fetchJson<{
			result: {
				stream?: string;
				file?: string;
				url?: string;
				sources?: Array<{ file: string }>;
			};
		}>(decryptUrl, {
			method: 'POST',
			body: JSON.stringify({
				text: data.result,
				agent: HEADERS['User-Agent']
			})
		});

		// Try various response formats
		const streamUrl =
			decrypted.result?.stream ||
			decrypted.result?.file ||
			decrypted.result?.url ||
			decrypted.result?.sources?.[0]?.file;
		const isValid = streamUrl && streamUrl.includes('.m3u8');

		return {
			step: 'Hoster Resolution',
			success: !!isValid,
			data: {
				finalStreamUrl: isValid ? streamUrl!.substring(0, 80) + '...' : streamUrl,
				type: isValid ? 'HLS stream' : 'unknown'
			},
			durationMs: Date.now() - start
		};
	} catch (error) {
		return {
			step: 'Hoster Resolution',
			success: false,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - start
		};
	}
}

async function testStreamExtraction(
	lid: string
): Promise<{ result: TestResult; embedUrl?: string }> {
	const start = Date.now();
	try {
		// Encrypt server ID
		const encUrl = `${ENC_DEC_API_URL}/enc-movies-flix?text=${lid}`;
		console.log(`    → GET ${encUrl}`);
		const encResponse = await fetchJson<{ result: string }>(encUrl);
		const encLid = encResponse.result;

		// Fetch embed
		const embedUrl = `${YFLIX_AJAX}/links/view?id=${lid}&_=${encLid}`;
		console.log(`    → GET ${embedUrl}`);
		const embedResponse = await fetchJson<{ result: string }>(embedUrl);

		// Decrypt - result can be string OR object with url field
		const decryptUrl = `${ENC_DEC_API_URL}/dec-movies-flix`;
		console.log(`    → POST ${decryptUrl}`);
		const decrypted = await fetchJson<{ result: string | { url?: string } }>(decryptUrl, {
			method: 'POST',
			body: JSON.stringify({ text: embedResponse.result })
		});

		// Handle both string and object response formats
		let streamUrl: string | undefined;
		if (typeof decrypted.result === 'string') {
			streamUrl = decrypted.result;
		} else if (decrypted.result && typeof decrypted.result === 'object') {
			streamUrl = decrypted.result.url;
		}

		const isValid = streamUrl && streamUrl.startsWith('http');

		// Check if this is a hoster embed URL (needs further resolution)
		const isHosterEmbed =
			streamUrl &&
			(streamUrl.includes('rapidairmax.site') ||
				streamUrl.includes('rapidshare.cc') ||
				streamUrl.includes('megaup.site') ||
				streamUrl.includes('megaup.live'));

		return {
			result: {
				step: 'Stream Extraction',
				success: isValid,
				data: {
					streamUrl: isValid ? streamUrl!.substring(0, 100) + '...' : streamUrl,
					type: isHosterEmbed ? 'hoster_embed (needs resolution)' : 'direct_stream'
				},
				durationMs: Date.now() - start
			},
			embedUrl: isHosterEmbed ? streamUrl : undefined
		};
	} catch (error) {
		return {
			result: {
				step: 'Stream Extraction',
				success: false,
				error: error instanceof Error ? error.message : String(error),
				durationMs: Date.now() - start
			}
		};
	}
}

// ============================================================================
// Full Test Flow
// ============================================================================

async function runFullTest(
	testCase: typeof MOVIE_TEST | typeof TV_TEST,
	season?: number,
	episode?: number
) {
	console.log('\n' + '='.repeat(60));
	console.log(`Testing: ${testCase.name}`);
	console.log('='.repeat(60));

	const results: TestResult[] = [];

	// Step 1: Database lookup
	console.log('\n[1] Database Lookup');
	const { result: dbResult, dbItem } = await testDatabaseLookup(testCase.tmdbId, testCase.type);
	results.push(dbResult);
	printResult(dbResult);

	if (!dbItem) {
		return results;
	}

	// Step 2: Get episode ID (for TV shows with database episode)
	let episodeId: string | null = null;

	if (testCase.type === 'tv' && season && episode) {
		console.log('\n[2] Episode ID from Database (optimized path)');
		const episodeResult = await testEpisodeIdFromDatabase(dbItem, season, episode);
		results.push(episodeResult);
		printResult(episodeResult);

		if (episodeResult.success && episodeResult.data) {
			episodeId = (episodeResult.data as { episodeId: string }).episodeId;
		}
	} else {
		// For movies, we need to fetch episode list to get the "episode ID" (movies have 1 episode)
		console.log('\n[2] Fetching episode list (movie path)');
		const start = Date.now();
		try {
			const encUrl = `${ENC_DEC_API_URL}/enc-movies-flix?text=${dbItem.info.flix_id}`;
			console.log(`    → GET ${encUrl}`);
			const encResponse = await fetchJson<{ result: string }>(encUrl);

			const episodesUrl = `${YFLIX_AJAX}/episodes/list?id=${dbItem.info.flix_id}&_=${encResponse.result}`;
			console.log(`    → GET ${episodesUrl}`);
			const episodesResponse = await fetchJson<{ result: string }>(episodesUrl);

			const parseUrl = `${ENC_DEC_API_URL}/parse-html`;
			console.log(`    → POST ${parseUrl}`);
			const episodes = await fetchJson<{
				result: Record<string, Record<string, Record<string, string>>>;
			}>(parseUrl, {
				method: 'POST',
				body: JSON.stringify({ text: episodesResponse.result })
			});

			// Movies typically have season "1", episode "1"
			episodeId = episodes.result?.['1']?.['1']?.eid;

			const result: TestResult = {
				step: 'Episode List Fetch',
				success: !!episodeId,
				data: episodeId ? { episodeId } : { availableSeasons: Object.keys(episodes.result || {}) },
				durationMs: Date.now() - start
			};
			results.push(result);
			printResult(result);
		} catch (error) {
			const result: TestResult = {
				step: 'Episode List Fetch',
				success: false,
				error: error instanceof Error ? error.message : String(error),
				durationMs: Date.now() - start
			};
			results.push(result);
			printResult(result);
		}
	}

	if (!episodeId) {
		console.log('\n⚠️  No episode ID available, cannot continue');
		return results;
	}

	// Step 3: Fetch servers
	console.log('\n[3] Servers Fetch');
	const { result: serversResult, lid } = await testServersFetch(episodeId);
	results.push(serversResult);
	printResult(serversResult);

	if (!lid) {
		return results;
	}

	// Step 4: Extract stream
	console.log('\n[4] Stream Extraction');
	const { result: streamResult, embedUrl } = await testStreamExtraction(lid);
	results.push(streamResult);
	printResult(streamResult);

	// Step 5: Resolve hoster embed (if applicable)
	if (embedUrl) {
		console.log('\n[5] Hoster Resolution (Rapidshare)');
		const hosterResult = await testHosterResolution(embedUrl);
		results.push(hosterResult);
		printResult(hosterResult);
	}

	return results;
}

function printResult(result: TestResult) {
	const icon = result.success ? '✅' : '❌';
	console.log(`  ${icon} ${result.step} (${result.durationMs}ms)`);
	if (result.data) {
		console.log(`     Data: ${JSON.stringify(result.data)}`);
	}
	if (result.error) {
		console.log(`     Error: ${result.error}`);
	}
}

// ============================================================================
// Main
// ============================================================================

async function main() {
	console.log('╔════════════════════════════════════════════════════════════╗');
	console.log('║         YFlix Database Integration Test                    ║');
	console.log('╚════════════════════════════════════════════════════════════╝');

	// Test TV Show
	const tvResults = await runFullTest(TV_TEST, TV_TEST.season, TV_TEST.episode);

	// Test Movie
	const movieResults = await runFullTest(MOVIE_TEST);

	// Summary
	console.log('\n' + '='.repeat(60));
	console.log('SUMMARY');
	console.log('='.repeat(60));

	const allResults = [...tvResults, ...movieResults];
	const passed = allResults.filter((r) => r.success).length;
	const total = allResults.length;

	console.log(`\nTotal: ${passed}/${total} steps passed\n`);

	console.log('TV Show Test:');
	for (const r of tvResults) {
		console.log(`  ${r.success ? '✅' : '❌'} ${r.step}`);
	}

	console.log('\nMovie Test:');
	for (const r of movieResults) {
		console.log(`  ${r.success ? '✅' : '❌'} ${r.step}`);
	}

	const allPassed = allResults.every((r) => r.success);
	console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);

	process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
