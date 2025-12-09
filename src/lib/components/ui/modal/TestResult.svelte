<script lang="ts">
	import { CheckCircle2, XCircle } from 'lucide-svelte';

	interface TestResultData {
		success: boolean;
		error?: string;
	}

	interface Props {
		result: TestResultData | null;
		successMessage?: string;
		successDetails?: string;
	}

	let { result, successMessage = 'Connection test successful!', successDetails }: Props = $props();
</script>

{#if result}
	<div class="mt-6 alert {result.success ? 'alert-success' : 'alert-error'}">
		{#if result.success}
			<CheckCircle2 class="h-5 w-5" />
			<div>
				<span class="font-medium">{successMessage}</span>
				{#if successDetails}
					<p class="text-sm opacity-80">{successDetails}</p>
				{/if}
			</div>
		{:else}
			<XCircle class="h-5 w-5" />
			<div>
				<span class="font-medium">Connection test failed</span>
				{#if result.error}
					<p class="text-sm opacity-80">{result.error}</p>
				{/if}
			</div>
		{/if}
	</div>
{/if}
