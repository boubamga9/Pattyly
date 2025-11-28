<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Check, X, LoaderCircle } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { makeQuoteFormSchema, type MakeQuoteForm } from './schema';
	import { page } from '$app/stores';

	// Props
	export let data: SuperValidated<Infer<MakeQuoteForm>>;
	export let onCancel: () => void = () => {};
	export let onSuccess: () => void = () => {};

const MESSAGE_MAX = 500;

// Superforms
const form = superForm(data, {
	validators: zodClient(makeQuoteFormSchema),
	dataType: 'json',
});

	const { form: formData, enhance, submitting, message } = form;

	let submitted = false;

$: messageLength = ($formData.chef_message || '').length;

	// Fermer automatiquement le formulaire en cas de succès
	$: if ($message) {
		submitted = true;
		setTimeout(() => {
			submitted = false;
			onSuccess();
		}, 2000);
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
	<!-- Champs cachés pour shopId et shopSlug (optimisation : éviter getUser + requête shop) -->
	<input type="hidden" name="shopId" value={$page.data.shop.id} />
	<input type="hidden" name="shopSlug" value={$page.data.shop.slug} />

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
				maxlength={MESSAGE_MAX}
			/>
		</Form.Control>
		<Form.FieldErrors />
		<p class="text-right text-xs text-muted-foreground">
			{messageLength}/{MESSAGE_MAX} caractères
		</p>
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
				Envoi...
			{:else if submitted}
				<Check class="mr-2 h-5 w-5" />
				Envoyé !
			{:else}
				<Check class="mr-2 h-5 w-5" />
				Envoyer le devis
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