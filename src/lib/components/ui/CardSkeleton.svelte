<script lang="ts">
	/**
	 * Media card skeleton for loading states in grids.
	 * Matches the aspect ratio and layout of MediaCard component.
	 *
	 * @example
	 * {#if loading}
	 *   {#each Array(6) as _}
	 *     <CardSkeleton />
	 *   {/each}
	 * {:else}
	 *   {#each items as item}
	 *     <MediaCard {item} />
	 *   {/each}
	 * {/if}
	 */

	import Skeleton from './Skeleton.svelte';

	interface Props {
		/** Show title and year placeholders (default: true) */
		showDetails?: boolean;
	}

	let { showDetails = true }: Props = $props();
</script>

<div class="card bg-base-100 shadow-sm">
	<!-- Poster placeholder (2:3 aspect ratio like movie posters) -->
	<figure class="aspect-[2/3]">
		<Skeleton class="h-full w-full rounded-none" />
	</figure>

	{#if showDetails}
		<div class="card-body p-3">
			<!-- Title -->
			<Skeleton variant="text" class="w-3/4" />
			<!-- Year/subtitle -->
			<Skeleton variant="text" class="h-3 w-1/3" />
		</div>
	{/if}
</div>
