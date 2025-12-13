#!/usr/bin/env npx tsx
/**
 * Subtitle System Dry-Run Test Script
 *
 * Tests the subtitle search system without actually downloading anything.
 * Shows what would be found and selected for each media item.
 *
 * Usage:
 *   npx tsx scripts/test-subtitle-dryrun.ts [options]
 *
 * Options:
 *   --movies        Only test movies (default: both)
 *   --episodes      Only test episodes (default: both)
 *   --limit N       Limit to N items (default: 10)
 *   --movie-id ID   Test specific movie by ID
 *   --episode-id ID Test specific episode by ID
 *   --verbose       Show all search results, not just best matches
 */

import { db } from '../src/lib/server/db/index.js';
import { movies, series, episodes } from '../src/lib/server/db/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';
import { getSubtitleSearchService } from '../src/lib/server/subtitles/services/SubtitleSearchService.js';
import { getSubtitleProviderManager } from '../src/lib/server/subtitles/services/SubtitleProviderManager.js';
import { LanguageProfileService } from '../src/lib/server/subtitles/services/LanguageProfileService.js';

// ANSI colors for terminal output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
	bgRed: '\x1b[41m',
	bgGreen: '\x1b[42m',
	bgYellow: '\x1b[43m'
};

const DEFAULT_MIN_SCORE = 80;

interface DryRunResult {
	mediaType: 'movie' | 'episode';
	mediaId: string;
	title: string;
	year?: number;
	season?: number;
	episode?: number;
	missingLanguages: string[];
	searchResults: number;
	bestMatches: {
		language: string;
		provider: string;
		score: number;
		title: string;
		wouldDownload: boolean;
		reason?: string;
	}[];
	searchTimeMs: number;
	errors: string[];
}

async function main() {
	const args = process.argv.slice(2);
	const options = {
		moviesOnly: args.includes('--movies'),
		episodesOnly: args.includes('--episodes'),
		limit: parseInt(args.find((a, i) => args[i - 1] === '--limit') || '10'),
		movieId: args.find((a, i) => args[i - 1] === '--movie-id'),
		episodeId: args.find((a, i) => args[i - 1] === '--episode-id'),
		verbose: args.includes('--verbose')
	};

	console.log(
		`${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`
	);
	console.log(
		`${colors.bright}${colors.cyan}║         SUBTITLE SYSTEM DRY-RUN TEST                        ║${colors.reset}`
	);
	console.log(
		`${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`
	);

	// Initialize services
	const providerManager = getSubtitleProviderManager();
	await providerManager.initialize();

	// Check provider health
	console.log(`${colors.bright}Provider Status:${colors.reset}`);
	const healthStatus = await providerManager.getHealthStatus();

	for (const provider of healthStatus) {
		const status = provider.isThrottled
			? `${colors.yellow}THROTTLED${colors.reset}`
			: provider.isHealthy
				? `${colors.green}HEALTHY${colors.reset}`
				: `${colors.red}UNHEALTHY${colors.reset}`;

		console.log(`  ${provider.providerName.padEnd(20)} ${status}`);
		if (provider.lastError) {
			console.log(`    ${colors.dim}Last error: ${provider.lastError}${colors.reset}`);
		}
		if (provider.isThrottled && provider.throttledUntil) {
			console.log(
				`    ${colors.dim}Until: ${new Date(provider.throttledUntil).toLocaleString()}${colors.reset}`
			);
		}
	}

	const enabledProviders = await providerManager.getEnabledProviders();
	console.log(
		`\n${colors.bright}Enabled Providers:${colors.reset} ${enabledProviders.map((p) => p.name).join(', ') || 'None!'}\n`
	);

	if (enabledProviders.length === 0) {
		console.log(`${colors.red}No enabled providers available. Exiting.${colors.reset}`);
		process.exit(1);
	}

	const results: DryRunResult[] = [];

	// Test specific items if provided
	if (options.movieId) {
		console.log(`${colors.bright}Testing specific movie: ${options.movieId}${colors.reset}\n`);
		const result = await testMovie(options.movieId, options.verbose);
		if (result) results.push(result);
	} else if (options.episodeId) {
		console.log(`${colors.bright}Testing specific episode: ${options.episodeId}${colors.reset}\n`);
		const result = await testEpisode(options.episodeId, options.verbose);
		if (result) results.push(result);
	} else {
		// Test movies
		if (!options.episodesOnly) {
			console.log(`${colors.bright}${colors.blue}═══ Testing Movies ═══${colors.reset}\n`);
			const movieResults = await testMovies(options.limit, options.verbose);
			results.push(...movieResults);
		}

		// Test episodes
		if (!options.moviesOnly) {
			console.log(`\n${colors.bright}${colors.blue}═══ Testing Episodes ═══${colors.reset}\n`);
			const episodeResults = await testEpisodes(options.limit, options.verbose);
			results.push(...episodeResults);
		}
	}

	// Summary
	printSummary(results);
}

