<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { AlertCircle } from 'lucide-svelte';
	import {
		deleteAccountFormSchema,
		type DeleteAccountFormSchema,
	} from './schema';

	export let data: SuperValidated<Infer<DeleteAccountFormSchema>>;

	const form = superForm(data, {
		validators: zodClient(deleteAccountFormSchema),
		resetForm: false,
	});

	const { form: formData, enhance, tainted, submitting } = form;
</script>

<form
	class="flex flex-col gap-6"
	method="POST"
	action="?/deleteAccount"
	use:enhance
>
	<div class="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
		<div class="flex gap-3">
			<AlertCircle class="h-5 w-5 flex-shrink-0 text-destructive mt-0.5" />
			<p class="text-sm text-muted-foreground">
				Pour confirmer la suppression de votre compte, veuillez saisir votre mot de passe ci-dessous.
			</p>
		</div>
	</div>

	<Form.Field {form} name="confirmation">
		<Form.Control let:attrs>
			<Form.Label class="text-sm font-medium">
				Mot de passe
			</Form.Label>
			<Input
				{...attrs}
				type="password"
				required
				placeholder="Saisissez votre mot de passe"
				disabled={$submitting}
				bind:value={$formData.confirmation}
				class="h-10"
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Dialog.Footer class="flex-col gap-3 sm:flex-row sm:justify-end">
		<Dialog.Close asChild let:builder>
			<Form.Button
				type="reset"
				variant="outline"
				builders={[builder]}
				class="h-10 w-full sm:w-auto"
				disabled={$submitting}
			>
				Annuler
			</Form.Button>
		</Dialog.Close>
		<Form.Button
			type="submit"
			variant="destructive"
			class="h-10 w-full sm:w-auto"
			disabled={$submitting || !$tainted}
		>
			{#if $submitting}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				Suppression en cours…
			{:else}
				Supprimer définitivement mon compte
			{/if}
		</Form.Button>
	</Dialog.Footer>
</form>