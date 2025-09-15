<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import Eye from '~icons/lucide/eye';
	import EyeOff from '~icons/lucide/eye-off';
	import { newPasswordSchema, type NewPasswordSchema } from './schema';

	export let data: SuperValidated<Infer<NewPasswordSchema>>;

	const form = superForm(data, {
		validators: zodClient(newPasswordSchema),
	});

	const { form: formData, enhance, submitting } = form;

	// État pour la visibilité des mots de passe
	let showPassword = false;
	let showConfirmPassword = false;

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	function toggleConfirmPasswordVisibility() {
		showConfirmPassword = !showConfirmPassword;
	}
</script>

<form method="POST" use:enhance class="grid gap-4">
	<Form.Errors {form} />

	<Form.Field {form} name="password">
		<Form.Control let:attrs>
			<Form.Label class="mb-2">Nouveau mot de passe</Form.Label>
			<div class="relative">
				<Input
					{...attrs}
					type={showPassword ? 'text' : 'password'}
					placeholder="••••••••"
					required
					bind:value={$formData.password}
					class="pr-10"
				/>
				<button
					type="button"
					on:click={togglePasswordVisibility}
					class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
					aria-label={showPassword
						? 'Masquer le mot de passe'
						: 'Afficher le mot de passe'}
				>
					{#if showPassword}
						<EyeOff class="h-4 w-4" />
					{:else}
						<Eye class="h-4 w-4" />
					{/if}
				</button>
			</div>
		</Form.Control>
		<Form.FieldErrors />
		<Form.Description class="text-right text-xs"
			>Au moins 8 caractères dont une majuscule, une minuscule, un chiffre et un
			caractère spécial</Form.Description
		>
	</Form.Field>

	<Form.Field {form} name="confirmPassword">
		<Form.Control let:attrs>
			<Form.Label class="mb-2">Confirmer le nouveau mot de passe</Form.Label>
			<div class="relative">
				<Input
					{...attrs}
					type={showConfirmPassword ? 'text' : 'password'}
					placeholder="••••••••"
					required
					bind:value={$formData.confirmPassword}
					class="pr-10"
				/>
				<button
					type="button"
					on:click={toggleConfirmPasswordVisibility}
					class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
					aria-label={showConfirmPassword
						? 'Masquer la confirmation'
						: 'Afficher la confirmation'}
				>
					{#if showConfirmPassword}
						<EyeOff class="h-4 w-4" />
					{:else}
						<Eye class="h-4 w-4" />
					{/if}
				</button>
			</div>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Button class="w-full" disabled={$submitting}>
		{#if $submitting}
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			Mise à jour en cours…
		{:else}
			Mettre à jour le mot de passe
		{/if}
	</Form.Button>
</form>
