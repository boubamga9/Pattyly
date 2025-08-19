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
	export let onSuccess: () => void = () => {}; // Callback pour notifier le succès

	console.log('🔧 UpdateForm initialisé avec data:', data);
	console.log('🔧 customFields:', customFields);

	const form = superForm(data, {
		validators: zodClient(updateCustomFormFormSchema),
		dataType: 'json', // Permet d'envoyer des structures de données imbriquées
		onSubmit: ({ formData, cancel: _cancel }) => {
			console.log('📤 Soumission du formulaire update commencée');
			console.log('📤 FormData:', Object.fromEntries(formData.entries()));
		},
		onResult: ({ result }) => {
			console.log('📥 Résultat reçu:', result);
		},
		onUpdated: ({ form }) => {
			console.log('🔄 Formulaire mis à jour:', form);
		},
		onError: ({ result }) => {
			console.error('❌ Erreur du formulaire:', result);
		},
	});

	const { form: formData, enhance, submitting, message } = form;

	$: if ($message) {
		console.log('✅ Message reçu:', $message);
		// Pas de rechargement de page, juste notifier le succès
		onSuccess();
	}

	// Log des changements d'état
	$: console.log('🔄 $submitting:', $submitting);
	$: console.log('🔄 $formData:', $formData);

	// Gestionnaire pour les changements de champs
	function handleFieldsChange(event: CustomEvent<CustomizationField[]>) {
		console.log('🔄 Champs personnalisés mis à jour:', event.detail);
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
		console.log('🔧 Initialisation title par défaut');
		$formData.title = '';
	}
	$: if ($formData.description === undefined) {
		console.log('🔧 Initialisation description par défaut');
		$formData.description = '';
	}
</script>

<form method="POST" action="?/updateCustomForm" use:enhance>
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
		<Button type="submit" class="flex-1" disabled={$submitting}>
			<Save class="mr-2 h-4 w-4" />
			Sauvegarder le Formulaire
		</Button>
	</div>
</form>
