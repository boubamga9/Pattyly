<script lang="ts">
	import { page } from '$app/stores';
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, X, LoaderCircle, Check } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import {
		addUnavailabilityFormSchema,
		type AddUnavailabilityForm,
	} from './schema';

	export let data: SuperValidated<Infer<AddUnavailabilityForm>>;
	export let onCancel: () => void;
	export let today: string; // Date minimale pour les inputs

	const form = superForm(data, {
		validators: zodClient(addUnavailabilityFormSchema),
	});

	const { form: formData, enhance, submitting, message } = form;

	let submitted = false;

	$: if ($message) {
		submitted = true;
		setTimeout(() => {
			submitted = false;
			onCancel();
		}, 2000);
	}

	// Fonction pour vérifier si une date est déjà indisponible
	function isDateUnavailable(
		date: string,
		unavailabilities: Array<{ start_date: string; end_date: string }>,
	) {
		if (!date || !unavailabilities) return false;

		const checkDate = new Date(date);
		return unavailabilities.some((unavailability) => {
			const start = new Date(unavailability.start_date);
			const end = new Date(unavailability.end_date);
			return checkDate >= start && checkDate <= end;
		});
	}
</script>

<form method="POST" action="?/addUnavailability" use:enhance>
	<!-- ✅ OPTIMISÉ : Passer shopId pour éviter getUserPermissions + requête shop -->
	{#if $page.data.shopId}
		<input type="hidden" name="shopId" value={$page.data.shopId} />
	{/if}
	<Form.Errors {form} />

	<div class="space-y-4">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<Form.Field {form} name="startDate">
				<Form.Control let:attrs>
					<Form.Label>Date de début</Form.Label>
					<Input
						{...attrs}
						type="date"
						min={today}
						required
						bind:value={$formData.startDate}
						class={isDateUnavailable($formData.startDate, [])
							? 'border-red-500'
							: ''}
						title={isDateUnavailable($formData.startDate, [])
							? 'Cette date est déjà indisponible'
							: ''}
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="endDate">
				<Form.Control let:attrs>
					<Form.Label>Date de fin</Form.Label>
					<Input
						{...attrs}
						type="date"
						min={$formData.startDate || today}
						required
						bind:value={$formData.endDate}
						class={isDateUnavailable($formData.endDate, [])
							? 'border-red-500'
							: ''}
						title={isDateUnavailable($formData.endDate, [])
							? 'Cette date est déjà indisponible'
							: ''}
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</div>

		<div class="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:space-x-2">
			<Button
				type="submit"
				disabled={$submitting || !$formData.startDate || !$formData.endDate}
				class={`h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed sm:w-auto ${
					submitted
						? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
						: $submitting
							? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
							: $formData.startDate && $formData.endDate
								? 'bg-primary hover:bg-primary/90 disabled:opacity-50'
								: 'bg-gray-500 disabled:opacity-50'
				}`}
			>
				{#if $submitting}
					<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
					Ajout...
				{:else if submitted}
					<Check class="mr-2 h-5 w-5" />
					Ajouté !
				{:else}
					<Plus class="mr-2 h-5 w-5" />
					Ajouter une indisponibilité
				{/if}
			</Button>
			<Button
				type="button"
				variant="outline"
				on:click={onCancel}
				class="h-10 w-full sm:w-auto"
			>
				<X class="mr-2 h-4 w-4" />
				Annuler
			</Button>
		</div>
	</div>
</form>