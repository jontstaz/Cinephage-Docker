<script lang="ts">
	import type { ScoringProfile } from '$lib/types/profile';
	import ProfileCard from './ProfileCard.svelte';
	import { Plus } from 'lucide-svelte';

	interface Props {
		profiles: ScoringProfile[];
		onAdd?: () => void;
		onEdit?: (profile: ScoringProfile) => void;
		onDelete?: (profile: ScoringProfile) => void;
		onSetDefault?: (profile: ScoringProfile) => void;
	}

	let { profiles, onAdd, onEdit, onDelete, onSetDefault }: Props = $props();

	// Separate built-in and custom profiles
	const builtInProfiles = $derived(profiles.filter((p) => p.isBuiltIn));
	const customProfiles = $derived(profiles.filter((p) => !p.isBuiltIn));
</script>

<div class="space-y-6">
	<!-- Built-in Profiles -->
	{#if builtInProfiles.length > 0}
		<div>
			<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold">
				Built-in Profiles
				<span class="badge badge-ghost">{builtInProfiles.length}</span>
			</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each builtInProfiles as profile (profile.id)}
					<ProfileCard {profile} {onEdit} {onSetDefault} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Custom Profiles -->
	<div>
		<div class="mb-3 flex items-center justify-between">
			<h3 class="flex items-center gap-2 text-lg font-semibold">
				Custom Profiles
				<span class="badge badge-ghost">{customProfiles.length}</span>
			</h3>
			{#if onAdd}
				<button class="btn gap-2 btn-sm btn-primary" onclick={onAdd}>
					<Plus class="h-4 w-4" />
					Add Profile
				</button>
			{/if}
		</div>
		{#if customProfiles.length > 0}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each customProfiles as profile (profile.id)}
					<ProfileCard {profile} {onEdit} {onDelete} {onSetDefault} />
				{/each}
			</div>
		{:else}
			<div class="rounded-lg bg-base-200 py-8 text-center">
				<p class="text-base-content/70">No custom profiles yet.</p>
				<p class="mt-1 text-sm text-base-content/50">
					Create a custom profile to fine-tune your quality preferences.
				</p>
			</div>
		{/if}
	</div>
</div>
