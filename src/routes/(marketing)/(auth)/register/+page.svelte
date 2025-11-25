<script lang="ts">
	import { onMount } from 'svelte';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { WebsiteName } from '../../../../config';
	import SocialsAuth from '../components/socials-auth.svelte';
	import RegisterForm from './register-form.svelte';
	import { revealElement } from '$lib/utils/animations';

	export let data;
	export let form;

	// Check form status
	$: signupDisabled = form?.signupDisabled;

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
	<title>Créer un compte - Logiciel de gestion cake designer | {WebsiteName}</title>
	<meta
		name="description"
		content="Crée ton compte Pattyly gratuitement et commence à gérer ton activité de cake designer en ligne. Version gratuite disponible, boutique en ligne incluse, sans engagement."
	/>
	<meta
		name="keywords"
		content="inscription pattyly, créer compte cake designer, logiciel gestion pâtisserie, logiciel gratuit, boutique en ligne pâtissier"
	/>
	<meta property="og:title" content="Créer un compte - Logiciel de gestion cake designer | {WebsiteName}" />
	<meta
		property="og:description"
		content="Crée ton compte Pattyly gratuitement et commence à gérer ton activité de cake designer en ligne. Version gratuite disponible."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/register" />
	<link rel="canonical" href="https://pattyly.com/register" />
</svelte:head>

<!-- Hero section premium -->
<section class="relative flex min-h-[90vh] w-full flex-col justify-center overflow-hidden bg-white pt-24 pb-24 md:min-h-screen md:pt-32 md:pb-32">
	<div class="absolute inset-0 h-full w-full bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent"></div>
	
	<div class="relative z-10 mx-auto max-w-2xl px-6 sm:px-8 lg:px-12">
		{#if signupDisabled}
			<div class="mb-8 text-center">
				<Alert.Root class="mb-6" variant="destructive">
					<Alert.Title>Inscriptions temporairement désactivées</Alert.Title>
					<Alert.Description>
						Nous sommes désolés, mais l&apos;inscription de nouveaux utilisateurs est
						actuellement désactivée. Réessaie plus tard ou contacte le support pour
						obtenir de l&apos;aide.
					</Alert.Description>
				</Alert.Root>
				<p class="text-center text-sm text-neutral-600">
					Tu as déjà un compte ? <a href="/login" class="text-[#FF6F61] underline transition-colors hover:text-[#e85a4f]">Se connecter</a>.
				</p>
			</div>
		{:else}
			<!-- Header minimaliste -->
			<div class="mb-12 text-center">
				<h1
					bind:this={heroTitle}
					class="mb-6 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Crée ton compte <span class="text-[#FF6F61]">Pattyly</span>
				</h1>
				<p
					bind:this={heroContent}
					class="mx-auto max-w-xl text-lg leading-[180%] text-neutral-600 sm:text-xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Commence à gérer ton activité de cake designer en ligne. Version gratuite disponible, sans engagement.
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
							<RegisterForm data={data.form} />
							<div class="text-center text-sm text-neutral-600">
								Tu as déjà un compte ?
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
		{/if}
	</div>
</section>