async function testMovies(limit: number, verbose: boolean): Promise<DryRunResult[]> {
	const results: DryRunResult[] = [];

	// Get movies with files that want subtitles and have a language profile
	const moviesWithProfiles = await db
		.select()
		.from(movies)
		.where(
			and(
				eq(movies.hasFile, true),
				eq(movies.wantsSubtitles, true),
				isNotNull(movies.languageProfileId)
			)
		)
		.limit(limit);

	console.log(`Found ${moviesWithProfiles.length} movies to test\n`);

	for (const movie of moviesWithProfiles) {
		const result = await testMovie(movie.id, verbose);
		if (result) results.push(result);
	}

	return results;
}

async function testMovie(movieId: string, verbose: boolean): Promise<DryRunResult | null> {
	const profileService = LanguageProfileService.getInstance();
	const searchService = getSubtitleSearchService();

	const movie = await db.query.movies.findFirst({
		where: eq(movies.id, movieId)
	});

	if (!movie) {
		console.log(`${colors.red}Movie not found: ${movieId}${colors.reset}`);
		return null;
	}

	if (!movie.languageProfileId) {
		console.log(`${colors.yellow}Movie has no language profile: ${movie.title}${colors.reset}`);
		return null;
	}

	const result: DryRunResult = {
		mediaType: 'movie',
		mediaId: movieId,
		title: movie.title,
		year: movie.year ?? undefined,
		missingLanguages: [],
		searchResults: 0,
		bestMatches: [],
		searchTimeMs: 0,
		errors: []
	};

	try {
		// Check subtitle status
		const status = await profileService.getMovieSubtitleStatus(movieId);

		if (status.satisfied || status.missing.length === 0) {
			console.log(
				`${colors.green}✓${colors.reset} ${movie.title} (${movie.year}) - Already has all required subtitles`
			);
			return null;
		}

		result.missingLanguages = status.missing.map((m) => m.code);

		// Get profile
		const profile = await profileService.getProfile(movie.languageProfileId);
		if (!profile) {
			console.log(`${colors.red}✗${colors.reset} ${movie.title} - Profile not found`);
			return null;
		}

		const minScore = profile.minimumScore ?? DEFAULT_MIN_SCORE;
		const languages = profile.languages.map((l) => l.code);

		console.log(
			`${colors.cyan}►${colors.reset} ${colors.bright}${movie.title}${colors.reset} (${movie.year}) - Missing: ${result.missingLanguages.join(', ')}`
		);

		// Search
		const startTime = Date.now();
		const searchResults = await searchService.searchForMovie(movieId, languages);
		result.searchTimeMs = Date.now() - startTime;
		result.searchResults = searchResults.totalResults;

		// Log provider results
		for (const pr of searchResults.providerResults) {
			if (pr.error) {
				result.errors.push(`${pr.providerName}: ${pr.error}`);
				console.log(`  ${colors.red}✗${colors.reset} ${pr.providerName}: ${pr.error}`);
			} else {
				console.log(
					`  ${colors.dim}${pr.providerName}: ${pr.resultCount} results (${pr.searchTimeMs}ms)${colors.reset}`
				);
			}
		}

		// Analyze results for each missing language
		for (const missing of status.missing) {
			const languageResults = searchResults.results.filter((r) => r.language === missing.code);
			const matches = languageResults
				.filter((r) => r.matchScore >= minScore)
				.sort((a, b) => b.matchScore - a.matchScore);
			const bestMatch = matches[0];

			if (verbose && languageResults.length > 0) {
				console.log(`\n  ${colors.bright}Results for ${missing.code}:${colors.reset}`);
				for (const r of languageResults.slice(0, 5)) {
					const scoreColor = r.matchScore >= minScore ? colors.green : colors.yellow;
					console.log(
						`    ${scoreColor}${r.matchScore.toString().padStart(3)}${colors.reset} | ${r.providerName.padEnd(15)} | ${r.title?.slice(0, 50) || 'No title'}`
					);
				}
			}

			if (bestMatch) {
				result.bestMatches.push({
					language: missing.code,
					provider: bestMatch.providerName,
					score: bestMatch.matchScore,
					title: bestMatch.title || 'Unknown',
					wouldDownload: true
				});
				console.log(
					`  ${colors.green}✓${colors.reset} ${missing.code}: Would download from ${bestMatch.providerName} (score: ${bestMatch.matchScore})`
				);
			} else if (languageResults.length > 0) {
				const bestScore = Math.max(...languageResults.map((r) => r.matchScore));
				result.bestMatches.push({
					language: missing.code,
					provider: languageResults[0].providerName,
					score: bestScore,
					title: languageResults[0].title || 'Unknown',
					wouldDownload: false,
					reason: `Best score ${bestScore} < min ${minScore}`
				});
				console.log(
					`  ${colors.yellow}⚠${colors.reset} ${missing.code}: Found ${languageResults.length} results, but best score (${bestScore}) < min (${minScore})`
				);
			} else {
				result.bestMatches.push({
					language: missing.code,
					provider: 'N/A',
					score: 0,
					title: 'N/A',
					wouldDownload: false,
					reason: 'No results found'
				});
				console.log(`  ${colors.red}✗${colors.reset} ${missing.code}: No results found`);
			}
		}

		console.log(`  ${colors.dim}Search time: ${result.searchTimeMs}ms${colors.reset}\n`);
	} catch (error) {
		result.errors.push(error instanceof Error ? error.message : String(error));
		console.log(
			`  ${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}\n`
		);
	}

	return result;
}

