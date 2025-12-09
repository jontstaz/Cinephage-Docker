<script lang="ts">
	import type { QueueStatus } from '$lib/types/queue';

	interface Props {
		progress: number; // 0.0 - 1.0
		status: QueueStatus;
		class?: string;
	}

	let { progress, status, class: className = '' }: Props = $props();

	const percentage = $derived(Math.round(progress * 100));

	const progressClass = $derived(() => {
		switch (status) {
			case 'downloading':
				return 'progress-info';
			case 'seeding':
				return 'progress-success';
			case 'paused':
				return 'progress-warning';
			case 'failed':
				return 'progress-error';
			case 'completed':
			case 'imported':
				return 'progress-success';
			case 'importing':
				return 'progress-info';
			default:
				return 'progress-primary';
		}
	});
</script>

<div class="flex items-center gap-2 {className}">
	<progress class="progress {progressClass()} h-2 w-full" value={percentage} max="100"></progress>
	<span class="w-10 text-right text-xs text-base-content/60">{percentage}%</span>
</div>
