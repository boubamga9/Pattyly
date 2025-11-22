<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import * as Card from '$lib/components/ui/card';
	import { WebsiteName } from '../../../../config';
	import ConfirmationForm from './confirmation-form.svelte';
	import { revealElement } from '$lib/utils/animations';
	import Mail from 'virtual:icons/lucide/mail';

	export let data;

	// Récupérer l'email depuis les paramètres d'URL ou les données
	$: userEmail =
		$page.url.searchParams.get('email') || data?.userEmail || 'votre email';
	$: isRecovery = data?.type === 'recovery';

	let heroTitle: HTMLElement;
	let heroContent: HTMLElement;
	let cardContainer: HTMLElement;

	onMount(async () => {
		if (heroTitle) await revealElement(heroTitle, { delay: 0, duration: 0.6 });
		if (heroContent) await revealElement(heroContent, { delay: 0.1, duration: 0.6 });
		if (cardContainer) await revealElement(cardContainer, { delay: 0.2, duration: 0.6 });
	});
</script>

<svelte:head>
	<title>
		{isRecovery
			? `Réinitialisation mot de passe - Code de vérification | ${WebsiteName}`
			: `Confirmez votre email - Code de vérification | ${WebsiteName}`}
	</title>
	<meta
		name="description"
		content={isRecovery
			? "Entre le code de réinitialisation à 6 chiffres reçu par email pour réinitialiser ton mot de passe Pattyly et récupérer l'accès à ton compte cake designer."
			: "Confirme ton adresse email avec le code à 6 chiffres reçu par email pour finaliser ton inscription Pattyly et accéder à ton dashboard de gestion."}
	/>
	<meta
		name="keywords"
		content={isRecovery
			? "code réinitialisation mot de passe, reset password pattyly, récupérer compte cake designer, code vérification email"
			: "confirmation email pattyly, code vérification, finaliser inscription cake designer, activer compte pâtisserie"}
	/>
	<meta
		property="og:title"
		content={isRecovery
			? `Réinitialisation mot de passe - Code de vérification | ${WebsiteName}`
			: `Confirmez votre email - Code de vérification | ${WebsiteName}`}
	/>
	<meta
		property="og:description"
		content={isRecovery
			? "Entre le code de réinitialisation à 6 chiffres reçu par email pour réinitialiser ton mot de passe Pattyly."
			: "Confirme ton adresse email avec le code à 6 chiffres reçu par email pour finaliser ton inscription Pattyly."}
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/confirmation" />
	<link rel="canonical" href="https://pattyly.com/confirmation" />
</svelte:head>

<!-- Hero section premium -->
<section class="relative flex min-h-[90vh] w-full flex-col justify-center overflow-hidden bg-white pt-24 pb-24 md:min-h-screen md:pt-32 md:pb-32">
	<div class="absolute inset-0 h-full w-full bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent"></div>
	
	<div class="relative z-10 mx-auto max-w-2xl px-6 sm:px-8 lg:px-12">
		<!-- Header minimaliste -->
		<div class="mb-12 text-center">
			<div
				class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FF6F61]/10"
			>
				<Mail class="h-10 w-10 text-[#FF6F61]" />
			</div>
			<h1
				bind:this={heroTitle}
				class="mb-6 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl"
				style="font-weight: 600; letter-spacing: -0.03em;"
			>
				{#if isRecovery}
					Réinitialise ton <span class="text-[#FF6F61]">mot de passe</span>
				{:else}
					Confirme ton <span class="text-[#FF6F61]">email</span>
				{/if}
			</h1>
			<p
				bind:this={heroContent}
				class="mx-auto max-w-xl text-lg leading-[180%] text-neutral-600 sm:text-xl"
				style="font-weight: 300; letter-spacing: -0.01em;"
			>
				{#if isRecovery}
					Entre le code de réinitialisation à 6 chiffres envoyé à {userEmail}
				{:else}
					Entre le code de vérification à 6 chiffres envoyé à {userEmail}
				{/if}
			</p>
		</div>

		<!-- Card avec formulaire -->
		<div bind:this={cardContainer}>
			<Card.Root
				class="mx-auto rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur-sm shadow-xl"
			>
				<Card.Content class="p-8 sm:p-10">
					<div class="space-y-6">
						<ConfirmationForm data={data.form} email={userEmail} type={data.type} />
						<div class="text-center text-sm text-neutral-600">
							Tu as déjà un compte ?
							<a
								href="/login"
								class="ml-1 text-[#FF6F61] font-medium underline transition-colors hover:text-[#e85a4f]"
							>
								Se connecter
							</a>
							.
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</section>
