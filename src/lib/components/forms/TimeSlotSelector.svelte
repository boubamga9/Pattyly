<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { cn } from '$lib/utils';

	// Props
	export let timeSlots: string[] = [];
	export let selectedTime: string = '';
	export let disabled: boolean = false;
	export let required: boolean = false;
	export let label: string = 'Choisir un créneau';
	export let containerClass: string = '';

	// Events
	const dispatch = createEventDispatcher<{
		change: { value: string };
	}>();

	function handleTimeSelect(time: string) {
		if (!disabled) {
			selectedTime = time;
			dispatch('change', { value: time });
		}
	}

	function formatTime(time: string): string {
		// Convertir "09:00:00" en "09:00"
		return time.substring(0, 5);
	}
</script>

<div class="space-y-3 {containerClass}">
	<!-- Label -->
	<label class="block text-sm font-medium text-gray-900">
		{label}
		{#if required}
			<span class="text-gray-900">*</span>
		{/if}
	</label>

	<!-- Grille des créneaux -->
	{#if timeSlots.length > 0}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
			{#each timeSlots as time}
				{@const isSelected = selectedTime === time}
				<button
					type="button"
					class={cn(
						'flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200',
						'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
						isSelected
							? 'border-gray-800 bg-gray-900 text-white shadow-sm'
							: 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50',
						disabled && 'cursor-not-allowed opacity-50',
					)}
					{disabled}
					on:click={() => handleTimeSelect(time)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleTimeSelect(time);
						}
					}}
					tabindex="0"
					role="radio"
					aria-checked={isSelected}
					aria-disabled={disabled}
				>
					<span class="flex items-center gap-1">
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
								clip-rule="evenodd"
							/>
						</svg>
						{formatTime(time)}
					</span>
				</button>
			{/each}
		</div>
	{:else}
		<!-- Aucun créneau disponible -->
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
			<p class="text-sm text-gray-500">
				<span class="mr-2">⚠️</span>
				Aucun créneau disponible pour cette date
			</p>
		</div>
	{/if}
</div>

<style>
	/* Animation pour le focus */
	button:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}
</style>
