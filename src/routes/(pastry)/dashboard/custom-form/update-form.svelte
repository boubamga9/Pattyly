<script lang="ts">
	import { page } from '$app/stores';
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
	} from '$lib/components/forms';
	import { LoaderCircle, Check } from 'lucide-svelte';

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
	use:enhance={{
		onResult: ({ result }) => {
			// Only show success feedback if the request succeeded
			if (result.type === 'success') {
				submitted = true;
				setTimeout(() => (submitted = false), 2000);
			}
		},
	}}
>
	<!-- ✅ OPTIMISÉ : Passer shopId et shopSlug pour éviter getUserPermissions + requête shop -->
	{#if $page.data.shop}
		<input type="hidden" name="shopId" value={$page.data.shop.id} />
		<input type="hidden" name="shopSlug" value={$page.data.shop.slug} />
	{/if}
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
					maxlength={200}
				/>
				<div class="mt-1 text-xs text-gray-500">
					<span>{($formData.title || '').length}/200 caractères</span>
				</div>
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
					maxlength={500}
				/>
				<div class="mt-1 text-xs text-gray-500">
					<span>{($formData.description || '').length}/500 caractères</span>
				</div>
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
			class={`h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
				submitted
					? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
					: $submitting
						? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
						: customFields.length > 0
							? 'bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md disabled:opacity-50'
							: 'bg-gray-500 disabled:opacity-50'
			}`}
		>
			{#if $submitting}
				<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
				Mise à jour...
			{:else if submitted}
				<Check class="mr-2 h-5 w-5" />
				Mis à jour
			{:else if customFields.length === 0}
				Ajoutez au moins un champ
			{:else}
				<Save class="mr-2 h-5 w-5" />
				Sauvegarder le Formulaire
			{/if}
		</Button>
	</div>
</form>