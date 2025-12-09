<script lang="ts">
	import type { QualityInfo, MediaInfo } from '$lib/types/library';
	import { getQualityDisplay, getHdrDisplay } from '$lib/types/library';

	interface Props {
		quality: QualityInfo | null;
		mediaInfo?: MediaInfo | null;
		size?: 'sm' | 'md' | 'lg';
	}

	let { quality, mediaInfo = null, size = 'md' }: Props = $props();

	const qualityText = $derived(getQualityDisplay(quality));
	const hdrText = $derived(getHdrDisplay(mediaInfo));
	const sourceText = $derived(quality?.source || null);

	const sizeClasses = {
		sm: 'badge-xs text-xs',
		md: 'badge-sm text-xs',
		lg: 'badge-md text-sm'
	};
</script>

{#if qualityText || hdrText || sourceText}
	<div class="flex items-center gap-1">
		{#if qualityText}
			<span class="badge badge-primary {sizeClasses[size]}">{qualityText}</span>
		{/if}
		{#if sourceText}
			<span class="badge badge-secondary {sizeClasses[size]}">{sourceText}</span>
		{/if}
		{#if hdrText}
			<span class="badge badge-accent {sizeClasses[size]}">{hdrText}</span>
		{/if}
	</div>
{/if}
