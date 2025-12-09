<script lang="ts">
	import type { QueueStats as QueueStatsType } from '$lib/types/queue';
	import { Download, Upload, HardDrive, AlertCircle, CheckCircle2, Pause } from 'lucide-svelte';

	interface Props {
		stats: QueueStatsType;
	}

	let { stats }: Props = $props();

	// Format bytes to human readable
	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	// Format speed
	function formatSpeed(bytesPerSecond: number): string {
		return formatBytes(bytesPerSecond) + '/s';
	}
</script>

<div class="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
	<!-- Total -->
	<div class="stat rounded-box bg-base-200 p-4">
		<div class="stat-figure text-primary">
			<HardDrive class="h-6 w-6" />
		</div>
		<div class="stat-title text-xs">Total</div>
		<div class="stat-value text-xl">{stats.totalCount}</div>
	</div>

	<!-- Downloading -->
	<div class="stat rounded-box bg-base-200 p-4">
		<div class="stat-figure text-info">
			<Download class="h-6 w-6" />
		</div>
		<div class="stat-title text-xs">Downloading</div>
		<div class="stat-value text-xl text-info">{stats.downloadingCount}</div>
	</div>

	<!-- Seeding -->
	<div class="stat rounded-box bg-base-200 p-4">
		<div class="stat-figure text-success">
			<Upload class="h-6 w-6" />
		</div>
		<div class="stat-title text-xs">Seeding</div>
		<div class="stat-value text-xl text-success">{stats.seedingCount}</div>
	</div>

	<!-- Paused -->
	<div class="stat rounded-box bg-base-200 p-4">
		<div class="stat-figure text-warning">
			<Pause class="h-6 w-6" />
		</div>
		<div class="stat-title text-xs">Paused</div>
		<div class="stat-value text-xl text-warning">{stats.pausedCount}</div>
	</div>

	<!-- Completed -->
	<div class="stat rounded-box bg-base-200 p-4">
		<div class="stat-figure text-success">
			<CheckCircle2 class="h-6 w-6" />
		</div>
		<div class="stat-title text-xs">Completed</div>
		<div class="stat-value text-xl">{stats.completedCount}</div>
	</div>

	<!-- Failed -->
	<div class="stat rounded-box bg-base-200 p-4">
		<div class="stat-figure text-error">
			<AlertCircle class="h-6 w-6" />
		</div>
		<div class="stat-title text-xs">Failed</div>
		<div class="stat-value text-xl text-error">{stats.failedCount}</div>
	</div>

	<!-- Speeds -->
	<div class="stat rounded-box bg-base-200 p-4">
		<div class="stat-title text-xs">Speed</div>
		<div class="stat-value flex flex-col gap-1 text-sm">
			<span class="flex items-center gap-1 text-info">
				<Download class="h-3 w-3" />
				{formatSpeed(stats.totalDownloadSpeed)}
			</span>
			<span class="flex items-center gap-1 text-success">
				<Upload class="h-3 w-3" />
				{formatSpeed(stats.totalUploadSpeed)}
			</span>
		</div>
	</div>
</div>
