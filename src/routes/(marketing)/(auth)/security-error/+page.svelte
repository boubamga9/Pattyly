<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { WebsiteName } from '../../../../config';
	import { revealElement } from '$lib/utils/animations';
	import { AlertTriangle } from 'lucide-svelte';

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
	<title>Erreur de sécurité - Compte déconnecté | {WebsiteName}</title>
	<meta
		name="description"
		content="Mot de passe actuel incorrect - Vous avez été déconnecté pour protéger votre compte. Reconnecte-toi ou réinitialise ton mot de passe pour récupérer l'accès à ton compte Pattyly."
	/>
	<meta
		name="keywords"
		content="erreur sécurité pattyly, compte déconnecté, mot de passe incorrect, réinitialiser mot de passe, sécurité compte cake designer"
	/>
	<meta property="og:title" content="Erreur de sécurité - Compte déconnecté | {WebsiteName}" />
	<meta
		property="og:description"
		content="Mot de passe actuel incorrect - Vous avez été déconnecté pour protéger votre compte."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/security-error" />
	<link rel="canonical" href="https://pattyly.com/security-error" />
</svelte:head>

<!-- Hero section premium -->
<section class="relative flex min-h-[90vh] w-full flex-col justify-center overflow-hidden bg-white pt-24 pb-24 md:min-h-screen md:pt-32 md:pb-32">
	<div class="absolute inset-0 h-full w-full bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent"></div>
	
	<div class="relative z-10 mx-auto max-w-2xl px-6 sm:px-8 lg:px-12">
		<!-- Header minimaliste -->
		<div class="mb-12 text-center">
			<div
				class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100"
			>
				<AlertTriangle class="h-10 w-10 text-red-600" />
			</div>
			<h1
				bind:this={heroTitle}
				class="mb-6 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl"
				style="font-weight: 600; letter-spacing: -0.03em;"
			>
				Erreur de <span class="text-red-600">sécurité</span>
			</h1>
			<p
				bind:this={heroContent}
				class="mx-auto max-w-xl text-lg leading-[180%] text-neutral-600 sm:text-xl"
				style="font-weight: 300; letter-spacing: -0.01em;"
			>
				Tu as tenté de modifier ton compte avec un mot de passe actuel incorrect et tu as été déconnecté pour protéger ton compte.
			</p>
		</div>

		<!-- Card avec contenu -->
		<div bind:this={cardContainer}>
			<Card.Root
				class="mx-auto rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur-sm shadow-xl"
			>
				<Card.Content class="p-8 sm:p-10">
					<div class="space-y-6">
						<!-- Message de sécurité -->
						<div class="rounded-xl bg-red-50 p-4 text-center">
							<p class="text-sm text-red-700">
								🔒 <strong>Sécurité :</strong> Cette mesure protège ton compte contre les modifications non autorisées.
							</p>
						</div>

						<!-- Actions -->
						<div class="space-y-3">
							<a
								href="/login"
								class="flex h-12 w-full items-center justify-center rounded-xl bg-[#FF6F61] text-base font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl"
							>
								Se reconnecter
							</a>
							<a
								href="/forgot-password"
								class="flex h-12 w-full items-center justify-center rounded-xl border border-neutral-300 bg-white text-base font-medium text-neutral-700 transition-all duration-300 hover:border-neutral-400 hover:bg-neutral-50"
							>
								Réinitialiser le mot de passe
							</a>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</section>
