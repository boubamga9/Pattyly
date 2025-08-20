<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { X } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { rejectOrderFormSchema, type RejectOrderForm } from './schema';

	// Props
	export let data: SuperValidated<Infer<RejectOrderForm>>;
	export let onCancel: () => void;

	// Superforms
	const form = superForm(data, {
		validators: zodClient(rejectOrderFormSchema),
		dataType: 'json',
	});

	const { form: formData, enhance, submitting, message, errors } = form;

	// Fermer automatiquement le formulaire en cas de succès
	$: if ($message) {
		onCancel();
	}
</script>

<form
	method="POST"
	action="?/rejectOrder"
	use:enhance
	class="space-y-4 rounded-lg border p-4"
>
	<!-- Message -->
	<Form.Field {form} name="chef_message">
		<Form.Control let:attrs>
			<Label for="rejectMessage">Message (optionnel)</Label>
			<Textarea
				{...attrs}
				id="rejectMessage"
				bind:value={$formData.chef_message}
				placeholder="Message pour le client..."
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
			variant="destructive"
			class="flex-1 gap-2"
			disabled={$submitting}
		>
			{#if $submitting}
				<div
					class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
				/>
			{:else}
				<X class="mr-2 h-4 w-4" />
			{/if}
			Refuser
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
