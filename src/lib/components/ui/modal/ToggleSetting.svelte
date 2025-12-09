<script lang="ts">
	interface Props {
		checked: boolean;
		label: string;
		description?: string;
		disabled?: boolean;
	}

	let { checked = $bindable(), label, description, disabled = false }: Props = $props();
</script>

<label class="label cursor-pointer justify-start gap-3 py-2">
	<input type="checkbox" class="checkbox checkbox-sm" bind:checked {disabled} />
	<div>
		<span class="label-text">{label}</span>
		{#if description}
			<p class="text-xs text-base-content/50">{description}</p>
		{/if}
	</div>
</label>
