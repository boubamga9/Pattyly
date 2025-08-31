<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { WebsiteName } from '../../../../config';
	import SocialsAuth from '../components/socials-auth.svelte';
	import RegisterForm from './register-form.svelte';

	export let data;
	export let form;

	// Check form status
	$: signupDisabled = form?.signupDisabled;
</script>

<svelte:head>
	<title>Créer un compte - {WebsiteName}</title>
	<meta
		name="description"
		content="Créez votre compte Pattyly pour commencer à gérer votre activité de pâtissier en ligne. Essai gratuit sans engagement."
	/>
	<meta
		name="keywords"
		content="inscription, créer compte, pâtisserie, gestion, essai gratuit"
	/>
</svelte:head>

{#if data.isCheckout}
	<Alert.Root class="mb-6" variant="warning">
		<Alert.Title>Crée un compte pour continuer</Alert.Title>
		<Alert.Description>
			Pour continuer avec l&apos;achat de ton forfait sélectionné, tu dois
			d&apos;abord créer un compte.
		</Alert.Description>
	</Alert.Root>
{/if}
{#if signupDisabled}
	<Alert.Root class="mb-6" variant="destructive">
		<Alert.Title>Inscriptions temporairement désactivées</Alert.Title>
		<Alert.Description>
			Nous sommes désolés, mais l&apos;inscription de nouveaux utilisateurs est
			actuellement désactivée. Réessaie plus tard ou contacte le support pour
			obtenir de l&apos;aide.
		</Alert.Description>
	</Alert.Root>
	<p class="text-center text-sm">
		Tu as déjà un compte ? <a href="/login" class="underline">Se connecter</a>.
	</p>
{:else}
	<div class="mb-24 mt-36">
		<Card.Root
			class="mx-auto max-w-sm rounded-2xl border-neutral-200 bg-white shadow-sm"
		>
			<Card.Header class="text-center">
				<Card.Title
					tag="h1"
					class="text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl"
				>
					Créer un compte <span class="sr-only">sur {WebsiteName}</span>
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				<SocialsAuth />

				<div class="flex flex-col gap-3">
					<p class="text-center text-sm text-neutral-700">
						Crée ton compte avec ton adresse email ci-dessous.
					</p>
					<RegisterForm data={data.form} />
					<div class="mt-4 text-center text-sm text-neutral-600">
						Tu as déjà un compte ?
						<a
							href="/login"
							class="text-[#FF6F61] underline transition-colors hover:text-[#e85a4f]"
							>Se connecter</a
						>.
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{/if}
