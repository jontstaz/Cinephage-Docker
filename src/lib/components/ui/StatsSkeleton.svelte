<script lang="ts">
	/**
	 * Stats card skeleton for dashboard loading states.
	 */

	import Skeleton from './Skeleton.svelte';
</script>

<div class="stat">
	<div class="stat-figure text-base-content/30">
		<Skeleton variant="circle" class="h-8 w-8" />
	</div>
	<Skeleton variant="text" class="mb-1 h-3 w-20" />
	<Skeleton variant="text" class="h-8 w-16" />
	<Skeleton variant="text" class="mt-1 h-3 w-24" />
</div>
