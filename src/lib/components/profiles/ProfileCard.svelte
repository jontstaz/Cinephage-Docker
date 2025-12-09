<script lang="ts">
	import type { ScoringProfile } from '$lib/types/profile';
	import { Star, Zap, Minimize2, Settings, Check, HardDrive } from 'lucide-svelte';

	interface Props {
		profile: ScoringProfile;
		onEdit?: (profile: ScoringProfile) => void;
		onDelete?: (profile: ScoringProfile) => void;
		onSetDefault?: (profile: ScoringProfile) => void;
	}

	let { profile, onEdit, onDelete, onSetDefault }: Props = $props();

	// Icon mapping from string name to component
	// This allows the backend to specify icon names as strings
	const iconMap: Record<string, typeof Star> = {
		Star,
		Zap,
		Minimize2,
		Settings
	};

	// Get the icon component from the profile metadata, fallback to Settings
	const Icon = $derived(iconMap[profile.icon ?? ''] ?? Settings);
	// Get the color from profile metadata, fallback to default
	const iconColor = $derived(profile.color ?? 'text-base-content');

	// Format size limit display
	function formatMovieSizeLimit(): string {
		const min = profile.movieMinSizeGb;
		const max = profile.movieMaxSizeGb;
		if (min && max) return `${min} - ${max} GB`;
		if (min) return `≥ ${min} GB`;
		if (max) return `≤ ${max} GB`;
		return 'No limit';
	}

	function formatEpisodeSizeLimit(): string {
		const min = profile.episodeMinSizeMb;
		const max = profile.episodeMaxSizeMb;
		if (min && max) return `${min} - ${max} MB`;
		if (min) return `≥ ${min} MB`;
		if (max) return `≤ ${max} MB`;
		return 'No limit';
	}
</script>

<div class="card bg-base-200 shadow-md transition-shadow hover:shadow-lg">
	<div class="card-body p-4">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-base-300 p-2">
					<Icon class="h-5 w-5 {iconColor}" />
				</div>
				<div>
					<h3 class="flex items-center gap-2 font-semibold">
						{profile.name}
						{#if profile.isDefault}
							<span class="badge gap-1 badge-sm badge-success">
								<Check class="h-3 w-3" />
								Default
							</span>
						{/if}
						{#if profile.isBuiltIn}
							<span class="badge badge-ghost badge-sm">Built-in</span>
						{/if}
					</h3>
					<p class="text-sm text-base-content/70">{profile.description || 'No description'}</p>
				</div>
			</div>
		</div>

		<!-- Profile Stats -->
		<div class="mt-4 space-y-2 rounded-lg bg-base-300 p-3 text-sm">
			<div class="flex items-center gap-2">
				<HardDrive class="h-4 w-4 text-base-content/70" />
				<span class="text-base-content/70">Movie:</span>
				<span class="font-medium">{formatMovieSizeLimit()}</span>
			</div>
			<div class="flex items-center gap-2">
				<HardDrive class="h-4 w-4 text-base-content/70" />
				<span class="text-base-content/70">Episode:</span>
				<span class="font-medium">{formatEpisodeSizeLimit()}</span>
			</div>
		</div>

		<!-- Tags -->
		{#if profile.tags && profile.tags.length > 0}
			<div class="mt-3 flex flex-wrap gap-1">
				{#each profile.tags as tag (tag)}
					<span class="badge badge-outline badge-sm">{tag}</span>
				{/each}
			</div>
		{/if}

		<!-- Actions -->
		<div class="mt-4 card-actions justify-end border-t border-base-300 pt-3">
			{#if !profile.isDefault && onSetDefault}
				<button class="btn btn-ghost btn-sm" onclick={() => onSetDefault(profile)}>
					Set Default
				</button>
			{/if}
			{#if onEdit}
				<button class="btn btn-ghost btn-sm" onclick={() => onEdit(profile)}> Edit </button>
			{/if}
			{#if !profile.isBuiltIn && onDelete}
				<button class="btn text-error btn-ghost btn-sm" onclick={() => onDelete(profile)}>
					Delete
				</button>
			{/if}
		</div>
	</div>
</div>
