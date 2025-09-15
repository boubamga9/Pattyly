<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let value = '';
	export let length = 6;
	export let disabled = false;
	export let error = false;

	const dispatch = createEventDispatcher<{
		change: { value: string };
		complete: { value: string };
	}>();

	let inputs: HTMLInputElement[] = [];

	// Fonction pour mettre à jour la valeur
	function updateValue(newValue: string) {
		value = newValue;
		dispatch('change', { value });

		if (newValue.length === length) {
			dispatch('complete', { value });
		}
	}

	// Fonction pour gérer la saisie
	function handleInput(event: Event, index: number) {
		const target = event.target as HTMLInputElement;
		const inputValue = target.value.replace(/[^0-9]/g, ''); // Nettoyer automatiquement : seulement les chiffres

		if (inputValue.length > 1) {
			// Si plusieurs chiffres collés, les répartir
			const digits = inputValue.split('');
			let newValue = '';

			for (let i = 0; i < Math.min(digits.length, length - index); i++) {
				newValue += digits[i];
				if (index + i < inputs.length) {
					inputs[index + i].value = digits[i];
				}
			}

			updateValue(
				value.slice(0, index) + newValue + value.slice(index + newValue.length),
			);

			// Focus sur le prochain input vide ou le dernier
			const nextIndex = Math.min(index + digits.length, length - 1);
			if (nextIndex < inputs.length) {
				inputs[nextIndex].focus();
			}
		} else {
			// Un seul chiffre
			const newValue = value.split('');
			newValue[index] = inputValue;
			updateValue(newValue.join(''));

			// Aller au prochain input si un chiffre est saisi
			if (inputValue && index < length - 1) {
				inputs[index + 1].focus();
			}
		}
	}

	// Fonction pour gérer les touches
	function handleKeyDown(event: KeyboardEvent, index: number) {
		const target = event.target as HTMLInputElement;

		if (event.key === 'Backspace') {
			if (target.value === '' && index > 0) {
				// Si l'input est vide, aller au précédent et le vider
				inputs[index - 1].focus();
				inputs[index - 1].value = '';
				const newValue = value.split('');
				newValue[index - 1] = '';
				updateValue(newValue.join(''));
			} else if (target.value !== '') {
				// Vider l'input actuel
				target.value = '';
				const newValue = value.split('');
				newValue[index] = '';
				updateValue(newValue.join(''));
			}
		} else if (event.key === 'ArrowLeft' && index > 0) {
			inputs[index - 1].focus();
		} else if (event.key === 'ArrowRight' && index < length - 1) {
			inputs[index + 1].focus();
		} else if (event.key === 'Delete') {
			// Vider l'input actuel
			target.value = '';
			const newValue = value.split('');
			newValue[index] = '';
			updateValue(newValue.join(''));
		}
	}

	// Fonction pour gérer le coller
	function handlePaste(event: ClipboardEvent, index: number) {
		event.preventDefault();
		const pastedData =
			event.clipboardData?.getData('text').replace(/[^0-9]/g, '') || '';

		if (pastedData.length > 0) {
			const newValue = value.split('');
			const maxLength = Math.min(pastedData.length, length - index);

			for (let i = 0; i < maxLength; i++) {
				newValue[index + i] = pastedData[i];
				if (index + i < inputs.length) {
					inputs[index + i].value = pastedData[i];
				}
			}

			updateValue(newValue.join(''));

			// Focus sur le dernier input rempli ou le prochain vide
			const nextIndex = Math.min(index + pastedData.length, length - 1);
			if (nextIndex < inputs.length) {
				inputs[nextIndex].focus();
			}
		}
	}

	// Fonction pour focus automatique au premier input
	function handleFocus() {
		if (inputs[0] && value === '') {
			inputs[0].focus();
		}
	}
</script>

<div
	class="flex gap-2"
	on:click={handleFocus}
	on:keydown={(e) => e.key === 'Enter' && handleFocus()}
	role="button"
	tabindex="0"
>
	{#each Array(length) as _, index}
		<input
			bind:this={inputs[index]}
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			maxlength="1"
			{disabled}
			class="h-12 w-12 rounded-lg border text-center text-lg font-semibold transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#FF6F61] disabled:cursor-not-allowed disabled:opacity-50 {error
				? 'border-red-500 bg-red-50'
				: 'border-gray-300 bg-white hover:border-gray-400'}"
			on:input={(e) => handleInput(e, index)}
			on:keydown={(e) => handleKeyDown(e, index)}
			on:paste={(e) => handlePaste(e, index)}
		/>
	{/each}
</div>
