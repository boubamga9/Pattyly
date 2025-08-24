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
	import { tick } from 'svelte';
	import { LoaderCircle, CheckCircle } from 'lucide-svelte';

	export let data: SuperValidated<Infer<UpdateCustomFormForm>>;
	export let customFields: CustomizationField[];

	const form = superForm(data, {
		validators: zodClient(updateCustomFormFormSchema),
		dataType: 'json', // Permet d'envoyer des structures de données imbriquées
	});

	const { form: formData, enhance, submitting } = form;

	let submitted = false;

	// Gestionnaire pour les changements de champs
	function handleFieldsChange(event: CustomEvent<CustomizationField[]>) {
		customFields = event.detail;
		// Synchroniser avec le formulaire Superforms
		$formData.customFields = event.detail;
	}

	async function handleSubmit() {
		submitted = true;
		await tick();
		setTimeout(() => (submitted = false), 2000);
	}

	// Synchroniser customFields avec le formulaire au chargement
	$: if (customFields && customFields.length > 0) {
		$formData.customFields = customFields;
	}

	// Initialiser les valeurs par défaut si elles sont undefined
	$: if ($formData.title === undefined) {
		$formData.title = '';
	}
	$: if ($formData.description === undefined) {
		$formData.description = '';
	}
</script>

<form
	method="POST"
	action="?/updateCustomForm"
	use:enhance
	on:submit|preventDefault={handleSubmit}
>
	<Form.Errors {form} />

	<!-- Les données customFields seront envoyées automatiquement par Superforms -->
	<!-- grâce à dataType: 'json' et la liaison avec $formData.customFields -->

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
		<Button
			type="submit"
			disabled={$submitting || customFields.length === 0}
			class={`h-11 w-full transition-all duration-200 ${
				$submitting
					? 'cursor-not-allowed bg-gray-300'
					: submitted
						? 'bg-green-700 hover:bg-green-800'
						: customFields.length > 0
							? 'bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md'
							: 'cursor-not-allowed bg-gray-500 opacity-60'
			}`}
		>
			{#if $submitting}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				Mise à jour...
			{:else if submitted}
				<CheckCircle class="mr-2 h-4 w-4" />
				Mis à jour
			{:else if customFields.length === 0}
				Ajoutez au moins un champ
			{:else}
				<Save class="mr-2 h-4 w-4" />
				Sauvegarder le Formulaire
			{/if}
		</Button>
	</div>
</form>
