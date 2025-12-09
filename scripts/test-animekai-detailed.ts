/**
 * Detailed AnimeKai Extraction Debug Test
 * Traces each step of the extraction process
 */

async function testAnimeKaiDetailed() {
	console.log('='.repeat(70));
	console.log('AnimeKai Detailed Debug Test');
	console.log('='.repeat(70));

	const { getEncDecClient } = await import('../src/lib/server/streaming/enc-dec');
	const encDec = getEncDecClient();

	// Content ID from our successful lookup
	const contentId = 'eoq88w'; // Attack on Titan
	const season = '1';
	const episode = '1';

	const ANIMEKAI_AJAX = 'https://animekai.to/ajax';

	type ParsedHtml = Record<string, Record<string, Record<string, string>>>;

	console.log('\nUsing content ID:', contentId);

	try {
		// Step 1: Encrypt content ID
		console.log('\n1. Encrypting content ID...');
		const encId = await encDec.encrypt('kai', contentId);
		console.log('   Encrypted ID:', encId.substring(0, 50) + '...');

		// Step 2: Fetch episodes list
		console.log('\n2. Fetching episodes list...');
		const episodesUrl = `${ANIMEKAI_AJAX}/episodes/list?ani_id=${contentId}&_=${encId}`;
		console.log('   URL:', episodesUrl);

		const episodesResp = await fetch(episodesUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36',
				Accept: '*/*',
				Referer: 'https://animekai.to/'
			}
		});

		console.log('   Status:', episodesResp.status);
		const episodesData = await episodesResp.json();
		console.log('   Has result:', !!episodesData.result);
		console.log('   Result length:', episodesData.result?.length || 0);

		if (!episodesData.result) {
			console.log('   ✗ No episodes result');
			return;
		}

		// Step 3: Parse HTML to get episode token
		console.log('\n3. Parsing episodes HTML...');
		const episodes = await encDec.parseHtml<ParsedHtml>(episodesData.result);
		console.log('   Parsed seasons:', Object.keys(episodes));

		// Check season/episode structure
		if (episodes[season]) {
			console.log('   Season', season, 'episodes:', Object.keys(episodes[season]));
			if (episodes[season][episode]) {
				console.log('   Episode', episode, 'data:', JSON.stringify(episodes[season][episode]));
			} else {
				console.log('   ✗ Episode', episode, 'not found');
			}
		} else {
			console.log('   ✗ Season', season, 'not found');
			console.log('   Available structure:', JSON.stringify(episodes, null, 2).substring(0, 500));
		}

		const token = episodes[season]?.[episode]?.token;
		if (!token) {
			console.log('   ✗ No token found');
			return;
		}
		console.log('   Token:', token);

		// Step 4: Get servers list
		console.log('\n4. Fetching servers list...');
		const encToken = await encDec.encrypt('kai', token);
		const serversUrl = `${ANIMEKAI_AJAX}/links/list?token=${token}&_=${encToken}`;
		console.log('   URL:', serversUrl);

		const serversResp = await fetch(serversUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36',
				Accept: '*/*',
				Referer: 'https://animekai.to/'
			}
		});

		console.log('   Status:', serversResp.status);
		const serversData = await serversResp.json();
		console.log('   Has result:', !!serversData.result);

		if (!serversData.result) {
			console.log('   ✗ No servers result');
			return;
		}

		// Step 5: Parse servers HTML
		console.log('\n5. Parsing servers HTML...');
		const servers = await encDec.parseHtml<ParsedHtml>(serversData.result);
		console.log('   Parsed types:', Object.keys(servers));

		// Show server structure
		for (const type of Object.keys(servers)) {
			console.log('   Type:', type, '- Servers:', Object.keys(servers[type]));
			for (const serverId of Object.keys(servers[type]).slice(0, 2)) {
				console.log('     Server', serverId, ':', JSON.stringify(servers[type][serverId]));
			}
		}

		const lid = servers['sub']?.['1']?.lid || servers['dub']?.['1']?.lid;
		if (!lid) {
			console.log('   ✗ No server ID (lid) found');
			return;
		}
		console.log('   Using lid:', lid);

		// Step 6: Get embed
		console.log('\n6. Fetching embed...');
		const encLid = await encDec.encrypt('kai', lid);
		const embedUrl = `${ANIMEKAI_AJAX}/links/view?id=${lid}&_=${encLid}`;
		console.log('   URL:', embedUrl);

		const embedResp = await fetch(embedUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36',
				Accept: '*/*',
				Referer: 'https://animekai.to/'
			}
		});

		console.log('   Status:', embedResp.status);
		const embedData = await embedResp.json();
		console.log('   Has result:', !!embedData.result);

		if (!embedData.result) {
			console.log('   ✗ No embed result');
			return;
		}

		// Step 7: Decrypt
		console.log('\n7. Decrypting...');
		const decrypted = await encDec.decrypt<string>('kai', {
			text: embedData.result
		});
		console.log('   Decrypted:', decrypted);

		console.log('\n✓ SUCCESS! Stream URL obtained');
	} catch (error) {
		console.log('\n✗ Error:', error instanceof Error ? error.message : error);
		if (error instanceof Error && error.stack) {
			console.log('   Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
		}
	}

	console.log('\n' + '='.repeat(70));
}

testAnimeKaiDetailed().catch(console.error);
