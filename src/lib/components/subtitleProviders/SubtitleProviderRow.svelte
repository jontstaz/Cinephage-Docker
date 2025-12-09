<script lang="ts">
	import { Loader2, Play, Pencil, Trash2, Key, User, Hash } from 'lucide-svelte';
	import SubtitleProviderStatusBadge from './SubtitleProviderStatusBadge.svelte';
	import type { SubtitleProviderConfig } from '$lib/server/subtitles/types';
	import type { ProviderDefinition } from '$lib/server/subtitles/providers/interfaces';

	interface SubtitleProviderWithDefinition extends SubtitleProviderConfig {
		definitionName?: string;
		definition?: ProviderDefinition;
	}

	interface Props {
		provider: SubtitleProviderWithDefinition;
		testing: boolean;
		onEdit: (provider: SubtitleProviderWithDefinition) => void;
		onDelete: (provider: SubtitleProviderWithDefinition) => void;
		onTest: (provider: SubtitleProviderWithDefinition) => void;
	}

	let { provider, testing, onEdit, onDelete, onTest }: Props = $props();

	const hasApiKey = $derived(!!provider.apiKey);
	const hasCredentials = $derived(!!provider.username);
	const supportsHash = $derived(provider.definition?.supportsHashSearch ?? false);
</script>

<!-- Status -->
<td class="w-24">
	<SubtitleProviderStatusBadge
		enabled={provider.enabled}
		healthy={provider.consecutiveFailures === 0}
		consecutiveFailures={provider.consecutiveFailures}
		lastError={provider.lastError}
		throttledUntil={provider.throttledUntil}
	/>
</td>

<!-- Name -->
<td>
	<button class="link font-medium link-hover" onclick={() => onEdit(provider)}>
		{provider.name}
	</button>
</td>

<!-- Implementation -->
<td class="text-base-content/70">
	{provider.definitionName ?? provider.implementation}
</td>

<!-- Features -->
<td>
	<div class="flex gap-1">
		{#if hasApiKey}
			<div class="tooltip" data-tip="API Key configured">
				<Key class="h-3.5 w-3.5 text-success" />
			</div>
		{/if}
		{#if hasCredentials}
			<div class="tooltip" data-tip="Credentials configured">
				<User class="h-3.5 w-3.5 text-success" />
			</div>
		{/if}
		{#if supportsHash}
			<div class="tooltip" data-tip="Supports hash matching">
				<Hash class="h-3.5 w-3.5 text-info" />
			</div>
		{/if}
	</div>
</td>

<!-- Priority -->
<td class="text-center">
	{provider.priority}
</td>

<!-- Rate Limit -->
<td class="text-center text-sm text-base-content/70">
	{provider.requestsPerMinute}/min
</td>

<!-- Actions -->
<td>
	<div class="flex gap-1">
		<button
			class="btn btn-ghost btn-xs"
			onclick={() => onTest(provider)}
			disabled={testing}
			title="Test connection"
		>
			{#if testing}
				<Loader2 class="h-4 w-4 animate-spin" />
			{:else}
				<Play class="h-4 w-4" />
			{/if}
		</button>
		<button class="btn btn-ghost btn-xs" onclick={() => onEdit(provider)} title="Edit provider">
			<Pencil class="h-4 w-4" />
		</button>
		<button
			class="btn text-error btn-ghost btn-xs"
			onclick={() => onDelete(provider)}
			title="Delete provider"
		>
			<Trash2 class="h-4 w-4" />
		</button>
	</div>
</td>
