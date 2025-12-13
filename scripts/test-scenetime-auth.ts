/**
 * SceneTime Authentication Test Script
 *
 * Tests the complete authentication flow for SceneTime:
 * 1. Reads user cookies from .env (SCENETIME_COOKIE)
 * 2. Initializes BrowserSolver for Cloudflare bypass
 * 3. Visits SceneTime with combined cookies
 * 4. Verifies authentication (checks for logout.php)
 * 5. Performs a sample search to verify full functionality
 *
 * Usage:
 *   1. Add to .env: SCENETIME_COOKIE="uid=XXXXX; pass=YYYYY"
 *   2. Add to .env: BROWSER_SOLVER_ENABLED=true
 *   3. Run: npx tsx scripts/test-scenetime-auth.ts
 */

import 'dotenv/config';

const SCENETIME_URL = 'https://www.scenetime.com';
const BROWSE_URL = `${SCENETIME_URL}/browse.php`;

interface TestResult {
	step: string;
	success: boolean;
	message: string;
	details?: Record<string, unknown>;
}

const results: TestResult[] = [];

function log(step: string, success: boolean, message: string, details?: Record<string, unknown>) {
	const icon = success ? '✓' : '✗';
	console.log(`  ${icon} ${step}: ${message}`);
	if (details) {
		for (const [key, value] of Object.entries(details)) {
			console.log(`      ${key}: ${JSON.stringify(value)}`);
		}
	}
	results.push({ step, success, message, details });
}

function parseCookieString(cookieStr: string): Record<string, string> {
	const cookies: Record<string, string> = {};
	if (!cookieStr) return cookies;

	const pairs = cookieStr.split(';');
	for (const pair of pairs) {
		const [name, ...valueParts] = pair.trim().split('=');
		if (name && valueParts.length > 0) {
			cookies[name.trim()] = valueParts.join('=').trim();
		}
	}
	return cookies;
}

function buildCookieHeader(cookies: Record<string, string>): string {
	return Object.entries(cookies)
		.map(([name, value]) => `${name}=${value}`)
		.join('; ');
}

