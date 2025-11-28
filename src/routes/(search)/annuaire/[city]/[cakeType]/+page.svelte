<script lang="ts">
	import { onMount } from 'svelte';
	import { WebsiteName } from '$src/config';
	import { revealElement, revealStagger } from '$lib/utils/animations';
	import { Button } from '$lib/components/ui/button';
	import { MapPin, Search } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';

	export let data: {
		city: string;
		cityName: string;
		cakeType: string;
		cakeTypeName: string;
		cakeTypeInfo: {
			name: string;
			keywords: string[];
			description: string;
		};
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

	// Récupérer les données depuis le serveur
	$: cityParam = data.city || '';
	$: cakeTypeParam = data.cakeType || '';
	$: cakeTypeName = data.cakeTypeName || '';
	$: cakeTypeInfo = data.cakeTypeInfo || null;
	$: cityName = data.cityName || cityParam.charAt(0).toUpperCase() + cityParam.slice(1);
	
	// Fonction pour obtenir le titre d'affichage du type de gâteau
	function getDisplayTitle(typeName: string): string {
		if (typeName === 'Mignardise') {
			return 'Box mignardises';
		}
		return typeName;
	}
	
	$: displayTitle = getDisplayTitle(cakeTypeName);

	onMount(async () => {
		// Schema.org LocalBusiness (pour chaque ville)
		const localBusinessSchema = {
			'@context': 'https://schema.org',
			'@type': 'LocalBusiness',
			name: `Cake designers spécialisés en ${cakeTypeName} à ${cityName}`,
			description: `Trouve les meilleurs cake designers spécialisés en ${cakeTypeName.toLowerCase()} à ${cityName}. ${cakeTypeInfo?.description || ''}`,
			address: {
				'@type': 'PostalAddress',
				addressLocality: cityName,
				addressCountry: 'FR'
			},
			url: `https://pattyly.com/annuaire/${cityParam}/${cakeTypeParam}`,
			areaServed: {
				'@type': 'City',
				name: cityName
			}
		};

		// Schema.org Product
		const productSchema = {
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: `${cakeTypeName} à ${cityName}`,
			description: `${cakeTypeInfo?.description || ''} Découvre les cake designers spécialisés à ${cityName}.`,
			category: cakeTypeName,
			brand: {
				'@type': 'Brand',
				name: 'Pattyly'
			},
			offers: {
				'@type': 'AggregateOffer',
				priceCurrency: 'EUR',
				availability: 'https://schema.org/InStock',
				url: `https://pattyly.com/annuaire/${cityParam}/${cakeTypeParam}`
			}
		};

		// Schema.org BreadcrumbList
		const breadcrumbSchema = {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Accueil',
					item: 'https://pattyly.com'
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'Annuaire',
					item: 'https://pattyly.com/annuaire'
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: cityName,
					item: `https://pattyly.com/annuaire/${cityParam}`
				},
				{
					'@type': 'ListItem',
					position: 4,
					name: cakeTypeName,
					item: `https://pattyly.com/annuaire/${cityParam}/${cakeTypeParam}`
				}
			]
		};

		// Schema.org ItemList (pour les résultats) - sera mis à jour après le filtrage
		const itemListSchema = {
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: `Cake designers ${cakeTypeName} à ${cityName}`,
			description: `Liste des cake designers spécialisés en ${cakeTypeName.toLowerCase()} à ${cityName}`,
			numberOfItems: 0,
			itemListElement: []
		};

		// Ajouter les schemas
		const localBusinessScript = document.createElement('script');
		localBusinessScript.type = 'application/ld+json';
		localBusinessScript.text = JSON.stringify(localBusinessSchema);
		localBusinessScript.id = 'localbusiness-schema';
		document.head.appendChild(localBusinessScript);

		const productScript = document.createElement('script');
		productScript.type = 'application/ld+json';
		productScript.text = JSON.stringify(productSchema);
		productScript.id = 'product-schema';
		document.head.appendChild(productScript);

		const breadcrumbScript = document.createElement('script');
		breadcrumbScript.type = 'application/ld+json';
		breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
		breadcrumbScript.id = 'breadcrumb-schema';
		document.head.appendChild(breadcrumbScript);

		const itemListScript = document.createElement('script');
		itemListScript.type = 'application/ld+json';
		itemListScript.text = JSON.stringify(itemListSchema);
		itemListScript.id = 'itemlist-schema';
		document.head.appendChild(itemListScript);

		// Animations
		if (heroTitle) await revealElement(heroTitle, { delay: 0, duration: 0.5 });
		if (searchContainer) await revealElement(searchContainer, { delay: 0.1, duration: 0.5 });
		if (resultsContainer) await revealStagger(resultsContainer, ':scope > div', { delay: 0.1, stagger: 0.05 });

		return () => {
			const localBusinessEl = document.getElementById('localbusiness-schema');
			if (localBusinessEl) document.head.removeChild(localBusinessEl);
			const productEl = document.getElementById('product-schema');
			if (productEl) document.head.removeChild(productEl);
			const breadcrumbEl = document.getElementById('breadcrumb-schema');
			if (breadcrumbEl) document.head.removeChild(breadcrumbEl);
			const itemListEl = document.getElementById('itemlist-schema');
			if (itemListEl) document.head.removeChild(itemListEl);
		};
	});

	// Afficher directement tous les résultats triés (vérifiés en premier)
	$: filteredDesigners = [...cakeDesigners].sort((a, b) => {
		if (a.isPremium && !b.isPremium) return -1;
		if (!a.isPremium && b.isPremium) return 1;
		return a.name.localeCompare(b.name);
	});

	// Mettre à jour le Schema.org ItemList quand les résultats changent
	$: if (typeof document !== 'undefined' && filteredDesigners) {
		const itemListEl = document.getElementById('itemlist-schema');
		if (itemListEl) {
			const itemListSchema = {
				'@context': 'https://schema.org',
				'@type': 'ItemList',
				name: `Cake designers ${cakeTypeName} à ${cityName}`,
				description: `Liste des cake designers spécialisés en ${cakeTypeName.toLowerCase()} à ${cityName}`,
				numberOfItems: filteredDesigners.length,
				itemListElement: filteredDesigners.map((designer, index) => ({
					'@type': 'ListItem',
					position: index + 1,
					name: designer.name,
					url: `https://pattyly.com/${designer.slug}`
				}))
			};
			itemListEl.textContent = JSON.stringify(itemListSchema);
		}
	}

	function clearFilters() {
		selectedCakeType = cakeTypeParam; // Garder le type de l'URL
		searchQuery = '';
	}
