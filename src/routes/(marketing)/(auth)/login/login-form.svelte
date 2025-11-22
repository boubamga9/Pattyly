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
	import Eye from '~icons/lucide/eye';
	import EyeOff from '~icons/lucide/eye-off';
	import { formSchema, type FormSchema } from './schema';

	export let data: SuperValidated<Infer<FormSchema>>;

	const form = superForm(data, {
		validators: zodClient(formSchema),
	});

	const { form: formData, enhance, submitting } = form;

	// État pour la visibilité du mot de passe
	let showPassword = false;

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}
</script>

<form
	method="POST"
	action="?redirectTo={encodeURIComponent(
		`${$page.url.origin}/auth/callback${$page.url.search}`,
	)}"
	use:enhance
	class="grid gap-6"
>
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
	<Form.Field {form} name="password">
		<Form.Control let:attrs>
			<div class="mb-2 flex items-center">
				<Form.Label class="text-sm font-medium text-neutral-700">Mot de passe</Form.Label>
				<a
					href="/forgot-password"
					class="ml-auto inline-block text-sm text-[#FF6F61] underline transition-colors hover:text-[#e85a4f]"
				>
					Mot de passe oublié ?
				</a>
			</div>
			<div class="relative">
				<Input
					{...attrs}
					type={showPassword ? 'text' : 'password'}
					placeholder="••••••••"
					required
					bind:value={$formData.password}
					class="h-12 rounded-xl border-neutral-300 bg-white pr-10 text-base transition-all duration-200 focus:border-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61]/20"
				/>
				<button
					type="button"
					on:click={togglePasswordVisibility}
					class="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 transition-colors hover:text-neutral-600 focus:outline-none"
					aria-label={showPassword
						? 'Masquer le mot de passe'
						: 'Afficher le mot de passe'}
				>
					{#if showPassword}
						<EyeOff class="h-5 w-5" />
					{:else}
						<Eye class="h-5 w-5" />
					{/if}
				</button>
			</div>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Button 
		class="h-12 w-full rounded-xl bg-[#FF6F61] text-base font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" 
		disabled={$submitting}
	>
		{#if $submitting}
			<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
			Connexion en cours…
		{:else}
			Se connecter
		{/if}
	</Form.Button>
</form>
