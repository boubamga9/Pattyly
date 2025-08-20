<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Check, X } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import {
		createCategoryFormSchema,
		updateCategoryFormSchema,
		type CreateCategoryForm,
		type UpdateCategoryForm,
	} from './schema';

	export let data: SuperValidated<
		Infer<CreateCategoryForm | UpdateCategoryForm>
	>;
	export let isEditing: boolean = false;
	export let editingCategoryId: string | null = null;
	export let editingCategoryName: string = '';
	export let onSuccess: () => void = () => {};
	export let onCancel: () => void = () => {};
	export let showDeleteButton: boolean = false;
	export let onDelete: (categoryId: string) => void = () => {};

	// Utiliser le bon schéma selon le mode
	const form = superForm(data, {
		validators: zodClient(
			isEditing ? updateCategoryFormSchema : createCategoryFormSchema,
		),
	});

	const { form: formData, enhance, submitting, message } = form;

	// Initialiser les valeurs du formulaire
	$: if (isEditing && editingCategoryName) {
		$formData.name = editingCategoryName;
	}

	// Gérer le succès
	$: if ($message) {
		onSuccess();
	}
</script>

<form
	method="POST"
	action={isEditing ? '?/updateCategory' : '?/createCategory'}
	use:enhance
	class="flex items-center gap-1"
>
	<Form.Errors {form} />

	<!-- Champ caché pour l'ID de la catégorie en mode édition -->
	{#if isEditing && editingCategoryId}
		<input type="hidden" name="categoryId" value={editingCategoryId} />
	{/if}

	<Form.Field {form} name="name">
		<Form.Control let:attrs>
			<Input
				{...attrs}
				bind:value={$formData.name}
				type="text"
				placeholder="Nom de la catégorie"
				class="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Button
		type="submit"
		variant="outline"
		size="sm"
		class="h-9 w-9 p-0"
		title="Valider"
		disabled={$submitting}
	>
		{#if $submitting}
			<div
				class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
			/>
		{:else}
			<Check class="h-4 w-4" />
		{/if}
	</Button>

	<Button
		type="button"
		variant="outline"
		size="sm"
		class="h-9 w-9 p-0"
		on:click={onCancel}
		title="Annuler"
	>
		<X class="h-4 w-4" />
	</Button>

	<!-- Bouton de suppression (affiché seulement en mode édition) -->
	{#if showDeleteButton && isEditing && editingCategoryId}
		<Button
			type="button"
			variant="outline"
			size="sm"
			class="h-9 w-9 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
			title="Supprimer"
			on:click={() => editingCategoryId && onDelete(editingCategoryId)}
		>
			<svg
				class="h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
				></path>
			</svg>
		</Button>
	{/if}
</form>
