<script lang="ts">
	/**
	 * Base skeleton loader component with shimmer animation.
	 * Uses DaisyUI/Tailwind classes for styling.
	 *
	 * @example
	 * <Skeleton class="h-4 w-32" /> <!-- Text skeleton -->
	 * <Skeleton class="h-48 w-full rounded-lg" /> <!-- Card skeleton -->
	 * <Skeleton variant="circle" class="w-12 h-12" /> <!-- Avatar -->
	 */

	interface Props {
		/** Additional classes to apply */
		class?: string;
		/** Variant style: rect (default), circle, or text */
		variant?: 'rect' | 'circle' | 'text';
	}

	let { class: className = '', variant = 'rect' }: Props = $props();

	const variantClasses: Record<typeof variant, string> = {
		rect: 'rounded',
		circle: 'rounded-full',
		text: 'rounded h-4'
	};
</script>

<div
	class="skeleton bg-base-300 {variantClasses[variant]} {className}"
	aria-hidden="true"
	role="presentation"
></div>

<style>
	.skeleton {
		animation: skeleton-loading 1.5s ease-in-out infinite;
		background: linear-gradient(
			90deg,
			oklch(var(--b3)) 25%,
			oklch(var(--b2)) 50%,
			oklch(var(--b3)) 75%
		);
		background-size: 200% 100%;
	}

	@keyframes skeleton-loading {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
