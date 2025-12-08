<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { WebsiteName } from '$src/config';
	import { revealElement, revealStagger } from '$lib/utils/animations';
	import { Button } from '$lib/components/ui/button';
	import { MapPin, Search } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';

	export let data: {
		city: string;
		cityName: string;
		shops: Array<{
			id: string;
			name: string;
			slug: string;
			city: string;
			postalCode: string;
			specialties: string[];
			logo: string;
			isPremium?: boolean;
		}>;
	};

	let heroTitle: HTMLElement;
	let resultsContainer: HTMLElement;

	// Utiliser les données du serveur
	$: cakeDesigners = data.shops || [];

	// Récupérer la ville depuis l'URL
	$: cityParam = data.city || '';
	$: cityName = data.cityName || cityParam.charAt(0).toUpperCase() + cityParam.slice(1);

	onMount(async () => {
		// Animations
		if (heroTitle) await revealElement(heroTitle, { delay: 0, duration: 0.5 });
		// Ne faire l'animation que s'il y a des résultats
		if (resultsContainer && filteredDesigners.length > 0) {
			await revealStagger(resultsContainer, ':scope > div', { delay: 0.1, stagger: 0.05 });
		}
	});

	// Afficher directement tous les résultats triés (vérifiés en premier)
	$: filteredDesigners = [...cakeDesigners].sort((a, b) => {
		if (a.isPremium && !b.isPremium) return -1;
		if (!a.isPremium && b.isPremium) return 1;
		return a.name.localeCompare(b.name);
	});
</script>

<svelte:head>
	<title>Cake designer {cityName} - Annuaire de pâtissiers | {WebsiteName}</title>
	<meta
		name="description"
		content="Trouve les meilleurs cake designers à {cityName}. Recherche par type de gâteau et découvre leurs boutiques en ligne. Commandes directes, paiement sécurisé."
	/>
	<meta
		name="keywords"
		content="cake designer {cityName}, pâtissier {cityName}, gâteau personnalisé {cityName}, annuaire cake designer {cityName}"
	/>
	<meta
		property="og:title"
		content="Cake designer {cityName} - Annuaire de pâtissiers | {WebsiteName}"
	/>
	<meta
		property="og:description"
		content="Trouve les meilleurs cake designers à {cityName}. Recherche par type de gâteau et découvre leurs boutiques en ligne."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/annuaire/{data.city}" />
	<link rel="canonical" href="https://pattyly.com/annuaire/{cityParam}" />
</svelte:head>

<div class="flex flex-col">
	<!-- Hero section premium -->
	<section class="relative overflow-hidden bg-white pt-24 pb-16 sm:pt-32 sm:pb-24 md:pt-40 md:pb-32">
		<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/20 via-transparent to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-12 text-center">
				<h1
					bind:this={heroTitle}
					class="mb-6 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Cake designers à <span class="text-[#FF6F61]">{cityName}</span>
					<br />
					et aux alentours
				</h1>
				<p
					class="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl"
					style="font-weight: 300;"
				>
					Découvre les meilleurs pâtissiers à {cityName} et commande directement depuis leur boutique en ligne.
				</p>
				<!-- Bouton vers l'annuaire pour recherche plus précise -->
				<div class="mt-6">
					<Button
						href="/annuaire?city={data.city}"
						class="inline-flex items-center gap-2 rounded-full bg-[#FF6F61] px-6 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#e85a4f] hover:shadow-xl"
								>
						<Search class="h-4 w-4" />
						Recherche plus précise
					</Button>
					</div>
			</div>
		</div>
	</section>

	<!-- Résultats -->
	<section class="relative overflow-hidden bg-white pt-2 pb-12 sm:pt-4 sm:pb-16 md:pb-24">
		<div class="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
			<!-- Compteur de résultats -->
			<div class="mb-10">
					<p class="text-base font-medium text-neutral-700">
						{#if filteredDesigners.length === 0}
						Aucun résultat trouvé aux alentours de {cityName}
						{:else if filteredDesigners.length === 1}
						1 cake designer trouvé aux alentours de {cityName}
						{:else}
						{filteredDesigners.length} cake designers trouvés aux alentours de {cityName}
					{/if}
				</p>
			</div>

			<!-- Grille de résultats premium -->
			<div bind:this={resultsContainer} class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredDesigners as designer}
					<Card.Root class="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all duration-300 hover:scale-[1.02] hover:border-[#FF6F61]/50 hover:shadow-xl">
						{#if designer.isPremium}
							<div class="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 shadow-md backdrop-blur-sm">
								<svg
									class="h-4 w-4 shrink-0"
									viewBox="0 0 22 22"
									aria-label="Compte vérifié"
									fill="none"
								>
									<circle cx="11" cy="11" r="10" fill="#FF6F61" />
									<path
										d="M6.5 11l2.5 2.5 5-5"
										stroke="white"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								<span class="text-xs font-medium text-[#FF6F61]">Vérifié</span>
							</div>
						{/if}
						<div class="flex items-center justify-center bg-gradient-to-br from-[#FFE8D6]/20 to-white p-8">
							<div class="relative h-24 w-24 overflow-hidden rounded-full bg-white p-3 shadow-md transition-transform duration-300 group-hover:scale-110">
								<img
									src={designer.logo}
									alt={designer.name}
									class="h-full w-full object-contain"
								/>
							</div>
						</div>
						<Card.Content class="p-6">
							<div class="mb-4">
								<h3 class="mb-2 text-xl font-semibold text-neutral-900">{designer.name}</h3>
								<div class="flex items-center gap-2 text-sm text-neutral-600">
									<MapPin class="h-4 w-4" />
									<span>{designer.city}</span>
								</div>
							</div>
							<div class="mb-6 flex flex-wrap gap-2">
								{#each designer.specialties.slice(0, 3) as specialty}
									<span
										class="rounded-full bg-[#FFE8D6]/50 px-3 py-1.5 text-xs font-medium text-neutral-700"
									>
										{specialty}
									</span>
								{/each}
							</div>
							<Button
								href="/{designer.slug}?from=app"
								class="w-full rounded-xl bg-[#FF6F61] px-6 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#e85a4f] hover:shadow-xl"
							>
								Voir la boutique
							</Button>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<!-- Message si aucun résultat -->
			{#if filteredDesigners.length === 0}
				<div class="py-20 text-center">
					<div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFE8D6]/30">
						<Search class="h-8 w-8 text-[#FF6F61]" />
					</div>
					<p class="mb-2 text-xl font-semibold text-neutral-900">Aucun résultat trouvé aux alentours de {cityName}</p>
					<p class="mb-8 text-neutral-600">Aucun cake designer ne correspond à tes critères de recherche.</p>
					<Button
						href="/annuaire"
						class="rounded-xl bg-[#FF6F61] px-8 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#e85a4f] hover:shadow-xl"
					>
						Recherche plus précise
					</Button>
				</div>
			{/if}
		</div>
	</section>
</div>

