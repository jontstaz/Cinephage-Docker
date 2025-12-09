<script lang="ts">
	import { CheckCircle, XCircle, Loader2 } from 'lucide-svelte';

	type Status = 'idle' | 'searching' | 'success' | 'failed';

	interface Props {
		status: Status;
		releaseName?: string | null;
		error?: string | null;
		size?: 'xs' | 'sm' | 'md';
	}

	let { status, releaseName = null, error = null, size = 'sm' }: Props = $props();

	const iconSizes = {
		xs: 12,
		sm: 14,
		md: 16
	};
</script>

{#if status === 'searching'}
	<div class="tooltip" data-tip="Searching...">
		<Loader2 size={iconSizes[size]} class="animate-spin text-primary" />
	</div>
{:else if status === 'success'}
	<div class="tooltip" data-tip={releaseName || 'Release grabbed'}>
		<CheckCircle size={iconSizes[size]} class="text-success" />
	</div>
{:else if status === 'failed'}
	<div class="tooltip tooltip-error" data-tip={error || 'Search failed'}>
		<XCircle size={iconSizes[size]} class="text-error" />
	</div>
{/if}