async function testEpisodes(limit: number, verbose: boolean): Promise<DryRunResult[]> {
	const results: DryRunResult[] = [];
	const profileService = LanguageProfileService.getInstance();

	// Get series with language profiles
	const seriesWithProfiles = await db
		.select()
		.from(series)
		.where(and(eq(series.wantsSubtitles, true), isNotNull(series.languageProfileId)))
		.limit(5); // Limit series to avoid too many episodes

	console.log(`Found ${seriesWithProfiles.length} series to check\n`);

	let episodeCount = 0;

	for (const show of seriesWithProfiles) {
		if (episodeCount >= limit) break;

		// Get episodes missing subtitles
		const episodesMissing = await profileService.getSeriesEpisodesMissingSubtitles(show.id);

		for (const episodeId of episodesMissing.slice(0, limit - episodeCount)) {
			const result = await testEpisode(episodeId, verbose);
			if (result) {
				results.push(result);
				episodeCount++;
			}
			if (episodeCount >= limit) break;
		}
	}

	return results;
}

async function testEpisode(episodeId: string, verbose: boolean): Promise<DryRunResult | null> {
	const profileService = LanguageProfileService.getInstance();
	const searchService = getSubtitleSearchService();

	const episode = await db.query.episodes.findFirst({
		where: eq(episodes.id, episodeId)
	});

	if (!episode) {
		console.log(`${colors.red}Episode not found: ${episodeId}${colors.reset}`);
		return null;
	}

	if (!episode.hasFile) {
		console.log(`${colors.yellow}Episode has no file: ${episodeId}${colors.reset}`);
		return null;
	}

	const seriesData = await db.query.series.findFirst({
		where: eq(series.id, episode.seriesId)
	});

	if (!seriesData?.languageProfileId) {
		return null;
	}

	const result: DryRunResult = {
		mediaType: 'episode',
		mediaId: episodeId,
		title: seriesData.title,
		year: seriesData.year ?? undefined,
		season: episode.seasonNumber,
		episode: episode.episodeNumber,
		missingLanguages: [],
		searchResults: 0,
		bestMatches: [],
		searchTimeMs: 0,
		errors: []
	};

	try {
		// Check subtitle status
		const status = await profileService.getEpisodeSubtitleStatus(episodeId);

		if (status.satisfied || status.missing.length === 0) {
			return null; // Already satisfied
		}

		result.missingLanguages = status.missing.map((m) => m.code);

		// Get profile
		const profile = await profileService.getProfile(seriesData.languageProfileId);
		if (!profile) return null;

		const minScore = profile.minimumScore ?? DEFAULT_MIN_SCORE;
		const languages = profile.languages.map((l) => l.code);

		const epLabel = `S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`;
		console.log(
			`${colors.cyan}►${colors.reset} ${colors.bright}${seriesData.title}${colors.reset} ${epLabel} - Missing: ${result.missingLanguages.join(', ')}`
		);

		// Search
		const startTime = Date.now();
		const searchResults = await searchService.searchForEpisode(episodeId, languages);
		result.searchTimeMs = Date.now() - startTime;
		result.searchResults = searchResults.totalResults;

		// Log provider results
		for (const pr of searchResults.providerResults) {
			if (pr.error) {
				result.errors.push(`${pr.providerName}: ${pr.error}`);
				console.log(`  ${colors.red}✗${colors.reset} ${pr.providerName}: ${pr.error}`);
			} else {
				console.log(
					`  ${colors.dim}${pr.providerName}: ${pr.resultCount} results (${pr.searchTimeMs}ms)${colors.reset}`
				);
			}
		}

		// Analyze results for each missing language
		for (const missing of status.missing) {
			const languageResults = searchResults.results.filter((r) => r.language === missing.code);
			const matches = languageResults
				.filter((r) => r.matchScore >= minScore)
				.sort((a, b) => b.matchScore - a.matchScore);
			const bestMatch = matches[0];

			if (verbose && languageResults.length > 0) {
				console.log(`\n  ${colors.bright}Results for ${missing.code}:${colors.reset}`);
				for (const r of languageResults.slice(0, 5)) {
					const scoreColor = r.matchScore >= minScore ? colors.green : colors.yellow;
					console.log(
						`    ${scoreColor}${r.matchScore.toString().padStart(3)}${colors.reset} | ${r.providerName.padEnd(15)} | ${r.title?.slice(0, 50) || 'No title'}`
					);
				}
			}

			if (bestMatch) {
				result.bestMatches.push({
					language: missing.code,
					provider: bestMatch.providerName,
					score: bestMatch.matchScore,
					title: bestMatch.title || 'Unknown',
					wouldDownload: true
				});
				console.log(
					`  ${colors.green}✓${colors.reset} ${missing.code}: Would download from ${bestMatch.providerName} (score: ${bestMatch.matchScore})`
				);
			} else if (languageResults.length > 0) {
				const bestScore = Math.max(...languageResults.map((r) => r.matchScore));
				result.bestMatches.push({
					language: missing.code,
					provider: languageResults[0].providerName,
					score: bestScore,
					title: languageResults[0].title || 'Unknown',
					wouldDownload: false,
					reason: `Best score ${bestScore} < min ${minScore}`
				});
				console.log(
					`  ${colors.yellow}⚠${colors.reset} ${missing.code}: Found ${languageResults.length} results, but best score (${bestScore}) < min (${minScore})`
				);
			} else {
				result.bestMatches.push({
					language: missing.code,
					provider: 'N/A',
					score: 0,
					title: 'N/A',
					wouldDownload: false,
					reason: 'No results found'
				});
				console.log(`  ${colors.red}✗${colors.reset} ${missing.code}: No results found`);
			}
		}

		console.log(`  ${colors.dim}Search time: ${result.searchTimeMs}ms${colors.reset}\n`);
	} catch (error) {
		result.errors.push(error instanceof Error ? error.message : String(error));
		console.log(
			`  ${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}\n`
		);
	}

	return result;
}

