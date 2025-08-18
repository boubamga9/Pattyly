<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Save } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import {
		updateCustomFormFormSchema,
		type UpdateCustomFormForm,
	} from './schema';
	import {
		CustomizationFormBuilder,
		type CustomizationField,
	} from '$lib/components/CustomizationFormBuilder';

	export let data: SuperValidated<Infer<UpdateCustomFormForm>>;
	export let customFields: CustomizationField[];

	const form = superForm(data, {
		validators: zodClient(updateCustomFormFormSchema),
	});

	const { form: formData, enhance, submitting, message } = form;

	$: if ($message) {
		console.log('✅ Formulaire mis à jour -> rechargement de la page');
		window.location.reload();
	}

	// Gestionnaire pour les changements de champs
	function handleFieldsChange(event: CustomEvent<CustomizationField[]>) {
		customFields = event.detail;
	}

	// Initialiser les valeurs par défaut si elles sont undefined
	$: if ($formData.title === undefined) {
		$formData.title = '';
	}
	$: if ($formData.description === undefined) {
		$formData.description = '';
	}
</script>

<form method="POST" action="?/updateCustomForm" use:enhance>
	<Form.Errors {form} />

	<!-- Champ caché pour les données -->
	<input
		type="hidden"
		name="customFields"
		value={JSON.stringify(customFields)}
	/>

	<!-- Section Titre et Description -->
	<div class="mb-6 space-y-4">
		<Form.Field {form} name="title">
			<Form.Control let:attrs>
				<Form.Label>Titre du formulaire (optionnel)</Form.Label>
				<Input
					{...attrs}
					type="text"
					placeholder="Ex: Votre Gâteau Sur Mesure"
					bind:value={$formData.title}
				/>
			</Form.Control>
			<Form.FieldErrors />
			<p class="text-xs text-muted-foreground">
				Si laissé vide, un titre par défaut sera affiché
			</p>
		</Form.Field>

		<Form.Field {form} name="description">
			<Form.Control let:attrs>
				<Form.Label>Description du formulaire (optionnel)</Form.Label>
				<Textarea
					{...attrs}
					placeholder="Ex: Décrivez votre gâteau idéal et nous vous proposerons une estimation personnalisée"
					rows={3}
					bind:value={$formData.description}
				/>
			</Form.Control>
			<Form.FieldErrors />
			<p class="text-xs text-muted-foreground">
				Si laissée vide, une description par défaut sera affichée
			</p>
		</Form.Field>
	</div>

	<CustomizationFormBuilder
		fields={customFields}
		title="Configuration du Formulaire"
		description="Personnalisez les champs que vos clients devront remplir pour leurs demandes spéciales"
		containerClass="custom-fields-container"
		isCustomForm={true}
		on:fieldsChange={handleFieldsChange}
	/>

	<!-- Boutons d'action -->
	<div class="flex gap-4 pt-6">
		<Button type="submit" class="flex-1" disabled={$submitting}>
			<Save class="mr-2 h-4 w-4" />
			Sauvegarder le Formulaire
		</Button>
	</div>
</form>