</script>

<svelte:head>
	<title>{cakeTypeName} {cityName} - Cake designers spécialisés | {WebsiteName}</title>
	<meta
		name="description"
		content="Trouve les meilleurs cake designers spécialisés en {cakeTypeName.toLowerCase()} à {cityName}. Recherche et commande en ligne. Créations personnalisées."
	/>
	<meta
		name="keywords"
		content="{cakeTypeInfo?.keywords.join(', ') || cakeTypeName.toLowerCase()}, {cityName.toLowerCase()}, cake designer {cityName}, {cakeTypeName.toLowerCase()} {cityName}"
	/>
	<meta property="og:title" content="{cakeTypeName} {cityName} - Cake designers spécialisés | {WebsiteName}" />
	<meta
		property="og:description"
		content="Trouve les meilleurs cake designers spécialisés en {cakeTypeName.toLowerCase()} à {cityName}."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/annuaire/{cityParam}/{cakeTypeParam}" />
	<link rel="canonical" href="https://pattyly.com/annuaire/{cityParam}/{cakeTypeParam}" />
</svelte:head>

<div class="flex flex-col">
	<!-- Hero section -->
	<section class="relative overflow-hidden bg-white pt-24 pb-16 sm:pt-32 sm:pb-24 md:pt-40 md:pb-32">
		<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/20 via-transparent to-transparent"></div>

		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-12 text-center">
				<h1
					bind:this={heroTitle}
					class="mb-6 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					{displayTitle} à <span class="text-[#FF6F61]">{cityName}</span>
					<br />
					et aux alentours
				</h1>
				<p
					class="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl"
					style="font-weight: 300;"
				>
					{cakeTypeInfo?.description || ''} Découvre les meilleurs cake designers spécialisés en {cakeTypeName.toLowerCase()} à {cityName} et commande directement depuis leur boutique en ligne.
				</p>
				<!-- Bouton vers l'annuaire pour recherche plus précise -->
				<div class="mt-6">
					<Button
						href="/annuaire?city={data.city}&type={data.cakeType}"
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
						Aucun cake designer trouvé pour {cakeTypeName.toLowerCase()} aux alentours de {cityName}
					{:else if filteredDesigners.length === 1}
						1 cake designer spécialisé en {cakeTypeName.toLowerCase()} aux alentours de {cityName}
					{:else}
						{filteredDesigners.length} cake designers spécialisés en {cakeTypeName.toLowerCase()} aux alentours de {cityName}
					{/if}
				</p>
			</div>

			<!-- Grille de résultats -->
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
								href="/{designer.slug}"
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
					<p class="mb-2 text-xl font-semibold text-neutral-900">
						Aucun résultat trouvé pour {cakeTypeName.toLowerCase()} à {cityName}
					</p>
					<p class="mb-8 text-neutral-600">Aucun cake designer ne correspond à ta recherche.</p>
					<Button
						href="/annuaire/{cityParam}"
						class="rounded-xl bg-[#FF6F61] px-8 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#e85a4f] hover:shadow-xl"
					>
						Voir tous les cake designers à {cityName}
					</Button>
				</div>
			{/if}
		</div>
	</section>

	<!-- Related pages section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-white via-[#FFE8D6]/10 to-white py-16 sm:py-20 md:py-24">
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-12 text-center">
				<h2
					class="mb-4 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Explore aussi
				</h2>
			</div>

			<div class="grid gap-6 sm:grid-cols-2">
				<!-- Autres types de gâteaux dans la même ville -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-neutral-900">Autres types de gâteaux à {cityName}</h3>
					<div class="space-y-2">
						{#if cakeTypeParam !== 'gateau-anniversaire'}
							<a
								href="/annuaire/{cityParam}/gateau-anniversaire"
								class="block rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700 transition-all duration-200 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:text-[#FF6F61]"
							>
								🎂 Gâteau d'anniversaire à {cityName}
							</a>
						{/if}
						{#if cakeTypeParam !== 'gateau-mariage'}
							<a
								href="/annuaire/{cityParam}/gateau-mariage"
								class="block rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700 transition-all duration-200 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:text-[#FF6F61]"
							>
								💍 Gâteau de mariage à {cityName}
							</a>
						{/if}
						{#if cakeTypeParam !== 'cupcakes'}
							<a
								href="/annuaire/{cityParam}/cupcakes"
								class="block rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700 transition-all duration-200 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:text-[#FF6F61]"
							>
								🧁 Cupcakes à {cityName}
							</a>
						{/if}
						<a
							href="/annuaire/{cityParam}"
							class="block rounded-lg border border-neutral-200 bg-white p-4 text-sm font-medium text-[#FF6F61] transition-all duration-200 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20"
						>
							Voir tous les types à {cityName} →
						</a>
					</div>
				</div>

				<!-- Même type dans d'autres villes -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-neutral-900">{cakeTypeName} dans d'autres villes</h3>
					<div class="space-y-2">
						{#if cityParam !== 'paris'}
							<a
								href="/annuaire/paris/{cakeTypeParam}"
								class="block rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700 transition-all duration-200 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:text-[#FF6F61]"
							>
								📍 {cakeTypeName} à Paris
							</a>
						{/if}
						{#if cityParam !== 'lyon'}
							<a
								href="/annuaire/lyon/{cakeTypeParam}"
								class="block rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700 transition-all duration-200 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:text-[#FF6F61]"
							>
								📍 {cakeTypeName} à Lyon
							</a>
						{/if}
						{#if cityParam !== 'marseille'}
							<a
								href="/annuaire/marseille/{cakeTypeParam}"
								class="block rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700 transition-all duration-200 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:text-[#FF6F61]"
							>
								📍 {cakeTypeName} à Marseille
							</a>
						{/if}
						<a
							href="/annuaire"
							class="block rounded-lg border border-neutral-200 bg-white p-4 text-sm font-medium text-[#FF6F61] transition-all duration-200 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20"
						>
							Voir toutes les villes →
						</a>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>

