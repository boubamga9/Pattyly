<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Check, X } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { makeQuoteFormSchema, type MakeQuoteForm } from './schema';

	// Props
	export let data: SuperValidated<Infer<MakeQuoteForm>>;
	export let onCancel: () => void = () => {};
	export let onSuccess: () => void = () => {};

	// Superforms
	const form = superForm(data, {
		validators: zodClient(makeQuoteFormSchema),
		dataType: 'json',
	});

	const { form: formData, enhance, submitting, message } = form;

	// Fermer automatiquement le formulaire en cas de succès
	$: if ($message) {
		onSuccess();
	}
</script>

<form
	method="POST"
	action="?/makeQuote"
	use:enhance={() => {
		return async ({ result }) => {
			if (result.type === 'success') {
				onSuccess();
			}
		};
	}}
	class="space-y-4 rounded-lg border p-4"
>
	<!-- Prix -->
	<Form.Field {form} name="price">
		<Form.Control let:attrs>
			<Label for="quotePrice">Prix (€)</Label>
			<Input
				{...attrs}
				id="quotePrice"
				bind:value={$formData.price}
				type="number"
				step="0.01"
				min="0"
				required
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Message -->
	<Form.Field {form} name="chef_message">
		<Form.Control let:attrs>
			<Label for="quoteMessage">Message (optionnel)</Label>
			<Textarea
				{...attrs}
				id="quoteMessage"
				bind:value={$formData.chef_message}
				placeholder="Message pour le client..."
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Nouvelle date de récupération -->
	<Form.Field {form} name="chef_pickup_date">
		<Form.Control let:attrs>
			<Label for="newPickupDate"
				>Nouvelle date de récupération (optionnel)</Label
			>
			<Input
				{...attrs}
				id="newPickupDate"
				bind:value={$formData.chef_pickup_date}
				type="date"
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Nouvelle heure de récupération -->
	<Form.Field {form} name="chef_pickup_time">
		<Form.Control let:attrs>
			<Label for="newPickupTime"
				>Nouvelle heure de récupération (optionnel)</Label
			>
			<Input
				{...attrs}
				id="newPickupTime"
				bind:value={$formData.chef_pickup_time}
				type="time"
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Messages d'erreur/succès -->
	{#if $message}
		<div class="rounded-md bg-green-50 p-3 text-sm text-green-800">
			{$message}
		</div>
	{/if}

	<!-- Boutons d'action -->
	<div class="flex gap-2">
		<Button type="submit" class="flex-1 gap-2" disabled={$submitting}>
			{#if $submitting}
				<div
					class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
				/>
			{:else}
				<Check class="mr-2 h-4 w-4" />
			{/if}
			Envoyer le devis
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
