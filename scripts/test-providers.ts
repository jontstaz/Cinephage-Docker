/**
 * Provider Test Script
 *
 * Tests streaming providers against live APIs.
 * Run with: npx tsx scripts/test-providers.ts
 */

// Minimal implementation for testing outside SvelteKit
const ENC_DEC_API_URL = 'https://enc-dec.app/api';

interface TestResult {
	provider: string;
	success: boolean;
	streamUrl?: string;
	error?: string;
	durationMs: number;
}

// Test content
const MOVIE_TEST = {
	tmdbId: '278',
	imdbId: 'tt0111161',
	title: 'The Shawshank Redemption',
	year: 1994,
	type: 'movie' as const
};

const TV_TEST = {
	tmdbId: '105248',
	imdbId: 'tt12590266',
	title: 'Cyberpunk: Edgerunners',
	year: 2022,
	type: 'tv' as const,
	season: 1,
	episode: 1
};

const HEADERS = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
	'Content-Type': 'application/json',
	Connection: 'keep-alive'
};

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...options,
		headers: { ...HEADERS, ...options?.headers }
	});
	return response.json();
}

async function fetchText(url: string, options?: RequestInit): Promise<string> {
	const response = await fetch(url, {
		...options,
		headers: { ...HEADERS, ...options?.headers }
	});
	return response.text();
}

// ============================================================================
// Provider Tests
// ============================================================================

async function testVideasy(): Promise<TestResult> {
	const start = Date.now();
	try {
		const params = TV_TEST;
		const url = `https://api.videasy.net/myflixerzupcloud/sources-with-title?title=${encodeURIComponent(params.title)}&mediaType=${params.type}&year=${params.year}&tmdbId=${params.tmdbId}&episodeId=${params.episode}&seasonId=${params.season}`;

		const encrypted = await fetchText(url);
		if (!encrypted || encrypted.length < 10) {
			return {
				provider: 'videasy',
				success: false,
				error: 'No encrypted data',
				durationMs: Date.now() - start
			};
		}

		const decrypted = await fetchJson<{
			result: { stream?: string; file?: string; sources?: Array<{ url?: string }> };
		}>(`${ENC_DEC_API_URL}/dec-videasy`, {
			method: 'POST',
			body: JSON.stringify({ text: encrypted, id: params.tmdbId })
		});

		const streamUrl =
			decrypted.result?.stream || decrypted.result?.file || decrypted.result?.sources?.[0]?.url;
		return {
			provider: 'videasy',
			success: !!streamUrl,
			streamUrl,
			durationMs: Date.now() - start
		};
	} catch (error) {
		return {
			provider: 'videasy',
			success: false,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - start
		};
	}
}

async function testVidlink(): Promise<TestResult> {
	const start = Date.now();
	try {
		const params = TV_TEST;

		// Encrypt TMDB ID
		const encResponse = await fetchJson<{ result: string }>(
			`${ENC_DEC_API_URL}/enc-vidlink?text=${params.tmdbId}`
		);
		const encryptedId = encResponse.result;

		// Fetch stream data
		const url = `https://vidlink.pro/api/b/tv/${encryptedId}/${params.season}/${params.episode}`;
		const data = await fetchJson<{ stream?: { playlist: string } }>(url, {
			headers: { Referer: 'https://vidlink.pro/' }
		});

		const streamUrl = data.stream?.playlist;
		return {
			provider: 'vidlink',
			success: !!streamUrl,
			streamUrl,
			durationMs: Date.now() - start
		};
	} catch (error) {
		return {
			provider: 'vidlink',
			success: false,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - start
		};
	}
}

