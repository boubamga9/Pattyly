<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { cn } from '$lib/utils';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type $$Props = HTMLButtonAttributes & {
		checked?: boolean;
		class?: string;
	};

	let className: $$Props['class'] = undefined;
	export { className as class };
	export let checked = false;

	const dispatch = createEventDispatcher<{
		change: boolean;
	}>();

	function handleClick() {
		checked = !checked;
		dispatch('change', checked);
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	data-state={checked ? 'checked' : 'unchecked'}
	class={cn(
		'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
		className,
	)}
	on:click={handleClick}
	{...$$restProps}
>
	<span
		class="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
		data-state={checked ? 'checked' : 'unchecked'}
	/>
</button>
