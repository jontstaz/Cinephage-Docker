/**
 * Unit3D API Test Script
 *
 * Tests the Unit3D API directly to understand the response format.
 * Run with: npx tsx scripts/test-unit3d-api.ts
 */

import { db } from '../src/lib/server/db';
import { indexers } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
	console.log('=== Unit3D API Test ===\n');

	// Find OldToonsWorld indexer config
	const configs = await db
		.select()
		.from(indexers)
		.where(eq(indexers.implementation, 'oldtoonsworld'));

	if (configs.length === 0) {
		console.log('No OldToonsWorld indexer configured. Please add it first.');
		process.exit(1);
	}

	const config = configs[0];
	const settings = config.settings as { apiKey?: string };

	if (!settings?.apiKey) {
		console.log('OldToonsWorld indexer has no API key configured.');
		process.exit(1);
	}

	console.log('Found OldToonsWorld config:');
	console.log('  ID:', config.id);
	console.log('  Name:', config.name);
	console.log('  URL:', config.url);
	console.log('  API Key:', settings.apiKey.slice(0, 8) + '...');
	console.log();

	const baseUrl = config.url || 'https://oldtoons.world';
	const apiKey = settings.apiKey;

	// Test 1: Basic filter endpoint with just API token
	console.log('--- Test 1: Basic API call (no filters) ---');
	await testEndpoint(`${baseUrl}/api/torrents/filter?api_token=${apiKey}&perPage=1`);

	// Test 2: Search by name
	console.log('\n--- Test 2: Search by name "Antz" ---');
	await testEndpoint(`${baseUrl}/api/torrents/filter?api_token=${apiKey}&name=Antz&perPage=3`);

	// Test 3: Search by IMDB ID
	console.log('\n--- Test 3: Search by IMDB ID (tt0120587 = Antz) ---');
	await testEndpoint(`${baseUrl}/api/torrents/filter?api_token=${apiKey}&imdbId=120587&perPage=3`);

	// Test 4: Search by TMDB ID
	console.log('\n--- Test 4: Search by TMDB ID (8916 = Antz) ---');
	await testEndpoint(`${baseUrl}/api/torrents/filter?api_token=${apiKey}&tmdbId=8916&perPage=3`);

	// Test 5: Get categories list (if available)
	console.log('\n--- Test 5: Check /api/torrents endpoint ---');
	await testEndpoint(`${baseUrl}/api/torrents?api_token=${apiKey}&perPage=1`);

	console.log('\n=== Test Complete ===');
	process.exit(0);
}

async function testEndpoint(url: string) {
	console.log('URL:', url.replace(/api_token=[^&]+/, 'api_token=***'));

	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'Cinephage/1.0'
			}
		});

		console.log('Status:', response.status, response.statusText);

		const text = await response.text();

		// Try to parse as JSON
		try {
			const json = JSON.parse(text);

			// Show structure
			console.log('Response structure:');
			console.log('  Top-level keys:', Object.keys(json));

			if (json.data && Array.isArray(json.data)) {
				console.log('  data.length:', json.data.length);

				if (json.data.length > 0) {
					const first = json.data[0];
					console.log('  First item keys:', Object.keys(first));

					if (first.attributes) {
						console.log('  First item attributes keys:', Object.keys(first.attributes));
						console.log('  Sample torrent:');
						console.log('    id:', first.id);
						console.log('    type:', first.type);
						console.log('    name:', first.attributes.name);
						console.log('    size:', first.attributes.size);
						console.log('    seeders:', first.attributes.seeders);
						console.log(
							'    download_link:',
							first.attributes.download_link ? '(present)' : '(missing)'
						);
						console.log(
							'    details_link:',
							first.attributes.details_link ? '(present)' : '(missing)'
						);
						console.log('    info_hash:', first.attributes.info_hash ? '(present)' : '(missing)');
						console.log('    imdb_id:', first.attributes.imdb_id);
						console.log('    tmdb_id:', first.attributes.tmdb_id);
						console.log('    category:', first.attributes.category);
					} else {
						// Flat structure - no attributes wrapper
						console.log('  ⚠️  No "attributes" wrapper - flat structure!');
						console.log('  Sample torrent (flat):');
						console.log('    id:', first.id);
						console.log('    name:', first.name);
						console.log('    size:', first.size);
						console.log('    seeders:', first.seeders);
						console.log('    download_link:', first.download_link ? '(present)' : '(missing)');
						console.log('    details_link:', first.details_link ? '(present)' : '(missing)');
					}
				}
			} else if (json.data && typeof json.data === 'object') {
				console.log('  data is an object, not array');
				console.log('  data keys:', Object.keys(json.data));
			}

			if (json.links) {
				console.log('  links:', Object.keys(json.links));
			}
			if (json.meta) {
				console.log('  meta:', json.meta);
			}
		} catch {
			console.log('Response is not JSON:');
			console.log(text.slice(0, 500));
		}
	} catch (error) {
		console.log('Error:', error instanceof Error ? error.message : error);
	}
}

main().catch(console.error);