async function testXPrime(): Promise<TestResult> {
	const start = Date.now();
	try {
		const params = TV_TEST;

		// Get turnstile token
		const tokenResponse = await fetchJson<{ result: string }>(`${ENC_DEC_API_URL}/enc-xprime`);
		const token = tokenResponse.result;

		// Build URL
		const queryParams = new URLSearchParams({
			name: params.title,
			year: params.year.toString(),
			id: params.tmdbId,
			imdb: params.imdbId,
			season: params.season.toString(),
			episode: params.episode.toString(),
			turnstile: token
		});

		const url = `https://backend.xprime.tv/primebox?${queryParams.toString()}`;
		const encrypted = await fetchText(url, {
			headers: { Origin: 'https://xprime.tv' }
		});

		if (!encrypted || encrypted.length < 10) {
			return {
				provider: 'xprime',
				success: false,
				error: 'No encrypted data',
				durationMs: Date.now() - start
			};
		}

		// Decrypt
		const decrypted = await fetchJson<{ result: { stream?: string; file?: string; url?: string } }>(
			`${ENC_DEC_API_URL}/dec-xprime`,
			{
				method: 'POST',
				body: JSON.stringify({ text: encrypted })
			}
		);

		const streamUrl = decrypted.result?.stream || decrypted.result?.file || decrypted.result?.url;
		return {
			provider: 'xprime',
			success: !!streamUrl,
			streamUrl,
			durationMs: Date.now() - start
		};
	} catch (error) {
		return {
			provider: 'xprime',
			success: false,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - start
		};
	}
}

async function testSmashy(): Promise<TestResult> {
	const start = Date.now();
	try {
		const params = TV_TEST;

		// Get token
		const tokenResponse = await fetchJson<{ result: { token: string; user_id: string } }>(
			`${ENC_DEC_API_URL}/enc-vidstack`
		);
		const tokenData = tokenResponse.result;

		// Use Type 1 server (videosmashyi) for TV - Type 2 servers return 404 for TV content
		// Format: /{imdb_id}/{tmdb_id}/{season}/{episode}
		const imdbSlot = params.imdbId || params.tmdbId;
		const url = `https://api.smashystream.top/api/v1/videosmashyi/${imdbSlot}/${params.tmdbId}/${params.season}/${params.episode}?token=${tokenData.token}&user_id=${tokenData.user_id}`;

		const response = await fetchJson<{ data?: string; success?: boolean }>(url);

		// Type 1 returns data as string in "host/#id" format
		if (!response.data || typeof response.data !== 'string' || !response.data.includes('/#')) {
			return {
				provider: 'smashy',
				success: false,
				error: 'No player URL in response',
				durationMs: Date.now() - start
			};
		}

		const [host, id] = response.data.split('/#');

		// Fetch encrypted stream data
		const streamDataUrl = `${host}/api/v1/video?id=${id}`;
		const encrypted = await fetchText(streamDataUrl);

		if (!encrypted || encrypted.length < 10) {
			return {
				provider: 'smashy',
				success: false,
				error: 'No encrypted stream data',
				durationMs: Date.now() - start
			};
		}

		// Decrypt (type 1)
		const decrypted = await fetchJson<{ result: unknown }>(`${ENC_DEC_API_URL}/dec-vidstack`, {
			method: 'POST',
			body: JSON.stringify({ text: encrypted, type: '1' })
		});

		// Handle both string and object responses
		let streamUrl: string | undefined;
		if (typeof decrypted.result === 'string') {
			streamUrl = decrypted.result;
		} else if (decrypted.result && typeof decrypted.result === 'object') {
			const obj = decrypted.result as {
				source?: string;
				stream?: string;
				file?: string;
				url?: string;
				cf?: string;
			};
			streamUrl = obj.source || obj.cf || obj.stream || obj.file || obj.url;
		}

		return {
			provider: 'smashy',
			success: !!streamUrl && streamUrl.startsWith('http'),
			streamUrl,
			durationMs: Date.now() - start
		};
	} catch (error) {
		return {
			provider: 'smashy',
			success: false,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - start
		};
	}
}

