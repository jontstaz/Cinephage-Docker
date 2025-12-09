<script lang="ts">
	import { Check, AlertCircle } from 'lucide-svelte';

	interface Props {
		result: { success: boolean; error?: string } | null;
	}

	let { result }: Props = $props();
</script>

{#if result}
	<div class="alert {result.success ? 'alert-success' : 'alert-error'}">
		{#if result.success}
			<Check class="h-4 w-4" />
			<span>Connection successful!</span>
		{:else}
			<AlertCircle class="h-4 w-4" />
			<span>{result.error ?? 'Connection failed'}</span>
		{/if}
	</div>
{/if}
