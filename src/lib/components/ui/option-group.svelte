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
		background_color: '#fafafa',
		background_image_url: null,
	};

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
				{customizations}
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
				{customizations}
				on:change={handleCheckboxChange}
			/>
		{/each}
	{/if}
</div>
