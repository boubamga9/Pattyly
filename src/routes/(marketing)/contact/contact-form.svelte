<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
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

	const { form: formData, enhance, submitting, message } = form;
</script>

<form method="POST" use:enhance class="grid gap-4">
	{#if $message?.success}
		<p class="text-sm text-green-700">{$message.success}</p>
	{:else}
		<Form.Errors {form} />
		<div class="flex flex-wrap gap-2">
			<Form.Field class="flex-1" {form} name="name">
				<Form.Control let:attrs>
					<Form.Label class="mb-2">Nom</Form.Label>
					<Input
						{...attrs}
						type="text"
						placeholder="Ton nom"
						required
						bind:value={$formData.name}
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field class="flex-1" {form} name="email">
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
		</div>
		<Form.Field class="flex-1" {form} name="subject">
			<Form.Control let:attrs>
				<Form.Label class="mb-2">Sujet</Form.Label>
				<Input
					{...attrs}
					type="text"
					placeholder="Demande de collaboration"
					required
					bind:value={$formData.subject}
				/>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
		<Form.Field {form} name="body">
			<Form.Control let:attrs>
				<Form.Label class="mb-2">Message</Form.Label>
				<Textarea
					rows={10}
					{...attrs}
					placeholder="Tape ton message ici."
					bind:value={$formData.body}
				/>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
		<Form.Button 
			class="mt-4 h-14 w-full rounded-xl bg-[#FF6F61] text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
			disabled={$submitting}
		>
			{#if $submitting}
				<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
				Envoi du message…
			{:else}
				Envoyer le message
			{/if}
		</Form.Button>
	{/if}
</form>
