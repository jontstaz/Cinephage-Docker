/**
 * Dump SceneTime HTML structure for analysis
 */
import 'dotenv/config';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

const cookie = process.env.SCENETIME_COOKIE;
if (!cookie) {
	console.log('SCENETIME_COOKIE not set');
	process.exit(1);
}

async function main() {
	const response = await fetch('https://www.scenetime.com/browse.php?search=test&cata=yes&c59=1', {
		headers: {
			Cookie: cookie,
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
		}
	});

	const html = await response.text();

	// Save HTML for inspection
	writeFileSync('/tmp/scenetime.html', html);
	console.log('Full HTML saved to /tmp/scenetime.html\n');

	const $ = cheerio.load(html);

	console.log('=== TABLE STRUCTURE ===\n');

	const table = $('table.movehere');
	console.log(`Found table.movehere: ${table.length > 0 ? 'YES' : 'NO'}`);

	// Find ALL links containing "download" anywhere in the page
	console.log('\n=== ALL DOWNLOAD LINKS IN PAGE ===\n');
	$('a[href*="download"]').each((i, a) => {
		if (i < 10) {
			console.log(`  ${$(a).attr('href')}`);
		}
	});

	// Look at the full first row HTML
	const rows = table.find('tr:has(a[href*="details.php"])');
	if (rows.length > 0) {
		const firstRow = rows.first();
		console.log('\n=== FIRST ROW FULL HTML ===\n');
		console.log(firstRow.html()?.substring(0, 2000));

		// Check for any links in the row
		console.log('\n=== ALL LINKS IN FIRST ROW ===\n');
		firstRow.find('a').each((i, a) => {
			const href = $(a).attr('href');
			const text = $(a).text().trim().substring(0, 30);
			console.log(`  [${i}] href="${href}" text="${text}"`);
		});

		// Check second column specifically (Name column)
		const nameCell = firstRow.find('td').eq(1);
		console.log('\n=== NAME CELL (td[1]) STRUCTURE ===\n');
		console.log(nameCell.html()?.substring(0, 1000));
	}
}

main().catch(console.error);
