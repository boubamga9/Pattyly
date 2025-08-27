<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { WebsiteName } from '../../../../config';
	import ForgotPasswordForm from './forgot-password-form.svelte';

	export let data;
</script>

<svelte:head>
	<title>Mot de passe oublié - {WebsiteName}</title>
</svelte:head>

<div class="mb-24 mt-36">
	<Card.Root
		class="mx-auto max-w-sm rounded-2xl border-neutral-200 bg-white shadow-sm"
	>
		<Card.Header class="text-center">
			<Card.Title
				tag="h1"
				class="text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl"
			>
				Mot de passe oublié
			</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="flex flex-col gap-3">
				<p class="text-center text-sm text-neutral-700">
					Entre ton adresse email ci-dessous et nous t'enverrons les
					instructions pour réinitialiser ton mot de passe.
				</p>
				<ForgotPasswordForm data={data.form} />
				<div class="mt-4 text-center text-sm text-neutral-600">
					Tu te souviens de ton mot de passe ? <a
						href="/login"
						class="text-[#FF6F61] underline transition-colors hover:text-[#e85a4f]"
						>Se connecter</a
					>.
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
