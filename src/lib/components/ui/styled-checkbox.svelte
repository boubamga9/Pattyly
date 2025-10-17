<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { cn } from '$lib/utils';

	export let value: string;
	export let checked: boolean = false;
	export let disabled: boolean = false;
	export let required: boolean = false;
	export let price: number | undefined = undefined;
	export let label: string;
	export let customizations: {
		button_color: string;
		button_text_color: string;
		text_color: string;
		icon_color: string;
		secondary_text_color: string;
		background_color: string;
		background_image_url?: string;
	} = {
		button_color: '#ff6f61',
		button_text_color: '#ffffff',
		text_color: '#333333',
		icon_color: '#6b7280',
		secondary_text_color: '#333333',
		background_color: '#ffe8d6',
		background_image_url: null,
	};

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
	<!-- Input checkbox caché mais accessible -->
	<input
		type="checkbox"
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
				? 'shadow-sm'
				: 'border-border bg-background text-foreground hover:border-border hover:bg-muted',
			disabled && 'cursor-not-allowed opacity-50',
		)}
		style={checked
			? `background-color: ${customizations.button_color}; color: ${customizations.button_text_color}; border-color: ${customizations.button_color};`
			: ''}
		{disabled}
		on:click={handleChange}
		on:keydown={handleKeydown}
		tabindex="0"
		role="checkbox"
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