async function testMapple(): Promise<TestResult> {
	const start = Date.now();
	try {
		// Use movie test (like the reference) since it's simpler
		const params = MOVIE_TEST;

		// Get session ID and nextAction - API provides current Next-Action hash
		const sessionResponse = await fetchJson<{ result: { sessionId: string; nextAction: string } }>(
			`${ENC_DEC_API_URL}/enc-mapple`
		);
		const sessionId = sessionResponse.result?.sessionId;
		const nextAction = sessionResponse.result?.nextAction;

		if (!sessionId || !nextAction) {
			return {
				provider: 'mapple',
				success: false,
				error: 'No session ID or nextAction',
				durationMs: Date.now() - start
			};
		}

		// Build payload (exactly like reference)
		const payload = [
			{
				mediaId: params.tmdbId,
				mediaType: 'movie',
				tv_slug: '',
				source: 'mapple',
				sessionId: sessionId
			}
		];

		// Build URL
		const url = `https://mapple.uk/watch/movie/${params.tmdbId}`;

		// POST with special headers - use dynamic nextAction from API
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'User-Agent': HEADERS['User-Agent'],
				'Content-Type': 'application/json',
				Connection: 'keep-alive',
				Referer: 'https://mapple.uk/',
				'Next-Action': nextAction
			},
			body: JSON.stringify(payload)
		});

		const text = await response.text();

		// Parse response (format: "0:...\n1:JSON_DATA")
		const lines = text.split('\n');
		const dataLine = lines.find((l) => l.startsWith('1:'));

		if (!dataLine) {
			return {
				provider: 'mapple',
				success: false,
				error: 'No data line in response',
				durationMs: Date.now() - start
			};
		}

		const jsonData = dataLine.substring(2);
		let streamData: { url?: string; file?: string; stream?: string };

		try {
			streamData = JSON.parse(jsonData);
		} catch {
			return {
				provider: 'mapple',
				success: false,
				error: 'Failed to parse JSON',
				durationMs: Date.now() - start
			};
		}

		const streamUrl = streamData.url || streamData.file || streamData.stream;

		return {
			provider: 'mapple',
			success: !!streamUrl,
			streamUrl,
			durationMs: Date.now() - start
		};
	} catch (error) {
		return {
			provider: 'mapple',
			success: false,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - start
		};
	}
}

async function testHexa(): Promise<TestResult> {
	const start = Date.now();
	try {
		const params = TV_TEST;

		// Generate random 32-byte hex key
		const key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');

		// Build URL
		const url = `https://themoviedb.hexa.su/api/tmdb/tv/${params.tmdbId}/season/${params.season}/episode/${params.episode}/images`;

		// Fetch with API key header
		const encrypted = await fetchText(url, {
			headers: {
				'X-Api-Key': key,
				Accept: 'plain/text'
			}
		});

		if (!encrypted || encrypted.length < 10) {
			return {
				provider: 'hexa',
				success: false,
				error: 'No encrypted data',
				durationMs: Date.now() - start
			};
		}

		// Decrypt
		const decrypted = await fetchJson<{
			result: { stream?: string; file?: string; sources?: Array<{ url?: string }> };
		}>(`${ENC_DEC_API_URL}/dec-hexa`, {
			method: 'POST',
			body: JSON.stringify({ text: encrypted, key: key })
		});

		const streamUrl =
			decrypted.result?.stream || decrypted.result?.file || decrypted.result?.sources?.[0]?.url;
		return {
			provider: 'hexa',
			success: !!streamUrl,
			streamUrl,
			durationMs: Date.now() - start
		};
	} catch (error) {
		return {
			provider: 'hexa',
			success: false,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - start
		};
	}
}

// ============================================================================
// Main
// ============================================================================

async function main() {
	console.log('='.repeat(60));
	console.log('Provider Test Suite');
	console.log('Test Content: Cyberpunk: Edgerunners S01E01');
	console.log('='.repeat(60));
	console.log('');

	const tests = [
		{ name: 'Videasy', fn: testVideasy },
		{ name: 'Vidlink', fn: testVidlink },
		{ name: 'XPrime', fn: testXPrime },
		{ name: 'Smashystream', fn: testSmashy },
		{ name: 'Hexa', fn: testHexa },
		{ name: 'Mapple', fn: testMapple }
	];

	const results: TestResult[] = [];

	for (const test of tests) {
		console.log(`Testing ${test.name}...`);
		const result = await test.fn();
		results.push(result);

		if (result.success) {
			console.log(`  ✅ SUCCESS (${result.durationMs}ms)`);
			console.log(`     Stream: ${result.streamUrl?.substring(0, 80)}...`);
		} else {
			console.log(`  ❌ FAILED (${result.durationMs}ms)`);
			console.log(`     Error: ${result.error}`);
		}
		console.log('');
	}

	// Summary
	console.log('='.repeat(60));
	console.log('Summary');
	console.log('='.repeat(60));
	const passed = results.filter((r) => r.success).length;
	const total = results.length;
	console.log(`Passed: ${passed}/${total}`);

	for (const result of results) {
		const icon = result.success ? '✅' : '❌';
		console.log(
			`  ${icon} ${result.provider}: ${result.success ? 'PASS' : 'FAIL'} (${result.durationMs}ms)`
		);
	}
}

main().catch(console.error);
