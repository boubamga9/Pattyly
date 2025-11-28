<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { X, LoaderCircle } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { rejectOrderFormSchema, type RejectOrderForm } from './schema';
	import { page } from '$app/stores';

	// Props
	export let data: SuperValidated<Infer<RejectOrderForm>>;
	export let onCancel: () => void;
	export let onSuccess: () => void;

const MESSAGE_MAX = 500;

// Superforms
const form = superForm(data, {
	validators: zodClient(rejectOrderFormSchema),
	dataType: 'json',
});

const { form: formData, enhance, submitting, message, errors } = form;

$: messageLength = ($formData.chef_message || '').length;

	// Fermer automatiquement le formulaire en cas de succès
	$: if ($message) {
		onCancel();
	}
</script>

<form
	method="POST"
	action="?/rejectOrder"
	use:enhance={() => {
		return async ({ result }) => {
			if (result.type === 'success') {
				onSuccess();
			}
		};
	}}
	class="space-y-4 rounded-lg border p-4"
>
	<!-- Champs cachés pour shopId et shopSlug (optimisation : éviter getUser + requête shop) -->
	<input type="hidden" name="shopId" value={$page.data.shop.id} />
	<input type="hidden" name="shopSlug" value={$page.data.shop.slug} />

	<!-- Message -->
	<Form.Field {form} name="chef_message">
		<Form.Control let:attrs>
			<Label for="rejectMessage">Message (optionnel)</Label>
			<Textarea
				{...attrs}
				id="rejectMessage"
				bind:value={$formData.chef_message}
				placeholder="Message pour le client..."
				maxlength={MESSAGE_MAX}
			/>
		</Form.Control>
		<Form.FieldErrors />
		<p class="text-right text-xs text-muted-foreground">
			{messageLength}/{MESSAGE_MAX} caractères
		</p>
	</Form.Field>

	<!-- Messages d'erreur/succès -->
	{#if $message}
		<div class="rounded-md bg-green-50 p-3 text-sm text-green-800">
			{$message}
		</div>
	{/if}

	<!-- Boutons d'action -->
	<div class="flex gap-2">
		<Button
			type="submit"
			variant="destructive"
			class={`h-10 flex-1 text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
				$submitting
					? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
					: 'bg-destructive hover:bg-destructive/90 disabled:opacity-50'
			}`}
			disabled={$submitting}
		>
			{#if $submitting}
				<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
				Refus...
			{:else}
				<X class="mr-2 h-5 w-5" />
				Refuser
			{/if}
		</Button>
		<Button
			type="button"
			variant="outline"
			on:click={onCancel}
			class="flex-1 gap-2"
		>
			Annuler
		</Button>
	</div>
</form>