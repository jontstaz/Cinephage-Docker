<script lang="ts">
	import { Download, ExternalLink, Loader2, Check, X } from 'lucide-svelte';

	interface Release {
		guid: string;
		title: string;
		downloadUrl: string;
		magnetUrl?: string;
		infoHash?: string;
		size: number;
		seeders?: number;
		leechers?: number;
		publishDate: string | Date;
		indexerId: string;
		indexerName: string;
		protocol: string;
		commentsUrl?: string;
		// Enhanced fields
		parsed?: {
			resolution?: string;
			source?: string;
			codec?: string;
			hdr?: string;
			releaseGroup?: string;
		};
		quality?: {
			score: number;
			meetsMinimum: boolean;
		};
		totalScore?: number;
		rejected?: boolean;
	}

	interface Props {
		release: Release;
		onGrab: (release: Release) => Promise<void>;
		grabbing?: boolean;
		grabbed?: boolean;
		error?: string | null;
	}

	let { release, onGrab, grabbing = false, grabbed = false, error = null }: Props = $props();

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function formatAge(date: string | Date): string {
		const publishDate = typeof date === 'string' ? new Date(date) : date;
		const now = new Date();
		const diffMs = now.getTime() - publishDate.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return '1 day';
		if (diffDays < 7) return `${diffDays} days`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
		return `${Math.floor(diffDays / 365)} years`;
	}

	function getQualityBadges(release: Release): string[] {
		const badges: string[] = [];
		if (release.parsed?.resolution) badges.push(release.parsed.resolution);
		if (release.parsed?.source) badges.push(release.parsed.source);
		if (release.parsed?.codec) badges.push(release.parsed.codec);
		if (release.parsed?.hdr) badges.push(release.parsed.hdr);
		return badges;
	}

	async function handleGrab() {
		await onGrab(release);
	}
</script>

<tr class="hover" class:opacity-50={release.rejected}>
	<!-- Title -->
	<td class="max-w-md">
		<div class="flex flex-col gap-1">
			<span class="truncate font-medium" title={release.title}>
				{release.title}
			</span>
			<div class="flex flex-wrap gap-1">
				{#each getQualityBadges(release) as badge, i (`${badge}-${i}`)}
					<span class="badge badge-xs badge-primary">{badge}</span>
				{/each}
				{#if release.parsed?.releaseGroup}
					<span class="badge badge-ghost badge-xs">{release.parsed.releaseGroup}</span>
				{/if}
			</div>
		</div>
	</td>

	<!-- Indexer -->
	<td>
		<div class="flex items-center gap-2">
			<span
				class="badge badge-sm {release.protocol === 'torrent'
					? 'badge-info'
					: release.protocol === 'streaming'
						? 'badge-success'
						: 'badge-warning'}"
			>
				{release.protocol === 'torrent'
					? 'Torrent'
					: release.protocol === 'streaming'
						? 'Stream'
						: 'Usenet'}
			</span>
			<span class="text-sm">{release.indexerName}</span>
		</div>
	</td>

	<!-- Size -->
	<td class="text-sm">{formatBytes(release.size)}</td>

	<!-- Seeders (torrent only) -->
	<td class="text-sm">
		{#if release.protocol === 'torrent'}
			<span class="text-success">{release.seeders ?? 0}</span>
			<span class="text-base-content/50">/</span>
			<span class="text-error">{release.leechers ?? 0}</span>
		{:else}
			<span class="text-base-content/50">—</span>
		{/if}
	</td>

	<!-- Age -->
	<td class="text-sm text-base-content/70">
		{formatAge(release.publishDate)}
	</td>

	<!-- Score -->
	<td class="text-sm">
		{#if release.totalScore !== undefined}
			<span
				class="font-medium {release.totalScore >= 700
					? 'text-success'
					: release.totalScore >= 400
						? 'text-warning'
						: 'text-error'}"
			>
				{release.totalScore}
			</span>
		{:else}
			<span class="text-base-content/50">—</span>
		{/if}
	</td>

	<!-- Actions -->
	<td>
		<div class="flex items-center gap-1">
			{#if grabbed}
				<span class="btn text-success btn-ghost btn-sm">
					<Check size={16} />
				</span>
			{:else if error}
				<span class="btn text-error btn-ghost btn-sm" title={error}>
					<X size={16} />
				</span>
			{:else}
				<button
					class="btn btn-sm btn-primary"
					onclick={handleGrab}
					disabled={grabbing || release.rejected}
					title={release.rejected ? 'Rejected by quality filter' : 'Download'}
				>
					{#if grabbing}
						<Loader2 size={16} class="animate-spin" />
					{:else}
						<Download size={16} />
					{/if}
				</button>
			{/if}

			{#if release.commentsUrl}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- External URL -->
				<a
					href={release.commentsUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-ghost btn-sm"
					title="View details"
				>
					<ExternalLink size={16} />
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/if}
		</div>
	</td>
</tr>
