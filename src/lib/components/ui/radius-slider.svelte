<script lang="ts">
	export let value: number = 10;
	export let min: number = 1;
	export let max: number = 50;
	export let step: number = 1;
	export let onChange: ((value: number) => void) | undefined = undefined;

	let inputElement: HTMLInputElement;

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const newValue = parseInt(target.value, 10);
		
		// Mettre à jour la valeur locale
		value = newValue;
		
		// Appeler onChange immédiatement pour déclencher la réactivité
		if (onChange) {
			onChange(newValue);
		}
	}

	// Synchroniser la valeur externe avec l'input
	$: if (inputElement && inputElement.value !== value.toString()) {
		inputElement.value = value.toString();
	}
</script>

<div class="flex items-center gap-4">
	<label class="text-sm font-medium text-neutral-700">
		Rayon : <span class="text-[#FF6F61] font-semibold">{value}km</span>
	</label>
	<input
		bind:this={inputElement}
		type="range"
		min={min}
		max={max}
		step={step}
		value={value}
		on:input={handleInput}
		class="flex-1 h-2 rounded-lg appearance-none bg-neutral-200 accent-[#FF6F61] cursor-pointer"
		style="background: linear-gradient(to right, #FF6F61 0%, #FF6F61 {((value - min) / (max - min)) * 100}%, #e5e7eb {((value - min) / (max - min)) * 100}%, #e5e7eb 100%);"
	/>
</div>

<style>
	input[type="range"]::-webkit-slider-thumb {
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #FF6F61;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	input[type="range"]::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #FF6F61;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
</style>

