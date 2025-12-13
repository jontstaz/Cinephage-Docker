/**
 * Test SceneTime indexer with BrowserSolver integration.
 *
 * This script tests that the full integration works:
 * 1. BrowserSolver initializes
 * 2. IndexerHttp uses it when Cloudflare is detected
 * 3. SceneTime indexer can search successfully
 *
 * Usage: npx tsx scripts/test-scenetime-integration.ts
 */

import { initializeDatabase } from '../src/lib/server/db';
import { getBrowserSolver } from '../src/lib/server/indexers/http/browser';
import { getIndexerManager } from '../src/lib/server/indexers';

async function main() {
	console.log('╔══════════════════════════════════════════════════════════════╗');
	console.log('║       SceneTime + BrowserSolver Integration Test             ║');
	console.log('╚══════════════════════════════════════════════════════════════╝\n');

	try {
		// Step 1: Initialize database
		console.log('Step 1: Initializing database...');
		await initializeDatabase();
		console.log('  ✓ Database initialized\n');

		// Step 2: Initialize BrowserSolver
		console.log('Step 2: Initializing BrowserSolver...');
		const browserSolver = getBrowserSolver();
		await browserSolver.initialize();

		if (!browserSolver.isEnabled()) {
			console.log('  ⚠ BrowserSolver is disabled');
			console.log('  Set BROWSER_SOLVER_ENABLED=true to enable\n');
		} else {
			const health = browserSolver.getHealth();
			console.log(`  ✓ BrowserSolver ready (${health.totalInstances} browser instances)\n`);
		}

		// Step 3: Get IndexerManager and find SceneTime
		console.log('Step 3: Loading SceneTime indexer...');
		const indexerManager = await getIndexerManager();

		const indexers = await indexerManager.getIndexers();
		const scenetime = indexers.find(
			(i) => i.definitionId === 'scenetime' || i.name.toLowerCase().includes('scenetime')
		);

		if (!scenetime) {
			console.log('  ✗ SceneTime indexer not found');
			console.log('  Available indexers:', indexers.map((i) => i.name).join(', '));
			return;
		}

		console.log(`  ✓ Found SceneTime indexer: ${scenetime.name} (${scenetime.id})\n`);

		// Step 4: Test the indexer
		console.log('Step 4: Testing SceneTime search...');
		console.log('  Searching for "test"...\n');

		const startTime = Date.now();

		try {
			const results = await indexerManager.search({
				indexerIds: [scenetime.id],
				query: 'test',
				type: 'movie',
				limit: 5
			});

			const duration = Date.now() - startTime;

			console.log(`  ✓ Search completed in ${duration}ms`);
			console.log(`  Results: ${results.length} releases found\n`);

			if (results.length > 0) {
				console.log('  Sample results:');
				for (const result of results.slice(0, 3)) {
					console.log(`    - ${result.title}`);
					console.log(`      Size: ${(result.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
					console.log(`      Seeders: ${result.seeders || 'N/A'}`);
				}
			}
		} catch (searchError) {
			const duration = Date.now() - startTime;
			console.log(`  ✗ Search failed after ${duration}ms`);
			console.log(`  Error: ${searchError instanceof Error ? searchError.message : searchError}`);

			// Check if it was a Cloudflare error
			if (searchError instanceof Error) {
				if (searchError.message.includes('Cloudflare')) {
					console.log('\n  This is a Cloudflare-related error.');
					console.log('  The BrowserSolver should have handled this automatically.');
					console.log('  Check the logs above for more details.');
				}
			}
		}

		// Step 5: Show BrowserSolver stats
		console.log('\n' + '='.repeat(60));
		console.log('BrowserSolver Statistics');
		console.log('='.repeat(60));

		const finalHealth = browserSolver.getHealth();
		console.log(`  Total solve attempts: ${finalHealth.metrics.totalAttempts}`);
		console.log(`  Successful: ${finalHealth.metrics.successfulSolves}`);
		console.log(`  Cache hits: ${finalHealth.metrics.cacheHits}`);
		console.log(`  Cache size: ${finalHealth.cacheSize} hosts`);
		console.log(`  Avg solve time: ${finalHealth.averageSolveTimeMs}ms`);
	} catch (error) {
		console.error('\nFatal error:', error);
	} finally {
		// Cleanup
		console.log('\nShutting down...');
		const solver = getBrowserSolver();
		await solver.shutdown();
		console.log('Done.');
		process.exit(0);
	}
}

main().catch(console.error);