async function main() {
	console.log('╔══════════════════════════════════════════════════════════════╗');
	console.log('║           SceneTime Authentication Test                       ║');
	console.log('╚══════════════════════════════════════════════════════════════╝\n');

	// Step 1: Check environment variables
	console.log('Step 1: Checking environment...');

	const userCookieStr = process.env.SCENETIME_COOKIE;
	const browserSolverEnabled = process.env.BROWSER_SOLVER_ENABLED === 'true';

	if (!userCookieStr) {
		log('ENV Check', false, 'SCENETIME_COOKIE not set in .env');
		console.log('\n  To fix: Add to .env file:');
		console.log('  SCENETIME_COOKIE="uid=XXXXX; pass=YYYYY"');
		console.log('\n  Get cookies from: Browser DevTools (F12) → Network → Cookie header');
		return;
	}

	const userCookies = parseCookieString(userCookieStr);
	log('Cookie Parse', true, `Parsed ${Object.keys(userCookies).length} cookies`, {
		cookieNames: Object.keys(userCookies)
	});

	// Check for required cookies
	const hasUid = 'uid' in userCookies;
	const hasPass = 'pass' in userCookies;
	const hasCfClearance = 'cf_clearance' in userCookies;

	if (!hasUid || !hasPass) {
		log('Cookie Validation', false, 'Missing required cookies (uid or pass)', {
			hasUid,
			hasPass
		});
		console.log('\n  Your cookie should look like: uid=12345; pass=abc123def456');
		return;
	}

	if (hasCfClearance) {
		log(
			'Cookie Warning',
			true,
			'cf_clearance found in user cookies - will be overwritten by BrowserSolver'
		);
		// Remove cf_clearance - BrowserSolver will provide it
		delete userCookies['cf_clearance'];
	}

	log('Cookie Validation', true, 'Required cookies present (uid, pass)');

	log('BrowserSolver', browserSolverEnabled, browserSolverEnabled ? 'Enabled' : 'Disabled');

	if (!browserSolverEnabled) {
		console.log('\n  To enable: Add to .env: BROWSER_SOLVER_ENABLED=true');
	}

	// Step 2: Initialize BrowserSolver (if enabled)
	console.log('\nStep 2: Initializing BrowserSolver...');

	let browserSolver: Awaited<
		ReturnType<typeof import('../src/lib/server/indexers/http/browser').getBrowserSolver>
	> | null = null;
	let cfCookies: Record<string, string> = {};

	if (browserSolverEnabled) {
		try {
			const { getBrowserSolver } = await import('../src/lib/server/indexers/http/browser');
			browserSolver = getBrowserSolver();
			await browserSolver.initialize();

			if (browserSolver.isEnabled()) {
				log('BrowserSolver Init', true, 'Initialized successfully');

				// Solve Cloudflare challenge
				console.log('\n  Solving Cloudflare challenge (this may take 30-60 seconds)...');
				const solveResult = await browserSolver.solve({
					url: SCENETIME_URL,
					indexerId: 'scenetime-test',
					timeout: 90000
				});

				if (solveResult.success) {
					cfCookies = solveResult.cookies;
					log('Cloudflare Solve', true, `Got ${Object.keys(cfCookies).length} cookies`, {
						cookieNames: Object.keys(cfCookies),
						challengeType: solveResult.challengeType,
						solveTimeMs: solveResult.solveTimeMs
					});
				} else {
					log('Cloudflare Solve', false, solveResult.error ?? 'Unknown error');
				}
			} else {
				log('BrowserSolver Init', false, 'Not ready after initialization');
			}
		} catch (error) {
			log(
				'BrowserSolver Init',
				false,
				error instanceof Error ? error.message : 'Failed to initialize'
			);
		}
	} else {
		log('BrowserSolver Init', false, 'Skipped (disabled)');
	}

	// Step 3: Combine cookies and test auth
	console.log('\nStep 3: Testing authentication...');

	const allCookies = { ...cfCookies, ...userCookies };
	const cookieHeader = buildCookieHeader(allCookies);

	log('Combined Cookies', true, `${Object.keys(allCookies).length} total cookies`, {
		cookieNames: Object.keys(allCookies)
	});

	try {
		console.log(`\n  Fetching ${BROWSE_URL}...`);
		const response = await fetch(BROWSE_URL, {
			headers: {
				Cookie: cookieHeader,
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			},
			redirect: 'follow'
		});

		const body = await response.text();

		log('HTTP Request', response.ok, `Status ${response.status}`, {
			finalUrl: response.url,
			contentLength: body.length
		});

		// Check for Cloudflare challenge
		const isCloudflare =
			body.includes('Just a moment...') ||
			body.includes('cf-browser-verification') ||
			body.includes('Checking your browser');

		if (isCloudflare) {
			log('Cloudflare Check', false, 'Still seeing Cloudflare challenge page');
			console.log('\n  The BrowserSolver may not have solved the challenge correctly.');
			console.log('  Try running again or check if SceneTime is accessible in a browser.');
			return;
		}

		log('Cloudflare Check', true, 'No Cloudflare challenge detected');

		// Check for logout.php (auth verification)
		const hasLogoutLink = body.includes('logout.php');
		log(
			'Auth Verification',
			hasLogoutLink,
			hasLogoutLink ? 'Found logout.php link' : 'No logout.php link found'
		);

		if (!hasLogoutLink) {
			// Check for login form
			const hasLoginForm = body.includes('login') && body.includes('password');
			if (hasLoginForm) {
				log('Auth Status', false, 'Login page detected - cookies are invalid or expired');
			} else {
				log('Auth Status', false, 'Could not determine auth status');
				// Save response for debugging
				const debugPath = '/tmp/scenetime-response.html';
				const fs = await import('fs');
				fs.writeFileSync(debugPath, body);
				console.log(`\n  Response saved to ${debugPath} for debugging`);
			}
			return;
		}

		log('Auth Status', true, 'Successfully authenticated!');

		// Step 4: Try a sample search
		console.log('\nStep 4: Testing search functionality...');

		const searchUrl = `${BROWSE_URL}?search=test&cata=yes&c59=1&c9=1`;
		console.log(`\n  Searching: ${searchUrl}`);

		const searchResponse = await fetch(searchUrl, {
			headers: {
				Cookie: cookieHeader,
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			},
			redirect: 'follow'
		});

		const searchBody = await searchResponse.text();

		log('Search Request', searchResponse.ok, `Status ${searchResponse.status}`);

		// Parse results - look for table.movehere
		const hasResultTable =
			searchBody.includes('table class="movehere"') || searchBody.includes('class="movehere"');
		const rowMatches = searchBody.match(/class="browse"/g);
		const resultCount = rowMatches ? rowMatches.length : 0;

		log('Search Results', hasResultTable, `Found ${resultCount} result rows`, {
			hasTable: hasResultTable,
			rowCount: resultCount
		});

		// Extract sample titles if we found results
		if (resultCount > 0) {
			const titleMatches = searchBody.match(/details\.php\?id=\d+"[^>]*>([^<]+)</g);
			if (titleMatches && titleMatches.length > 0) {
				const sampleTitles = titleMatches.slice(0, 3).map((m) => {
					const match = m.match(/>([^<]+)$/);
					return match ? match[1].trim() : '';
				});
				log('Sample Titles', true, 'First few results', { titles: sampleTitles });
			}
		}
	} catch (error) {
		log('HTTP Request', false, error instanceof Error ? error.message : 'Request failed');
	}

	// Summary
	console.log('\n' + '═'.repeat(60));
	console.log('Test Summary');
	console.log('═'.repeat(60));

	const successful = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;

	console.log(`\n  Total steps: ${results.length}`);
	console.log(`  Successful: ${successful}`);
	console.log(`  Failed: ${failed}`);

	if (failed > 0) {
		console.log('\n  Failed steps:');
		for (const result of results.filter((r) => !r.success)) {
			console.log(`    - ${result.step}: ${result.message}`);
		}
	}

	// Cleanup
	if (browserSolver) {
		console.log('\nShutting down BrowserSolver...');
		await browserSolver.shutdown();
	}

	console.log('\nDone.');
	process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
	console.error('\nFatal error:', error);
	process.exit(1);
});
