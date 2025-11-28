<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Save, X, LoaderCircle, Check } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { personalNoteFormSchema, type PersonalNoteForm } from './schema';
	import { page } from '$app/stores';

	// Props
	export let data: SuperValidated<Infer<PersonalNoteForm>>;
	export let onCancel: () => void;

	// Superforms
	const form = superForm(data, {
		validators: zodClient(personalNoteFormSchema),
		dataType: 'json',
	});

	const { form: formData, enhance, submitting, message } = form;

	let submitted = false;

	// Fermer automatiquement le formulaire en cas de succès
	$: if ($message) {
		submitted = true;
		setTimeout(() => {
			submitted = false;
			onCancel();
		}, 2000);
	}
</script>

<form
	method="POST"
	action="?/savePersonalNote"
	use:enhance
	class="space-y-4 rounded-lg border p-4"
>
	<!-- Champs cachés pour shopId (optimisation : éviter getUserPermissions + requête shop) -->
	<input type="hidden" name="shopId" value={$page.data.shop.id} />

	<!-- Note -->
	<Form.Field {form} name="note">
		<Form.Control let:attrs>
			<Label for="noteText">Note personnelle</Label>
			<Textarea
				{...attrs}
				id="noteText"
				bind:value={$formData.note}
				placeholder="Vos notes personnelles sur cette commande..."
				rows="4"
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Boutons d'action -->
	<div class="flex gap-2">
		<Button
			type="submit"
			class={`h-10 flex-1 text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
				submitted
					? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
					: $submitting
						? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
						: 'bg-primary hover:bg-primary/90 disabled:opacity-50'
			}`}
			disabled={$submitting}
		>
			{#if $submitting}
				<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
				Sauvegarde...
			{:else if submitted}
				<Check class="mr-2 h-5 w-5" />
				Sauvegardé !
			{:else}
				<Save class="mr-2 h-5 w-5" />
				Sauvegarder
			{/if}
		</Button>
		<Button
			type="button"
			variant="outline"
			on:click={onCancel}
			class="flex-1 gap-2"
		>
			<X class="mr-2 h-4 w-4" />
			Annuler
		</Button>
	</div>
</form>