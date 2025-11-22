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

<form method="POST" use:enhance class="grid gap-6">
	<Form.Errors {form} />
	<Form.Field {form} name="email">
		<Form.Control let:attrs>
			<Form.Label class="mb-2 text-sm font-medium text-neutral-700">Email</Form.Label>
			<Input
				{...attrs}
				type="email"
				placeholder="ton@email.com"
				required
				bind:value={$formData.email}
				class="h-12 rounded-xl border-neutral-300 bg-white text-base transition-all duration-200 focus:border-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61]/20"
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Button 
		class="h-12 w-full rounded-xl bg-[#FF6F61] text-base font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" 
		disabled={$submitting}
	>
		{#if $submitting}
			<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
			Envoi du code…
		{:else}
			Envoyer le code de réinitialisation
		{/if}
	</Form.Button>
</form>
