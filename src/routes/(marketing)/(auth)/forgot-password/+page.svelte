<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { WebsiteName } from '../../../../config';
	import ForgotPasswordForm from './forgot-password-form.svelte';
	import { revealElement } from '$lib/utils/animations';

	export let data;

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
	<title>Mot de passe oublié - Réinitialiser ton compte | {WebsiteName}</title>
	<meta
		name="description"
		content="Réinitialise ton mot de passe Pattyly en quelques clics. Entre ton email et reçois les instructions pour récupérer l'accès à ton compte cake designer."
	/>
	<meta
		name="keywords"
		content="mot de passe oublié, réinitialiser mot de passe, récupérer compte pattyly, reset password cake designer"
	/>
	<meta property="og:title" content="Mot de passe oublié - Réinitialiser ton compte | {WebsiteName}" />
	<meta
		property="og:description"
		content="Réinitialise ton mot de passe Pattyly en quelques clics. Entre ton email et reçois les instructions pour récupérer l'accès à ton compte."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/forgot-password" />
	<link rel="canonical" href="https://pattyly.com/forgot-password" />
</svelte:head>

<!-- Hero section premium -->
<section class="relative flex min-h-[90vh] w-full flex-col justify-center overflow-hidden bg-white pt-24 pb-24 md:min-h-screen md:pt-32 md:pb-32">
	<div class="absolute inset-0 h-full w-full bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent"></div>
	
	<div class="relative z-10 mx-auto max-w-2xl px-6 sm:px-8 lg:px-12">
		<!-- Header minimaliste -->
		<div class="mb-12 text-center">
			<h1
				bind:this={heroTitle}
				class="mb-6 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl"
				style="font-weight: 600; letter-spacing: -0.03em;"
			>
				Mot de passe <span class="text-[#FF6F61]">oublié</span> ?
			</h1>
			<p
				bind:this={heroContent}
				class="mx-auto max-w-xl text-lg leading-[180%] text-neutral-600 sm:text-xl"
				style="font-weight: 300; letter-spacing: -0.01em;"
			>
				Entre ton adresse email et nous t'enverrons les instructions pour réinitialiser ton mot de passe.
			</p>
		</div>

		<!-- Card avec formulaire -->
		<div bind:this={cardContainer}>
			<Card.Root
				class="mx-auto rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur-sm shadow-xl"
			>
				<Card.Content class="p-8 sm:p-10">
					<div class="space-y-6">
						<ForgotPasswordForm data={data.form} />
						<div class="text-center text-sm text-neutral-600">
							Tu te souviens de ton mot de passe ?
							<a
								href="/login"
								class="ml-1 text-[#FF6F61] font-medium underline transition-colors hover:text-[#e85a4f]"
								>Se connecter</a
							>.
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</section>
