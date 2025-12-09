<script lang="ts">
	import { tmdb } from '$lib/tmdb';

	let {
		path,
		size = 'w500',
		alt,
		class: className = ''
	}: { path: string | null; size?: string; alt: string; class?: string } = $props();

	let src = $state('');
	let loading = $state(true);

	$effect(() => {
		if (!path) {
			loading = false;
			return;
		}

		loading = true;
		tmdb
			.configuration()
			.then((config) => {
				const baseUrl = config.images.secure_base_url;
				src = `${baseUrl}${size}${path}`;
			})
			.catch((e) => {
				console.error('Failed to load TMDB config', e);
			})
			.finally(() => {
				loading = false;
			});
	});
</script>

{#if src}
	<img {src} {alt} class={className} loading="lazy" />
{:else if loading}
	<div class={`animate-pulse bg-base-300 ${className}`}></div>
{:else}
	<div class={`flex items-center justify-center bg-base-300 text-base-content/30 ${className}`}>
		<span class="text-xs">No Image</span>
	</div>
{/if}
