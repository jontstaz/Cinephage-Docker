<script lang="ts">
	interface Props {
		enableAutomaticSearch: boolean;
		enableInteractiveSearch: boolean;
	}

	let { enableAutomaticSearch = $bindable(), enableInteractiveSearch = $bindable() }: Props =
		$props();
</script>

<div class="divider text-sm text-base-content/60">Search Capabilities</div>

<div class="grid grid-cols-2 gap-2">
	<label class="label cursor-pointer flex-col items-start gap-1">
		<span class="label-text text-xs">Auto Search</span>
		<input
			type="checkbox"
			class="toggle toggle-primary toggle-sm"
			bind:checked={enableAutomaticSearch}
		/>
	</label>
	<label class="label cursor-pointer flex-col items-start gap-1">
		<span class="label-text text-xs">Interactive</span>
		<input
			type="checkbox"
			class="toggle toggle-primary toggle-sm"
			bind:checked={enableInteractiveSearch}
		/>
	</label>
</div>
