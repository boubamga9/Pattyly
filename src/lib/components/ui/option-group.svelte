<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import StyledRadio from './styled-radio.svelte';
	import StyledCheckbox from './styled-checkbox.svelte';

	export let fieldId: string;
	export let fieldType: 'single-select' | 'multi-select';
	export let options: Array<{ label: string; price?: number }>;
	export let selectedValues: string | string[] = '';

	export let disabled: boolean = false;
	export let required: boolean = false;

	const dispatch = createEventDispatcher<{
		change: { fieldId: string; values: string | string[] };
	}>();

	function handleRadioChange(
		event: CustomEvent<{ value: string; checked: boolean }>,
	) {
		const { value } = event.detail;
		dispatch('change', { fieldId, values: value });
	}

	function handleCheckboxChange(
		event: CustomEvent<{ value: string; checked: boolean }>,
	) {
		const { value, checked } = event.detail;
		let newValues: string[];

		if (Array.isArray(selectedValues)) {
			if (checked) {
				newValues = [...selectedValues, value];
			} else {
				newValues = selectedValues.filter((v) => v !== value);
			}
		} else {
			newValues = checked ? [value] : [];
		}

		dispatch('change', { fieldId, values: newValues });
	}
</script>

<div class="flex flex-wrap gap-2">
	{#if fieldType === 'single-select'}
		{#each options as option}
			{@const isChecked = selectedValues === option.label}
			<StyledRadio
				name={fieldId}
				value={option.label}
				label={option.label}
				price={option.price}
				checked={isChecked}
				{disabled}
				{required}
				on:change={handleRadioChange}
			/>
		{/each}
	{:else}
		{#each options as option}
			{@const isChecked =
				Array.isArray(selectedValues) && selectedValues.includes(option.label)}
			<StyledCheckbox
				value={option.label}
				label={option.label}
				price={option.price}
				checked={isChecked}
				{disabled}
				required={false}
				on:change={handleCheckboxChange}
			/>
		{/each}
	{/if}
</div>
