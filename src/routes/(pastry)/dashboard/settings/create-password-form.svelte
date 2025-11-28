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
	import {
		createPasswordFormSchema,
		type CreatePasswordFormSchema,
	} from './schema';

	export let data: SuperValidated<Infer<CreatePasswordFormSchema>>;
	export let user: User | null;
	export let recoverySession: boolean = false;

	const form = superForm(data, {
		validators: zodClient(createPasswordFormSchema),
	});

	const { form: formData, enhance, submitting, tainted, message } = form;
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>
			{recoverySession
				? 'Réinitialiser le mot de passe'
				: 'Créer un mot de passe'}
		</Card.Title>
		<Card.Description
			>Créez un nouveau mot de passe pour votre compte.</Card.Description
		>
	</Card.Header>
	<form method="POST" action="?/updatePassword" use:enhance>
		<input
			type="text"
			name="email"
			autocomplete="username"
			value={user?.email}
			hidden
		/>
		<Card.Content>
			<Form.Errors {form} />
			<Form.Field {form} name="new_password">
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
			<Form.Field {form} name="confirm_password">
				<Form.Control let:attrs>
					<Form.Label>Confirmer le nouveau mot de passe</Form.Label>
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
				class={`h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
					$submitting
						? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
						: $tainted
							? 'bg-primary hover:bg-primary/90 disabled:opacity-50'
							: 'bg-gray-500 disabled:opacity-50'
				}`}
			>
				{#if $submitting}
					<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
					{recoverySession
						? 'Réinitialisation du mot de passe…'
						: 'Création du mot de passe…'}
				{:else}
					{recoverySession
						? 'Réinitialiser le mot de passe'
						: 'Créer le mot de passe'}
				{/if}
			</Form.Button>
			{#if $message?.success}
				<p class="text-xs text-green-700">{$message.success}</p>
			{:else if !$tainted}
				<p class="text-xs text-muted-foreground">
					Remplissez le formulaire pour créer votre mot de passe.
				</p>
			{/if}
		</Card.Footer>
	</form>
</Card.Root>