<script lang="ts">
	import { page } from '$app/stores';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { formSchema, type FormSchema } from './schema';

	export let data: SuperValidated<Infer<FormSchema>>;

	const form = superForm(data, {
		validators: zodClient(formSchema),
	});

	const { form: formData, enhance, submitting } = form;
</script>

<form method="POST" use:enhance class="grid gap-4">
	<Form.Errors {form} />
	<Form.Field {form} name="email">
		<Form.Control let:attrs>
			<Form.Label class="mb-2">Email</Form.Label>
			<Input
				{...attrs}
				type="email"
				placeholder="ton@email.com"
				required
				bind:value={$formData.email}
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Button class="w-full" disabled={$submitting}>
		{#if $submitting}
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			Envoi du code…
		{:else}
			Envoyer le code de réinitialisation
		{/if}
	</Form.Button>
</form>
