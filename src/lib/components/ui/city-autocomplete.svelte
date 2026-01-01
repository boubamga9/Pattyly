<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { MapPin, X } from 'lucide-svelte';
	import { searchCities, type CitySuggestion } from '$lib/services/city-autocomplete';

	export let value: string = '';
	export let placeholder: string = 'Recherche une ville...';
	export let onSelect: (city: CitySuggestion | null) => void = () => {};

	let inputElement: HTMLInputElement;
	let suggestions: CitySuggestion[] = [];
	let showSuggestions = false;
	let selectedCity: CitySuggestion | null = null;
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	async function handleInput() {
		const query = inputElement.value.trim();
		
		if (query.length < 2) {
			suggestions = [];
			showSuggestions = false;
			selectedCity = null;
			onSelect(null);
			return;
		}

		// Debounce pour éviter trop d'appels API
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(async () => {
			const results = await searchCities(query, 8);
			suggestions = results;
			showSuggestions = results.length > 0;
		}, 300);
	}

	function selectCity(city: CitySuggestion) {
		selectedCity = city;
		value = city.label;
		inputElement.value = city.label;
		showSuggestions = false;
		onSelect(city);
	}

	function clearCity() {
		selectedCity = null;
		value = '';
		if (inputElement) {
			inputElement.value = '';
		}
		suggestions = [];
		showSuggestions = false;
		onSelect(null);
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!inputElement?.parentElement?.contains(target)) {
			showSuggestions = false;
		}
	}

	onMount(() => {
		if (typeof document !== 'undefined') {
			document.addEventListener('click', handleClickOutside);
		}
		if (value && inputElement) {
			inputElement.value = value;
		}
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener('click', handleClickOutside);
		}
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});
</script>

<div class="relative w-full">
	<div class="relative">
		<MapPin class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
		<input
			bind:this={inputElement}
			type="text"
			value={value}
			on:input={handleInput}
			on:focus={() => {
				if (suggestions.length > 0) {
					showSuggestions = true;
				}
			}}
			placeholder={placeholder}
			class="w-full appearance-none rounded-lg border border-neutral-300 bg-white px-10 py-2 text-sm transition-colors focus:border-[#FF6F61] focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/20 {value ? 'pr-10' : ''}"
		/>
		{#if value}
			<button
				on:click={clearCity}
				type="button"
				class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:text-neutral-600"
			>
				<X class="h-3.5 w-3.5" />
			</button>
		{/if}
	</div>

	{#if showSuggestions && suggestions.length > 0}
		<div class="absolute z-[60] mt-1 max-h-[50vh] sm:max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
			{#each suggestions as suggestion}
				<button
					type="button"
					on:click={() => selectCity(suggestion)}
					class="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none"
				>
					<div class="flex items-center gap-2">
						<MapPin class="h-4 w-4 shrink-0 text-neutral-400" />
						<span class="font-medium text-neutral-900">{suggestion.city}</span>
						<span class="text-neutral-500">({suggestion.postalCode})</span>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

