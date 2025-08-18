<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, X } from 'lucide-svelte';
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

	$: if ($message) {
		console.log('✅ Indisponibilité ajoutée -> fermeture du formulaire');
		onCancel();
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

		<div class="flex space-x-2">
			<Button
				type="submit"
				disabled={$submitting || !$formData.startDate || !$formData.endDate}
			>
				<Plus class="mr-2 h-4 w-4" />
				Ajouter
			</Button>
			<Button type="button" variant="outline" on:click={onCancel}>
				<X class="mr-2 h-4 w-4" />
				Annuler
			</Button>
		</div>
	</div>
</form>
