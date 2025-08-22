<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { cn } from '$lib/utils';

	export let name: string;
	export let value: string;
	export let checked: boolean = false;
	export let disabled: boolean = false;
	export let required: boolean = false;
	export let price: number | undefined = undefined;
	export let label: string;

	const dispatch = createEventDispatcher<{
		change: { value: string; checked: boolean };
	}>();

	function handleChange() {
		if (!disabled) {
			dispatch('change', { value, checked: !checked });
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			handleChange();
		}
	}
</script>

<div class="relative inline-flex cursor-pointer select-none items-center">
	<!-- Input radio caché mais accessible -->
	<input
		type="radio"
		{name}
		{value}
		{checked}
		{disabled}
		class="sr-only"
		on:change={handleChange}
		{required}
	/>

	<!-- Bouton stylisé cliquable -->
	<button
		type="button"
		class={cn(
			'flex items-center rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200',
			'cursor-pointer select-none',
			checked
				? 'border-primary bg-primary text-primary-foreground shadow-sm'
				: 'border-border bg-background text-foreground hover:border-border hover:bg-muted',
			disabled && 'cursor-not-allowed opacity-50',
		)}
		{disabled}
		on:click={handleChange}
		on:keydown={handleKeydown}
		tabindex="0"
		role="radio"
		aria-checked={checked}
		aria-disabled={disabled}
	>
		<!-- Label principal -->
		<span>{label}</span>

		<!-- Prix optionnel -->
		{#if price !== undefined && price > 0}
			<span class="ml-2 text-xs opacity-75">(+{price}€)</span>
		{/if}
	</button>
</div>
