<script lang="ts">
	import { Eye, EyeOff } from 'lucide-svelte';

	interface Props {
		monitored: boolean;
		disabled?: boolean;
		size?: 'sm' | 'md' | 'lg';
		onToggle?: (newValue: boolean) => void;
	}

	let { monitored, disabled = false, size = 'md', onToggle }: Props = $props();

	const sizeClasses = {
		sm: 'btn-xs',
		md: 'btn-sm',
		lg: 'btn-md'
	};

	const iconSizes = {
		sm: 14,
		md: 16,
		lg: 20
	};

	function handleClick() {
		if (!disabled && onToggle) {
			onToggle(!monitored);
		}
	}
</script>

<button
	class="btn btn-ghost {sizeClasses[size]} {monitored ? 'text-success' : 'text-base-content/50'}"
	class:btn-disabled={disabled}
	onclick={handleClick}
	title={monitored ? 'Monitored - Click to unmonitor' : 'Not monitored - Click to monitor'}
	{disabled}
>
	{#if monitored}
		<Eye size={iconSizes[size]} />
	{:else}
		<EyeOff size={iconSizes[size]} />
	{/if}
</button>
