/**
 * Live integration test for the BrowserSolver.
 *
 * This script tests the browser solver against real Cloudflare-protected sites.
 * It's designed to be run manually to verify the solver works correctly.
 *
 * Usage: npx tsx scripts/test-browser-solver.ts [--full]
 *
 * Options:
 *   --full    Run full test suite including slow tests
 */

import { getBrowserSolver, resetBrowserSolver } from '../src/lib/server/indexers/http/browser';

// Test sites with various levels of Cloudflare protection
const TEST_SITES = {
	// No Cloudflare - baseline test
	baseline: {
		url: 'https://example.com',
		description: 'No Cloudflare (baseline)',
		expectChallenge: false
	},

	// Known Cloudflare test sites
	nowsecure: {
		url: 'https://nowsecure.nl',
		description: 'Cloudflare test site',
		expectChallenge: true
	},

	// SceneTime (tracker from the codebase that uses CF)
	scenetime: {
		url: 'https://www.scenetime.com',
		description: 'SceneTime tracker',
		expectChallenge: true
	}
};

interface TestResult {
	site: string;
	url: string;
	success: boolean;
	hasClearance: boolean;
	challengeType?: string;
	solveTimeMs: number;
	cookieCount: number;
	error?: string;
}

async function testSite(
	name: string,
	config: (typeof TEST_SITES)[keyof typeof TEST_SITES]
): Promise<TestResult> {
	const solver = getBrowserSolver();

	console.log(`\n${'='.repeat(60)}`);
	console.log(`Testing: ${config.description}`);
	console.log(`URL: ${config.url}`);
	console.log(`Expected challenge: ${config.expectChallenge}`);
	console.log('='.repeat(60));

	const startTime = Date.now();

	try {
		const result = await solver.solve({
			url: config.url,
			timeout: 60_000,
			indexerId: `test-${name}`
		});

		const hasClearance = 'cf_clearance' in result.cookies;
		const cookieCount = Object.keys(result.cookies).length;

		console.log(`\nResult:`);
		console.log(`  Success: ${result.success ? '✓' : '✗'}`);
		console.log(`  Challenge type: ${result.challengeType || 'none'}`);
		console.log(`  Has cf_clearance: ${hasClearance ? '✓' : '✗'}`);
		console.log(`  Cookies extracted: ${cookieCount}`);
		console.log(`  Solve time: ${result.solveTimeMs}ms`);
		console.log(`  Final URL: ${result.finalUrl || 'N/A'}`);

		if (result.error) {
			console.log(`  Error: ${result.error}`);
		}

		if (cookieCount > 0) {
			console.log(`  Cookie names: ${Object.keys(result.cookies).join(', ')}`);
		}

		return {
			site: name,
			url: config.url,
			success: result.success,
			hasClearance,
			challengeType: result.challengeType,
			solveTimeMs: result.solveTimeMs,
			cookieCount,
			error: result.error
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.log(`\n  ERROR: ${message}`);

		return {
			site: name,
			url: config.url,
			success: false,
			hasClearance: false,
			solveTimeMs: Date.now() - startTime,
			cookieCount: 0,
			error: message
		};
	}
}

async function testCaching(): Promise<void> {
	const solver = getBrowserSolver();

	console.log(`\n${'='.repeat(60)}`);
	console.log('Testing: Cookie Caching');
	console.log('='.repeat(60));

	// First request - should solve
	console.log('\nFirst request (should solve)...');
	const result1 = await solver.solve({
		url: 'https://example.com',
		timeout: 30_000,
		indexerId: 'cache-test'
	});
	console.log(`  Solve time: ${result1.solveTimeMs}ms`);

	// Second request - should use cache
	console.log('\nSecond request (should use cache)...');
	const result2 = await solver.solve({
		url: 'https://example.com',
		timeout: 30_000,
		indexerId: 'cache-test'
	});
	console.log(`  Solve time: ${result2.solveTimeMs}ms`);

	if (result2.solveTimeMs < 100) {
		console.log('  ✓ Cache hit detected (fast response)');
	} else {
		console.log('  ✗ Cache may not be working (slow response)');
	}

	// Force re-solve
	console.log('\nThird request (force re-solve)...');
	const result3 = await solver.solve({
		url: 'https://example.com',
		timeout: 30_000,
		indexerId: 'cache-test',
		forceSolve: true
	});
	console.log(`  Solve time: ${result3.solveTimeMs}ms`);

	if (result3.solveTimeMs > 100) {
		console.log('  ✓ Force re-solve worked (slow response)');
	}
}

async function printHealthStatus(): Promise<void> {
	const solver = getBrowserSolver();
	const health = solver.getHealth();

	console.log(`\n${'='.repeat(60)}`);
	console.log('Browser Solver Health Status');
	console.log('='.repeat(60));
	console.log(`  Total instances: ${health.totalInstances}`);
	console.log(`  Available: ${health.availableInstances}`);
	console.log(`  Busy: ${health.busyInstances}`);
	console.log(`  Queued requests: ${health.queuedRequests}`);
	console.log(`  Cache size: ${health.cacheSize}`);
	console.log(`  Avg solve time: ${health.averageSolveTimeMs}ms`);
	console.log(`  Success rate: ${(health.successRate * 100).toFixed(1)}%`);
	console.log(`\n  Metrics:`);
	console.log(`    Total attempts: ${health.metrics.totalAttempts}`);
	console.log(`    Successful: ${health.metrics.successfulSolves}`);
	console.log(`    Failed: ${health.metrics.failedSolves}`);
	console.log(`    Cache hits: ${health.metrics.cacheHits}`);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const fullTest = args.includes('--full');

	console.log('╔══════════════════════════════════════════════════════════════╗');
	console.log('║          BrowserSolver Live Integration Test                 ║');
	console.log('╚══════════════════════════════════════════════════════════════╝');
	console.log(`\nMode: ${fullTest ? 'Full test suite' : 'Quick test (use --full for all tests)'}`);

	const results: TestResult[] = [];

	try {
		// Initialize solver
		console.log('\nInitializing BrowserSolver...');
		const solver = getBrowserSolver();
		await solver.initialize();

		if (!solver.isEnabled()) {
			console.log('\n⚠️  BrowserSolver is disabled. Check configuration.');
			console.log('Set BROWSER_SOLVER_ENABLED=true to enable.');
			return;
		}

		console.log('✓ BrowserSolver initialized');

		// Always run baseline test
		results.push(await testSite('baseline', TEST_SITES.baseline));

		// Test caching
		await testCaching();

		if (fullTest) {
			// Test Cloudflare sites
			for (const [name, config] of Object.entries(TEST_SITES)) {
				if (name === 'baseline') continue;
				results.push(await testSite(name, config));
			}
		}

		// Print health status
		await printHealthStatus();

		// Summary
		console.log(`\n${'='.repeat(60)}`);
		console.log('Test Summary');
		console.log('='.repeat(60));

		const successful = results.filter((r) => r.success).length;
		const withClearance = results.filter((r) => r.hasClearance).length;

		console.log(`\nTotal tests: ${results.length}`);
		console.log(`Successful: ${successful}/${results.length}`);
		console.log(`Got cf_clearance: ${withClearance}/${results.length}`);

		console.log('\nPer-site results:');
		for (const result of results) {
			const status = result.success ? '✓' : '✗';
			const clearance = result.hasClearance ? '(cf_clearance)' : '';
			console.log(`  ${status} ${result.site}: ${result.solveTimeMs}ms ${clearance}`);
			if (result.error) {
				console.log(`      Error: ${result.error}`);
			}
		}
	} catch (error) {
		console.error('\nFatal error:', error);
		process.exit(1);
	} finally {
		// Cleanup
		console.log('\nShutting down...');
		await resetBrowserSolver();
		console.log('Done.');
	}
}

main().catch(console.error);
