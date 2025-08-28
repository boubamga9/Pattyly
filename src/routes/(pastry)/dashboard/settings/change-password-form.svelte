<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import type { User } from '@supabase/supabase-js';
	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { CheckCircle } from 'lucide-svelte';
	import {
		changePasswordFormSchema,
		createPasswordFormSchema,
		type ChangePasswordFormSchema,
	} from './schema';

	export let data: SuperValidated<Infer<ChangePasswordFormSchema>>;
	export let user: User | null;

	const changeForm = superForm(data, {
		validators: zodClient(changePasswordFormSchema),
	});

	const createForm = superForm(data, {
		validators: zodClient(createPasswordFormSchema),
	});

	$: isUpdate = 'old_password' in data.data;

	$: ({
		form: formData,
		enhance,
		submitting,
		tainted,
	} = isUpdate ? changeForm : createForm);

	let submitted = false;
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>
			{#if isUpdate}
				Modifier le mot de passe
			{:else}
				Créer un mot de passe
			{/if}
		</Card.Title>
		<Card.Description>
			{#if isUpdate}
				Modifiez le mot de passe associé à votre compte.
			{:else}
				Créez un mot de passe pour votre compte.
			{/if}
		</Card.Description>
	</Card.Header>
	<form
		method="POST"
		action="?/updatePassword"
		use:enhance={{
			onResult: ({ result }) => {
				// Only show success feedback if the request succeeded
				if (result.type === 'success') {
					submitted = true;
					setTimeout(() => (submitted = false), 2000);
				}
			},
		}}
	>
		<input
			type="text"
			name="email"
			autocomplete="username"
			value={user?.email}
			hidden
		/>
		<Card.Content>
			<Form.Errors form={isUpdate ? changeForm : createForm} />
			{#if isUpdate}
				<Form.Field
					form={isUpdate ? changeForm : createForm}
					name="old_password"
				>
					<Form.Control let:attrs>
						<Form.Label>Ancien mot de passe</Form.Label>
						<Input
							{...attrs}
							type="password"
							autocomplete="current-password"
							required
							bind:value={$formData.old_password}
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			{/if}
			<Form.Field form={isUpdate ? changeForm : createForm} name="new_password">
				<Form.Control let:attrs>
					<Form.Label>Nouveau mot de passe</Form.Label>
					<Input
						{...attrs}
						type="password"
						autocomplete="new-password"
						disabled={$submitting}
						required
						bind:value={$formData.new_password}
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field
				form={isUpdate ? changeForm : createForm}
				name="confirm_password"
			>
				<Form.Control let:attrs>
					<Form.Label>Confirmer le mot de passe</Form.Label>
					<Input
						{...attrs}
						type="password"
						autocomplete="new-password"
						disabled={$submitting}
						required
						bind:value={$formData.confirm_password}
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</Card.Content>
		<Card.Footer class="flex gap-2">
			<Form.Button
				type="submit"
				disabled={$submitting || !$tainted}
				class={`w-full transition-all duration-200 ${
					$submitting
						? 'cursor-not-allowed bg-gray-300'
						: submitted
							? 'bg-green-700 hover:bg-green-800'
							: 'bg-primary hover:bg-primary/90'
				}`}
			>
				{#if $submitting}
					<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
					Mise à jour du mot de passe…
				{:else if submitted}
					<CheckCircle class="mr-2 h-4 w-4" />
					Mot de passe mis à jour
				{:else}
					Mettre à jour le mot de passe
				{/if}
			</Form.Button>
		</Card.Footer>
	</form>
</Card.Root>
