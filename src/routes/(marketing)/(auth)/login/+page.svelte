<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import type { AuthChangeEvent } from '@supabase/supabase-js';
	import { onMount } from 'svelte';
	import { WebsiteName } from '../../../../config';
	import SocialsAuth from '../components/socials-auth.svelte';
	import LoginForm from './login-form.svelte';
	import { revealElement } from '$lib/utils/animations';

	export let data;

	let { supabase } = data;

	let heroTitle: HTMLElement;
	let heroContent: HTMLElement;
	let cardContainer: HTMLElement;

	onMount(async () => {
		supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
			// Redirect to account after sucessful login
			if (event == 'SIGNED_IN') {
				// Delay needed because order of callback not guaranteed.
				// Give the layout callback priority to update state or
				// we'll just bounch back to login when /dashboard tries to load
				setTimeout(() => {
					goto('/dashboard');
				}, 1);
			}
		});

		if (heroTitle) await revealElement(heroTitle, { delay: 0, duration: 0.6 });
		if (heroContent) await revealElement(heroContent, { delay: 0.1, duration: 0.6 });
		if (cardContainer) await revealElement(cardContainer, { delay: 0.2, duration: 0.6 });
	});
</script>

<svelte:head>
	<title>Se connecter - Accès dashboard cake designer | {WebsiteName}</title>
	<meta
		name="description"
		content="Connecte-toi à ton compte Pattyly pour accéder à ton dashboard de gestion de pâtisserie. Gère tes commandes, devis et factures en ligne."
	/>
	<meta
		name="keywords"
		content="connexion pattyly, login cake designer, dashboard pâtisserie, gestion commandes, logiciel pâtissier"
	/>
	<meta property="og:title" content="Se connecter - Accès dashboard cake designer | {WebsiteName}" />
	<meta
		property="og:description"
		content="Connecte-toi à ton compte Pattyly pour accéder à ton dashboard de gestion de pâtisserie."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/login" />
	<link rel="canonical" href="https://pattyly.com/login" />
</svelte:head>

<!-- Hero section premium -->
<section class="relative flex min-h-[90vh] w-full flex-col justify-center overflow-hidden bg-white pt-24 pb-24 md:min-h-screen md:pt-32 md:pb-32">
	<div class="absolute inset-0 h-full w-full bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent"></div>
	
	<div class="relative z-10 mx-auto max-w-2xl px-6 sm:px-8 lg:px-12">
		{#if $page.url.searchParams.get('verified') == 'true'}
			<div class="mb-8 text-center">
				<Alert.Root class="mb-6" variant="default">
					<Alert.Title>Email vérifié !</Alert.Title>
					<Alert.Description>
						Tu peux maintenant te connecter à ton compte.
					</Alert.Description>
				</Alert.Root>
			</div>
		{/if}

		<!-- Header minimaliste -->
		<div class="mb-12 text-center">
			<h1
				bind:this={heroTitle}
				class="mb-6 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl"
				style="font-weight: 600; letter-spacing: -0.03em;"
			>
				Connecte-toi à <span class="text-[#FF6F61]">ton compte</span>
			</h1>
			<p
				bind:this={heroContent}
				class="mx-auto max-w-xl text-lg leading-[180%] text-neutral-600 sm:text-xl"
				style="font-weight: 300; letter-spacing: -0.01em;"
			>
				Accède à ton dashboard pour gérer tes commandes, devis et factures en ligne.
			</p>
		</div>

		<!-- Card avec formulaire -->
		<div bind:this={cardContainer}>
			<Card.Root
				class="mx-auto rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur-sm shadow-xl"
			>
				<Card.Content class="p-8 sm:p-10">
					<SocialsAuth />

					<div class="mt-6 space-y-6">
						<LoginForm data={data.form} />
						<div class="text-center text-sm text-neutral-600">
							Tu n&apos;as pas encore de compte ?
							<a
								href="/register"
								class="ml-1 text-[#FF6F61] font-medium underline transition-colors hover:text-[#e85a4f]"
								>Créer un compte</a
							>.
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</section>
