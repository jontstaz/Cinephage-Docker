<script lang="ts">
	import { tmdb } from '$lib/tmdb';
	import MediaCard from '$lib/components/tmdb/MediaCard.svelte';
	import type { Movie, TVShow, Person, PaginatedResponse } from '$lib/types/tmdb';
	import { onMount } from 'svelte';

	let trendingMovies = $state<Movie[]>([]);
	let trendingTV = $state<TVShow[]>([]);
	let people = $state<Person[]>([]);
	let error = $state<string | null>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			// Test 1: Fetch Trending Movies
			const moviesRes = await tmdb.get<PaginatedResponse<Movie>>('/trending/movie/week');
			trendingMovies = moviesRes.results.slice(0, 6);

			// Test 2: Fetch Trending TV
			const tvRes = await tmdb.get<PaginatedResponse<TVShow>>('/trending/tv/week');
			trendingTV = tvRes.results.slice(0, 6);

			// Test 3: Fetch Popular People
			const peopleRes = await tmdb.get<PaginatedResponse<Person>>('/person/popular');
			people = peopleRes.results.slice(0, 6);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	});
</script>

<div class="w-full space-y-8 p-4">
	<h1 class="text-3xl font-bold">TMDB Integration Test</h1>

	{#if error}
		<div class="alert alert-error">
			<span>Error: {error}</span>
		</div>
	{/if}

	{#if loading}
		<div class="loading loading-lg loading-spinner"></div>
	{:else}
		<section>
			<h2 class="mb-4 text-2xl font-bold">Movies (MediaCard Test)</h2>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
				{#each trendingMovies as movie (movie.id)}
					<MediaCard item={movie} />
				{/each}
			</div>
		</section>

		<section>
			<h2 class="mb-4 text-2xl font-bold">TV Shows (MediaCard Test)</h2>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
				{#each trendingTV as show (show.id)}
					<MediaCard item={show} />
				{/each}
			</div>
		</section>

		<section>
			<h2 class="mb-4 text-2xl font-bold">People (MediaCard Test)</h2>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
				{#each people as person (person.id)}
					<MediaCard item={person} />
				{/each}
			</div>
		</section>

		<section>
			<h2 class="mb-4 text-2xl font-bold">Raw Data Inspection (First Movie)</h2>
			<pre class="max-h-60 overflow-auto rounded-lg bg-base-300 p-4 text-xs">
{JSON.stringify(trendingMovies[0], null, 2)}
            </pre>
		</section>
	{/if}
</div>