function printSummary(results: DryRunResult[]) {
	console.log(
		`\n${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`
	);
	console.log(
		`${colors.bright}${colors.cyan}║                        SUMMARY                               ║${colors.reset}`
	);
	console.log(
		`${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`
	);

	const totalItems = results.length;
	const wouldDownload = results.filter((r) => r.bestMatches.some((m) => m.wouldDownload)).length;
	const withErrors = results.filter((r) => r.errors.length > 0).length;
	const noResults = results.filter((r) => r.searchResults === 0).length;
	const belowThreshold = results.filter(
		(r) => r.searchResults > 0 && !r.bestMatches.some((m) => m.wouldDownload)
	).length;

	const totalSubtitles = results.reduce(
		(sum, r) => sum + r.bestMatches.filter((m) => m.wouldDownload).length,
		0
	);

	console.log(`${colors.bright}Items Tested:${colors.reset}          ${totalItems}`);
	console.log(
		`${colors.green}Would Download:${colors.reset}        ${wouldDownload} items (${totalSubtitles} subtitles)`
	);
	console.log(`${colors.yellow}Below Threshold:${colors.reset}       ${belowThreshold} items`);
	console.log(`${colors.red}No Results:${colors.reset}            ${noResults} items`);
	console.log(`${colors.red}Errors:${colors.reset}                ${withErrors} items`);

	const avgSearchTime =
		results.length > 0
			? Math.round(results.reduce((sum, r) => sum + r.searchTimeMs, 0) / results.length)
			: 0;
	console.log(`${colors.dim}Avg Search Time:${colors.reset}       ${avgSearchTime}ms`);

	// Provider breakdown
	const providerStats: Record<string, { downloads: number; belowThreshold: number }> = {};
	for (const result of results) {
		for (const match of result.bestMatches) {
			if (match.provider !== 'N/A') {
				if (!providerStats[match.provider]) {
					providerStats[match.provider] = { downloads: 0, belowThreshold: 0 };
				}
				if (match.wouldDownload) {
					providerStats[match.provider].downloads++;
				} else {
					providerStats[match.provider].belowThreshold++;
				}
			}
		}
	}

	if (Object.keys(providerStats).length > 0) {
		console.log(`\n${colors.bright}Provider Breakdown:${colors.reset}`);
		for (const [provider, stats] of Object.entries(providerStats)) {
			console.log(
				`  ${provider.padEnd(20)} ${colors.green}${stats.downloads} downloads${colors.reset}, ${colors.yellow}${stats.belowThreshold} below threshold${colors.reset}`
			);
		}
	}

	// Errors breakdown
	if (withErrors > 0) {
		console.log(`\n${colors.bright}${colors.red}Errors:${colors.reset}`);
		const errorCounts: Record<string, number> = {};
		for (const result of results) {
			for (const error of result.errors) {
				errorCounts[error] = (errorCounts[error] || 0) + 1;
			}
		}
		for (const [error, count] of Object.entries(errorCounts).slice(0, 5)) {
			console.log(`  ${colors.red}${count}x${colors.reset} ${error}`);
		}
	}

	console.log();
}

// Run
main().catch((error) => {
	console.error(`${colors.red}Fatal error:${colors.reset}`, error);
	process.exit(1);
});
