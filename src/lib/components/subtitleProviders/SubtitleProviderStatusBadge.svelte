<script lang="ts">
	import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-svelte';

	interface Props {
		enabled: boolean;
		healthy: boolean;
		consecutiveFailures: number;
		lastError?: string;
		throttledUntil?: string;
	}

	let { enabled, healthy, consecutiveFailures, lastError, throttledUntil }: Props = $props();

	const isThrottled = $derived(throttledUntil && new Date(throttledUntil) > new Date());

	const statusInfo = $derived.by(() => {
		if (!enabled) {
			return { text: 'Disabled', class: 'badge-ghost', icon: XCircle };
		}
		if (isThrottled) {
			return { text: 'Throttled', class: 'badge-warning', icon: Clock };
		}
		if (!healthy || consecutiveFailures > 0) {
			return { text: 'Unhealthy', class: 'badge-error', icon: AlertCircle };
		}
		return { text: 'Healthy', class: 'badge-success', icon: CheckCircle };
	});

	const Icon = $derived(statusInfo.icon);
</script>

<div
	class="tooltip"
	data-tip={lastError || (isThrottled ? `Throttled until ${throttledUntil}` : '')}
>
	<div class="badge gap-1 {statusInfo.class}">
		<Icon class="h-3 w-3" />
		{statusInfo.text}
	</div>
</div>
