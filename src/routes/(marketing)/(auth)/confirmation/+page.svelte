<script lang="ts">
	import { page } from '$app/stores';
	import * as Card from '$lib/components/ui/card';
	import ConfirmationForm from './confirmation-form.svelte';

	export let data;

	// Récupérer l'email depuis les paramètres d'URL ou les données
	$: userEmail =
		$page.url.searchParams.get('email') || data?.userEmail || 'votre email';
</script>

<svelte:head>
	<title>Confirmez votre email - Pattyly</title>
	<meta
		name="description"
		content="Confirmez votre adresse email pour continuer"
	/>
	<meta
		name="keywords"
		content="confirmation email, vérification, pâtisserie, gestion"
	/>
</svelte:head>

<div class="mb-24 mt-36">
	<Card.Root
		class="mx-auto max-w-sm rounded-2xl border-neutral-200 bg-white shadow-sm"
	>
		<Card.Header class="text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
			>
				<svg
					class="h-8 w-8 text-green-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<Card.Title
				tag="h1"
				class="text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl"
			>
				Confirmez votre email
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<ConfirmationForm data={data.form} email={userEmail} type={data.type} />

			<div class="mt-6 text-center text-sm text-neutral-600">
				Vous avez déjà un compte ?
				<a
					href="/login"
					class="text-[#FF6F61] underline transition-colors hover:text-[#e85a4f]"
				>
					Se connecter
				</a>
			</div>
		</Card.Content>
	</Card.Root>
</div>
