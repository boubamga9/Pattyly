<script lang="ts">
	import { page } from '$app/stores';
	import * as Form from '$lib/components/ui/form';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import {
		toggleCustomRequestsFormSchema,
		type ToggleCustomRequestsForm,
	} from './schema';

	export let data: SuperValidated<Infer<ToggleCustomRequestsForm>>;
	export let isCustomAccepted: boolean;
	export let onToggle: (newValue: boolean) => void;

	const form = superForm(data, {
		validators: zodClient(toggleCustomRequestsFormSchema),
	});

	const { enhance, submitting } = form;

	// État local pour l'optimistic update
	let localIsCustomAccepted = isCustomAccepted;

	// Synchroniser avec la prop si elle change
	$: if (isCustomAccepted !== localIsCustomAccepted && !$submitting) {
		localIsCustomAccepted = isCustomAccepted;
	}

	// Référence au bouton submit caché
	let submitButton: HTMLButtonElement;

	// Handle toggle change
	function handleToggleChange() {
		const newValue = !localIsCustomAccepted;

		// Mettre à jour l'état local immédiatement (optimistic update)
		localIsCustomAccepted = newValue;
		onToggle(newValue);

		// Déclencher la soumission du formulaire
		if (submitButton) {
			submitButton.click();
		}
	}
</script>

<form
	method="POST"
	action="?/toggleCustomRequests"
	use:enhance={() => {
		return async ({ result }) => {
			if (result.type === 'success') {
				// Succès - rien à faire, l'état local est déjà à jour
			} else {
				// En cas d'erreur, remettre l'ancienne valeur
				localIsCustomAccepted = isCustomAccepted;
				onToggle(isCustomAccepted);
			}
		};
	}}
>
	<!-- ✅ OPTIMISÉ : Passer shopId et shopSlug pour éviter getUserPermissions + requête shop -->
	{#if $page.data.shop}
		<input type="hidden" name="shopId" value={$page.data.shop.id} />
		<input type="hidden" name="shopSlug" value={$page.data.shop.slug} />
	{/if}
	<input type="hidden" name="isCustomAccepted" value={String(!localIsCustomAccepted)} />
	<Form.Errors {form} />

	<!-- Bouton submit caché pour déclencher la soumission -->
	<button
		type="submit"
		bind:this={submitButton}
		class="hidden"
		aria-hidden="true"
		tabindex="-1"
	>
		Soumettre
	</button>
</form>

<div class="flex items-center justify-between">
	<div class="flex items-center space-x-4">
		<Switch
			checked={localIsCustomAccepted}
			on:change={handleToggleChange}
			disabled={$submitting}
		/>
		<div class="space-y-0.5">
			<Label class="text-sm font-medium">Accepter les demandes personnalisées</Label>
			<p class="text-sm text-muted-foreground">
				Permettre aux clients de vous contacter pour des demandes spéciales
			</p>
		</div>
	</div>
</div>