<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
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

	const { enhance, submitting, message } = form;

	$: if ($message) {
		console.log('✅ Toggle mis à jour avec succès');
		// Notifier le parent du changement au lieu de recharger la page
		if (typeof isCustomAccepted === 'boolean') {
			onToggle(!isCustomAccepted);
		} else {
			console.warn("⚠️ isCustomAccepted n'est pas défini, toggle non effectué");
		}
	}
</script>

<form
	method="POST"
	action="?/toggleCustomRequests"
	use:enhance
	class="flex items-center justify-between"
>
	<Form.Errors {form} />

	<div class="space-y-1">
		<p class="text-sm font-medium">Accepter les demandes personnalisées</p>
		<p class="text-sm text-muted-foreground">
			Permettre aux clients de vous contacter pour des demandes spéciales
		</p>
	</div>
	<div class="flex items-center space-x-2">
		<input type="hidden" name="isCustomAccepted" value={!isCustomAccepted} />
		<Button
			type="submit"
			variant={isCustomAccepted ? 'outline' : 'default'}
			disabled={$submitting}
		>
			{isCustomAccepted ? 'Désactiver' : 'Activer'}
		</Button>
	</div>
</form>
