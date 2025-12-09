<script lang="ts">
	import {
		Clapperboard,
		Tv,
		Download,
		AlertCircle,
		Clock,
		CheckCircle,
		XCircle,
		Search,
		Plus,
		FileQuestion,
		Calendar,
		Activity,
		TrendingUp,
		PlayCircle
	} from 'lucide-svelte';
	import TmdbImage from '$lib/components/tmdb/TmdbImage.svelte';
	import { resolve } from '$app/paths';

	let { data } = $props();

	// Format relative time
	function formatRelativeTime(dateStr: string | null): string {
		if (!dateStr) return 'Unknown';
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString();
	}

	// Format date
	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Unknown';
		return new Date(dateStr).toLocaleDateString();
	}

	// Get status icon and color for download history
	function getDownloadStatusStyle(status: string) {
		switch (status) {
			case 'imported':
				return { icon: CheckCircle, class: 'text-success' };
			case 'failed':
				return { icon: XCircle, class: 'text-error' };
			case 'removed':
				return { icon: XCircle, class: 'text-warning' };
			default:
				return { icon: Clock, class: 'text-info' };
		}
	}

	// Get status icon and color for monitoring history
	function getMonitoringStatusStyle(status: string) {
		switch (status) {
			case 'grabbed':
				return { icon: CheckCircle, class: 'text-success' };
			case 'found':
				return { icon: Search, class: 'text-info' };
			case 'no_results':
				return { icon: AlertCircle, class: 'text-warning' };
			case 'error':
				return { icon: XCircle, class: 'text-error' };
			default:
				return { icon: Clock, class: 'text-base-content' };
		}
	}

	// Get task type display name
	function getTaskTypeName(taskType: string): string {
		switch (taskType) {
			case 'missing':
				return 'Missing Search';
			case 'upgrade':
				return 'Upgrade Search';
			case 'new_episode':
				return 'New Episode';
			case 'cutoff_unmet':
				return 'Cutoff Unmet';
			default:
				return taskType;
		}
	}

	// Combine and sort recent activity
	const recentActivity = $derived(() => {
		const downloads = data.recentActivity.downloads.map((d) => ({
			type: 'download' as const,
			id: d.id,
			title: d.title,
			status: d.status,
			quality: d.quality,
			timestamp: d.createdAt,
			mediaType: d.movieId ? 'movie' : 'tv'
		}));

		const monitoring = data.recentActivity.monitoring.map((m) => ({
			type: 'monitoring' as const,
			id: m.id,
			title: m.releaseGrabbed || `${getTaskTypeName(m.taskType)}`,
			status: m.status,
			taskType: m.taskType,
			releasesFound: m.releasesFound,
			timestamp: m.executedAt,
			mediaType: m.movieId ? 'movie' : 'tv'
		}));

		return [...downloads, ...monitoring]
			.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
			.slice(0, 12);
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Dashboard</h1>
			<p class="text-base-content/70">Welcome to Cinephage</p>
		</div>
		<div class="flex gap-2">
			<a href={resolve('/discover')} class="btn btn-primary">
				<Plus class="h-4 w-4" />
				Add Content
			</a>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
		<!-- Movies -->
		<a href={resolve('/movies')} class="card bg-base-200 transition-colors hover:bg-base-300">
			<div class="card-body p-4">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-primary/10 p-2">
						<Clapperboard class="h-6 w-6 text-primary" />
					</div>
					<div>
						<div class="text-2xl font-bold">{data.stats.movies.total}</div>
						<div class="text-sm text-base-content/70">Movies</div>
					</div>
				</div>
				<div class="mt-2 flex gap-2 text-xs">
					<span class="badge badge-sm badge-success">{data.stats.movies.withFile} files</span>
					{#if data.stats.movies.missing > 0}
						<span class="badge badge-sm badge-warning">{data.stats.movies.missing} missing</span>
					{/if}
				</div>
			</div>
		</a>

		<!-- TV Shows -->
		<a href={resolve('/tv')} class="card bg-base-200 transition-colors hover:bg-base-300">
			<div class="card-body p-4">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-secondary/10 p-2">
						<Tv class="h-6 w-6 text-secondary" />
					</div>
					<div>
						<div class="text-2xl font-bold">{data.stats.series.total}</div>
						<div class="text-sm text-base-content/70">TV Shows</div>
					</div>
				</div>
				<div class="mt-2 flex gap-2 text-xs">
					<span class="badge badge-sm badge-info">{data.stats.episodes.withFile} episodes</span>
					{#if data.stats.episodes.missing > 0}
						<span class="badge badge-sm badge-warning">{data.stats.episodes.missing} missing</span>
					{/if}
				</div>
			</div>
		</a>

		<!-- Active Downloads -->
		<a href={resolve('/queue')} class="card bg-base-200 transition-colors hover:bg-base-300">
			<div class="card-body p-4">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-accent/10 p-2">
						<Download class="h-6 w-6 text-accent" />
					</div>
					<div>
						<div class="text-2xl font-bold">{data.stats.activeDownloads}</div>
						<div class="text-sm text-base-content/70">Downloads</div>
					</div>
				</div>
				<div class="mt-2 text-xs">
					{#if data.stats.activeDownloads > 0}
						<span class="badge badge-sm badge-accent">Active</span>
					{:else}
						<span class="text-base-content/50">No active downloads</span>
					{/if}
				</div>
			</div>
		</a>

		<!-- Missing Episodes -->
		<div class="card bg-base-200">
			<div class="card-body p-4">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-warning/10 p-2">
						<Calendar class="h-6 w-6 text-warning" />
					</div>
					<div>
						<div class="text-2xl font-bold">{data.missingEpisodes.length}</div>
						<div class="text-sm text-base-content/70">Missing Episodes</div>
					</div>
				</div>
				<div class="mt-2 text-xs text-base-content/50">Aired but not downloaded</div>
			</div>
		</div>

		<!-- Unmatched Files -->
		{#if data.stats.unmatchedFiles > 0}
			<a
				href={resolve('/library/unmatched')}
				class="card bg-base-200 transition-colors hover:bg-base-300"
			>
				<div class="card-body p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-error/10 p-2">
							<FileQuestion class="h-6 w-6 text-error" />
						</div>
						<div>
							<div class="text-2xl font-bold">{data.stats.unmatchedFiles}</div>
							<div class="text-sm text-base-content/70">Unmatched</div>
						</div>
					</div>
					<div class="mt-2 text-xs text-base-content/50">Files need attention</div>
				</div>
			</a>
		{:else}
			<div class="card bg-base-200">
				<div class="card-body p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-success/10 p-2">
							<CheckCircle class="h-6 w-6 text-success" />
						</div>
						<div>
							<div class="text-2xl font-bold">0</div>
							<div class="text-sm text-base-content/70">Unmatched</div>
						</div>
					</div>
					<div class="mt-2 text-xs text-base-content/50">All files matched</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Main Content Grid -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Recently Added Section (2/3 width) -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Recently Added Movies -->
			{#if data.recentlyAdded.movies.length > 0}
				<div class="card bg-base-200">
					<div class="card-body">
						<div class="flex items-center justify-between">
							<h2 class="card-title">
								<Clapperboard class="h-5 w-5" />
								Recently Added Movies
							</h2>
							<a href={resolve('/movies')} class="btn btn-ghost btn-sm">View All</a>
						</div>
						<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
							{#each data.recentlyAdded.movies as movie (movie.id)}
								<a
									href={resolve(`/library/movie/${movie.id}`)}
									class="group relative aspect-[2/3] overflow-hidden rounded-lg"
								>
									<TmdbImage
										path={movie.posterPath}
										alt={movie.title}
										size="w185"
										class="h-full w-full object-cover transition-transform group-hover:scale-105"
									/>
									<div
										class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
									>
										<div class="absolute right-0 bottom-0 left-0 p-2">
											<p class="truncate text-xs font-medium text-white">{movie.title}</p>
											<p class="text-xs text-white/70">{movie.year}</p>
										</div>
									</div>
									{#if !movie.hasFile}
										<div class="absolute top-1 right-1">
											<span class="badge badge-xs badge-warning">Missing</span>
										</div>
									{/if}
								</a>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Recently Added TV Shows -->
			{#if data.recentlyAdded.series.length > 0}
				<div class="card bg-base-200">
					<div class="card-body">
						<div class="flex items-center justify-between">
							<h2 class="card-title">
								<Tv class="h-5 w-5" />
								Recently Added TV Shows
							</h2>
							<a href={resolve('/tv')} class="btn btn-ghost btn-sm">View All</a>
						</div>
						<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
							{#each data.recentlyAdded.series as show (show.id)}
								<a
									href={resolve(`/library/tv/${show.id}`)}
									class="group relative aspect-[2/3] overflow-hidden rounded-lg"
								>
									<TmdbImage
										path={show.posterPath}
										alt={show.title}
										size="w185"
										class="h-full w-full object-cover transition-transform group-hover:scale-105"
									/>
									<div
										class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
									>
										<div class="absolute right-0 bottom-0 left-0 p-2">
											<p class="truncate text-xs font-medium text-white">{show.title}</p>
											<p class="text-xs text-white/70">
												{show.episodeFileCount ?? 0}/{show.episodeCount ?? 0} episodes
											</p>
										</div>
									</div>
									{#if (show.episodeFileCount ?? 0) < (show.episodeCount ?? 0)}
										<div class="absolute top-1 right-1">
											<span class="badge badge-xs badge-warning">
												{(show.episodeCount ?? 0) - (show.episodeFileCount ?? 0)} missing
											</span>
										</div>
									{/if}
								</a>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Missing Episodes Section -->
			{#if data.missingEpisodes.length > 0}
				<div class="card bg-base-200">
					<div class="card-body">
						<h2 class="card-title">
							<Calendar class="h-5 w-5" />
							Missing Episodes
						</h2>
						<div class="divide-y divide-base-300">
							{#each data.missingEpisodes.slice(0, 5) as episode (episode.id)}
								<div class="flex items-center gap-3 py-2">
									{#if episode.series?.posterPath}
										<div class="h-12 w-8 flex-shrink-0 overflow-hidden rounded">
											<TmdbImage
												path={episode.series.posterPath}
												alt={episode.series.title || ''}
												size="w92"
												class="h-full w-full object-cover"
											/>
										</div>
									{/if}
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium">
											{episode.series?.title || 'Unknown Series'}
										</p>
										<p class="text-sm text-base-content/70">
											S{String(episode.seasonNumber).padStart(2, '0')}E{String(
												episode.episodeNumber
											).padStart(2, '0')}
											{episode.title ? ` - ${episode.title}` : ''}
										</p>
									</div>
									<div class="text-right text-sm text-base-content/50">
										{formatDate(episode.airDate)}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Empty State -->
			{#if data.recentlyAdded.movies.length === 0 && data.recentlyAdded.series.length === 0}
				<div class="card bg-base-200">
					<div class="card-body items-center text-center">
						<div class="rounded-full bg-base-300 p-4">
							<Plus class="h-8 w-8 text-base-content/50" />
						</div>
						<h2 class="card-title">No Content Yet</h2>
						<p class="text-base-content/70">
							Start by discovering movies and TV shows to add to your library.
						</p>
						<a href={resolve('/discover')} class="btn btn-primary">
							<Search class="h-4 w-4" />
							Discover Content
						</a>
					</div>
				</div>
			{/if}
		</div>

		<!-- Recent Activity Sidebar (1/3 width) -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">
					<Activity class="h-5 w-5" />
					Recent Activity
				</h2>
				{#if recentActivity().length > 0}
					<div class="divide-y divide-base-300">
						{#each recentActivity() as activity (activity.id)}
							<div class="py-2">
								<div class="flex items-start gap-2">
									{#if activity.type === 'download'}
										{@const style = getDownloadStatusStyle(activity.status)}
										{@const Icon = style.icon}
										<Icon class="mt-0.5 h-4 w-4 flex-shrink-0 {style.class}" />
									{:else}
										{@const style = getMonitoringStatusStyle(activity.status)}
										{@const Icon = style.icon}
										<Icon class="mt-0.5 h-4 w-4 flex-shrink-0 {style.class}" />
									{/if}
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">{activity.title}</p>
										<div class="flex items-center gap-2 text-xs text-base-content/50">
											{#if activity.type === 'download'}
												<span class="badge badge-ghost badge-xs">{activity.status}</span>
											{:else if activity.type === 'monitoring'}
												<span class="badge badge-ghost badge-xs">{activity.taskType}</span>
												{#if activity.releasesFound}
													<span>{activity.releasesFound} found</span>
												{/if}
											{/if}
											<span>{formatRelativeTime(activity.timestamp)}</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="py-8 text-center text-base-content/50">
						<Clock class="mx-auto h-8 w-8 opacity-50" />
						<p class="mt-2 text-sm">No recent activity</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="card bg-base-200">
		<div class="card-body">
			<h2 class="card-title">Quick Actions</h2>
			<div class="flex flex-wrap gap-2">
				<a href={resolve('/discover')} class="btn btn-outline btn-sm">
					<Search class="h-4 w-4" />
					Discover
				</a>
				<a href={resolve('/queue')} class="btn btn-outline btn-sm">
					<Download class="h-4 w-4" />
					View Queue
				</a>
				<a href={resolve('/settings/integrations/indexers')} class="btn btn-outline btn-sm">
					<TrendingUp class="h-4 w-4" />
					Indexers
				</a>
				<a href={resolve('/settings/monitoring')} class="btn btn-outline btn-sm">
					<PlayCircle class="h-4 w-4" />
					Monitoring
				</a>
			</div>
		</div>
	</div>
</div>
