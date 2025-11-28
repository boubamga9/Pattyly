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
	class="flex flex-col gap-3"
	method="POST"
	action="?/deleteAccount"
	use:enhance
>
	<Form.Field {form} name="confirmation">
		<Form.Control let:attrs>
			<Form.Label
				>Pour confirmer, veuillez saisir votre mot de passe :</Form.Label
			>
			<Input
				{...attrs}
				type="password"
				required
				disabled={$submitting}
				bind:value={$formData.confirmation}
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Dialog.Footer>
		<Form.Button
			type="submit"
			class={`h-10 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed border-destructive text-destructive enabled:hover:bg-destructive/10 enabled:hover:text-destructive ${
				$submitting
					? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
					: ''
			}`}
			variant="outline"
			disabled={$submitting || !$tainted}
		>
			{#if $submitting}
				<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
				Suppression du compte…
			{:else}
				Supprimer le compte
			{/if}
		</Form.Button>
		<Dialog.Close asChild let:builder>
			<Form.Button type="reset" variant="default" builders={[builder]} class="h-10">
				Annuler
			</Form.Button>
		</Dialog.Close>
	</Dialog.Footer>
</form>