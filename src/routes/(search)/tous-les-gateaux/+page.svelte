<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { WebsiteName } from '$src/config';
	import { revealStagger } from '$lib/utils/animations';
	import { Button } from '$lib/components/ui/button';
	import { MapPin, Cake, ChevronDown, ChevronUp } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import CityAutocomplete from '$lib/components/ui/city-autocomplete.svelte';
	import RadiusSlider from '$lib/components/ui/radius-slider.svelte';
	import {
		searchCities,
		type CitySuggestion,
	} from '$lib/services/city-autocomplete';

	// ✅ Tracking: Page view côté client (tous-les-gateaux page)
	onMount(() => {
		import('$lib/utils/analytics').then(({ logPageView }) => {
			const supabase = $page.data.supabase;
			logPageView(supabase, {
				page: '/tous-les-gateaux'
			}).catch((err: unknown) => {
				console.error('Error tracking page_view:', err);
			});
		});
	});

	export let data: {
		products: Array<{
			id: string;
			name: string;
			description: string | null;
			image_url: string | null;
			base_price: number;
			cake_type: string | null;
			shop: {
				id: string;
				name: string;
				slug: string;
				logo_url: string | null;
				city: string;
				actualCity: string;
				postalCode: string;
				isPremium?: boolean;
				latitude?: number | null;
				longitude?: number | null;
			};
			distance?: number | null;
		}>;
		pagination?: {
			page: number;
			limit: number;
			total: number;
			hasMore: boolean;
		};
	};

	let resultsContainer: HTMLElement;

	// Utiliser les données du serveur (première page)
	let displayedProducts = data.products || [];
	let currentPage = data.pagination?.page || 1;
	let hasMore = data.pagination?.hasMore || false;
	let isLoadingMore = false;
	let sentinelElement: HTMLElement;

	// Filtres
	let selectedCitySuggestion: CitySuggestion | null = null;
	let selectedCakeType = '';
	let searchRadius = 30; // Rayon par défaut en km
	let filtersExpanded = true;
	let showOnlyVerified = false; // Filtre pour afficher uniquement les gâteaux des pâtissiers vérifiés

	const cakeTypes = [
		"Gâteau d'anniversaire",
		'Gâteau de mariage',
		'Cupcakes',
		'Macarons',
		'Gâteau personnalisé',
		'Gâteau pour événement',
		'Gâteau vegan',
		'Gâteau sans gluten',
		'Pâtisserie orientale',
		'Traiteur événementiel',
		'Mignardise',
	];

	// Mapping des types de gâteaux vers leurs slugs URL
	const cakeTypeToSlug: Record<string, string> = {
		"gâteau d'anniversaire": 'gateau-anniversaire',
		"gateau d'anniversaire": 'gateau-anniversaire',
		'gâteau de mariage': 'gateau-mariage',
		'gateau de mariage': 'gateau-mariage',
		cupcakes: 'cupcakes',
		macarons: 'macarons',
		'gâteau personnalisé': 'gateau-personnalise',
		'gateau personnalisé': 'gateau-personnalise',
		'gâteau personnalise': 'gateau-personnalise',
		'gâteau pour événement': 'gateau-evenement',
		'gateau pour événement': 'gateau-evenement',
		'gâteau pour evenement': 'gateau-evenement',
		'gâteau vegan': 'gateau-vegan',
		'gateau vegan': 'gateau-vegan',
		'gâteau sans gluten': 'gateau-sans-gluten',
		'gateau sans gluten': 'gateau-sans-gluten',
		'pâtisserie orientale': 'patisserie-orientale',
		'patisserie orientale': 'patisserie-orientale',
		'traiteur événementiel': 'traiteur-evenementiel',
		'traiteur evenementiel': 'traiteur-evenementiel',
		mignardise: 'mignardise',
	};

	// Fonction pour initialiser les filtres depuis l'URL
	async function initializeFiltersFromUrl() {
		const currentUrlCity = $page.url.searchParams.get('city') || '';
		const currentUrlCakeType = $page.url.searchParams.get('type') || '';

		// Réinitialiser la ville si présente dans l'URL
		if (currentUrlCity) {
			const cityResults = await searchCities(currentUrlCity, 5);
			if (cityResults.length > 0) {
				selectedCitySuggestion = cityResults[0];
			}
		} else {
			selectedCitySuggestion = null;
		}

		// Réinitialiser le type de gâteau si présent dans l'URL
		if (currentUrlCakeType) {
			const slugToCakeType: Record<string, string> = {
				'gateau-anniversaire': "gâteau d'anniversaire",
				'gateau-mariage': 'gâteau de mariage',
				cupcakes: 'cupcakes',
				macarons: 'macarons',
				'gateau-personnalise': 'gâteau personnalisé',
				'gateau-evenement': 'gâteau pour événement',
				'gateau-vegan': 'gâteau vegan',
				'gateau-sans-gluten': 'gâteau sans gluten',
				'patisserie-orientale': 'pâtisserie orientale',
				'traiteur-evenementiel': 'traiteur événementiel',
				mignardise: 'mignardise',
			};

			const cakeTypeName = slugToCakeType[currentUrlCakeType.toLowerCase()];
			if (cakeTypeName) {
				selectedCakeType = cakeTypeName.toLowerCase();
			}
		} else {
			selectedCakeType = '';
		}
	}

	/**
	 * Calcule la distance entre deux points GPS en kilomètres (formule de Haversine)
	 */
	function calculateDistance(
		lat1: number,
		lon1: number,
		lat2: number,
		lon2: number,
	): number {
		const R = 6371; // Rayon de la Terre en km
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLon = ((lon2 - lon1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	/**
	 * Géocode une ville avec code postal (utilise Nominatim comme fallback)
	 */
	async function geocodeCity(
		cityName: string,
		postalCode?: string,
	): Promise<[number, number] | null> {
		try {
			const query = postalCode
				? `${postalCode} ${cityName}, France`
				: `${cityName}, France`;

			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=fr`,
				{
					headers: {
						'User-Agent': 'Pattyly/1.0',
					},
				},
			);

			if (!response.ok) return null;

			const data = await response.json();
			if (data && data.length > 0) {
				return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
			}
		} catch (error) {
			console.error('Erreur de géocodage:', error);
		}
		return null;
	}

	// Cache pour les coordonnées géocodées (évite de refaire les appels API)
	const geocodedCache = new Map<string, [number, number]>();

	// Filtrer les produits avec rayon de recherche (fallback côté client)
	let filteredProductsSync: typeof displayedProducts = displayedProducts;
	let isLoadingFilter = false;
	let filterTimeout: ReturnType<typeof setTimeout> | null = null;
	let isFiltering = false;

	async function filterProducts() {
		// Éviter les appels multiples simultanés
		if (isFiltering) {
			return;
		}

		// Annuler le timeout précédent si existe
		if (filterTimeout) {
			clearTimeout(filterTimeout);
			filterTimeout = null;
		}

		try {
			isFiltering = true;
			isLoadingFilter = true;
			let filtered = [...displayedProducts];

			// Filtre par type de gâteau
			if (selectedCakeType) {
				filtered = filtered.filter(
					(product) =>
						product.cake_type?.toLowerCase() === selectedCakeType.toLowerCase(),
				);
			}

			// Filtre par pâtissiers vérifiés
			if (showOnlyVerified) {
				filtered = filtered.filter(
					(product) => product.shop.isPremium === true,
				);
			}

			// Filtre par rayon si une ville est sélectionnée
			if (selectedCitySuggestion?.coordinates) {
				const [centerLat, centerLon] = [
					selectedCitySuggestion.coordinates.lat,
					selectedCitySuggestion.coordinates.lon,
				];

				// Filtrer par distance (on géocode chaque shop si nécessaire)
				const filteredByRadius = await Promise.all(
					filtered.map(async (product) => {
						const cacheKey = `${product.shop.actualCity || product.shop.city}_${product.shop.postalCode || ''}`;

						// Vérifier le cache
						let shopCoords: [number, number] | null =
							geocodedCache.get(cacheKey) || null;

						if (!shopCoords) {
							// Géocoder si pas en cache
							shopCoords = await geocodeCity(
								product.shop.actualCity || product.shop.city,
								product.shop.postalCode || undefined,
							);

							if (shopCoords) {
								geocodedCache.set(cacheKey, shopCoords);
							}
						}

						if (!shopCoords) {
							// Si on ne peut pas géocoder, on inclut quand même (fallback)
							return { product, distance: null };
						}

						const distance = calculateDistance(
							centerLat,
							centerLon,
							shopCoords[0],
							shopCoords[1],
						);

						return { product, distance };
					}),
				);

				// Filtrer ceux qui sont dans le rayon
				filtered = filteredByRadius
					.filter(
						(item) => item.distance === null || item.distance <= searchRadius,
					)
					.map((item) => item.product);
			}

			// Trier : vérifiés en premier, puis par nom de produit
			filtered.sort((a, b) => {
				if (a.shop.isPremium && !b.shop.isPremium) return -1;
				if (!a.shop.isPremium && b.shop.isPremium) return 1;
				return a.name.localeCompare(b.name);
			});

			// S'assurer que filtered est toujours un tableau
			filteredProductsSync = Array.isArray(filtered) ? filtered : [];
			isLoadingFilter = false;
			isFiltering = false;
		} catch (error) {
			console.error('Erreur lors du filtrage:', error);
			// En cas d'erreur, afficher tous les résultats ou un tableau vide
			filteredProductsSync = [];
			isLoadingFilter = false;
			isFiltering = false;
		}
	}

	// Réactif aux changements de filtres (inclut searchRadius et showOnlyVerified pour déclencher le filtrage)
	$: {
		const hasFilters =
			selectedCitySuggestion || selectedCakeType || showOnlyVerified;
		// Inclure searchRadius et showOnlyVerified dans les dépendances pour déclencher le filtrage
		const _currentRadius = searchRadius;
		const _currentVerified = showOnlyVerified;

		if (hasFilters) {
			// Debounce plus long pour le slider (300ms) pour éviter trop d'appels pendant le glissement
			if (filterTimeout) {
				clearTimeout(filterTimeout);
			}
			filterTimeout = setTimeout(() => {
				filterProducts();
			}, 300);
		} else {
			if (filterTimeout) {
				clearTimeout(filterTimeout);
				filterTimeout = null;
			}
			// Trier : vérifiés en premier, puis par nom de produit
			const sorted = [...displayedProducts].sort((a, b) => {
				if (a.shop.isPremium && !b.shop.isPremium) return -1;
				if (!a.shop.isPremium && b.shop.isPremium) return 1;
				return a.name.localeCompare(b.name);
			});
			filteredProductsSync = sorted;
			isLoadingFilter = false;
			isFiltering = false;
		}
	}

	// Utiliser filteredProductsSync pour l'affichage (fallback côté client)
	$: filteredProducts = filteredProductsSync || displayedProducts;

	function clearFilters() {
		selectedCitySuggestion = null;
		selectedCakeType = '';
		searchRadius = 30;
		showOnlyVerified = false;
		updateUrl();
	}

	function handleCitySelect(city: CitySuggestion | null) {
		selectedCitySuggestion = city;
		updateUrl();
	}

	// Mettre à jour l'URL avec les filtres actuels (pour partager)
	function updateUrl() {
		if (typeof window === 'undefined') return;

		const params = new URLSearchParams();

		// Ajouter la ville si sélectionnée
		if (selectedCitySuggestion) {
			// Utiliser le nom de la ville en minuscules comme slug
			params.set('city', selectedCitySuggestion.city.toLowerCase());
		}

		// Ajouter le type de gâteau si sélectionné
		if (selectedCakeType) {
			const cakeTypeSlug = cakeTypeToSlug[selectedCakeType.toLowerCase()];
			if (cakeTypeSlug) {
				params.set('type', cakeTypeSlug);
			}
		}

		// Mettre à jour l'URL sans recharger la page
		const queryString = params.toString();
		const newUrl = queryString
			? `/tous-les-gateaux?${queryString}`
			: '/tous-les-gateaux';
		window.history.replaceState({}, '', newUrl);
	}

	// Fonction pour charger la page suivante
	async function loadNextPage() {
		if (isLoadingMore || !hasMore) return;

		isLoadingMore = true;
		const nextPage = currentPage + 1;

		try {
			// Construire l'URL de l'API avec les filtres actuels
			const params = new URLSearchParams();
			if (selectedCitySuggestion) {
				params.set('city', selectedCitySuggestion.city.toLowerCase());
			}
			if (selectedCakeType) {
				const cakeTypeSlug = cakeTypeToSlug[selectedCakeType.toLowerCase()];
				if (cakeTypeSlug) {
					params.set('type', cakeTypeSlug);
				}
			}
			if (selectedCitySuggestion?.coordinates) {
				params.set('lat', selectedCitySuggestion.coordinates.lat.toString());
				params.set('lon', selectedCitySuggestion.coordinates.lon.toString());
				params.set('radius', searchRadius.toString());
			}
			if (showOnlyVerified) {
				params.set('verified', 'true');
			}
			params.set('page', nextPage.toString());

			const response = await fetch(`/tous-les-gateaux/api?${params.toString()}`);
			if (!response.ok) throw new Error('Failed to load next page');

			const result = await response.json();
			
			// Ajouter les nouveaux produits à la liste
			displayedProducts = [...displayedProducts, ...result.products];
			currentPage = result.pagination.page;
			hasMore = result.pagination.hasMore;

			// Animations pour les nouveaux éléments
			if (resultsContainer) {
				await revealStagger(resultsContainer, ':scope > div', { delay: 0.1, stagger: 0.05 });
			}
		} catch (error) {
			console.error('Erreur lors du chargement de la page suivante:', error);
		} finally {
			isLoadingMore = false;
		}
	}

	onMount(async () => {
		// Initialiser avec les paramètres de l'URL
		await initializeFiltersFromUrl();

		// Si une ville est sélectionnée, appeler handleCitySelect pour déclencher le filtrage
		if (selectedCitySuggestion) {
			handleCitySelect(selectedCitySuggestion);
		}

		// Animations initiales
		if (resultsContainer) {
			await revealStagger(resultsContainer, ':scope > div', {
				delay: 0.1,
				stagger: 0.05,
			});
		}

		// Configurer l'Intersection Observer pour infinite scroll
		if (typeof IntersectionObserver !== 'undefined' && sentinelElement) {
			const observer = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
						loadNextPage();
					}
				},
				{ rootMargin: '200px' }
			);

			observer.observe(sentinelElement);

			return () => {
				observer.disconnect();
			};
		}
	});

	// Réagir aux changements de navigation (pour gérer le bouton retour du navigateur)
	afterNavigate(async () => {
		// Si on est sur la page /tous-les-gateaux, réinitialiser les filtres depuis l'URL
		if ($page.url.pathname === '/tous-les-gateaux') {
			await initializeFiltersFromUrl();
		}
	});

	function toggleFilters() {
		filtersExpanded = !filtersExpanded;
	}
</script>

<svelte:head>
	<title>Tous les gâteaux - Catalogue complet | {WebsiteName}</title>
	<meta
		name="description"
		content="Découvre tous les gâteaux disponibles chez les meilleurs pâtissiers. Filtre par ville et type de gâteau pour trouver exactement ce que tu cherches."
	/>
	<meta
		property="og:title"
		content="Tous les gâteaux - Catalogue complet | {WebsiteName}"
	/>
	<meta
		property="og:description"
		content="Découvre tous les gâteaux disponibles chez les meilleurs pâtissiers."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/tous-les-gateaux" />
	<link rel="canonical" href="https://pattyly.com/tous-les-gateaux" />
</svelte:head>

<div class="flex flex-col">
	<!-- H1 masqué pour le SEO -->
	<h1 class="sr-only">
		Tous les gâteaux - Catalogue complet de pâtisseries | {WebsiteName}
	</h1>

	<!-- Barre de recherche et filtres en haut -->
	<section
		class="sticky top-0 z-40 border-b border-neutral-200 bg-white pt-20 shadow-sm"
	>
		<div
			class="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 {filtersExpanded
				? 'py-4'
				: 'py-2'}"
		>
			<div class="flex flex-col {filtersExpanded ? 'gap-4' : 'gap-2'}">
				<!-- Filtres horizontaux -->
				{#if filtersExpanded}
					<div class="flex flex-wrap items-center gap-4">
						<!-- Autocomplétion ville -->
						<div class="w-full sm:w-auto sm:min-w-[250px]">
							<CityAutocomplete
								value={selectedCitySuggestion?.label || ''}
								placeholder="Recherche une ville..."
								onSelect={handleCitySelect}
							/>
						</div>

						<!-- Slider de rayon -->
						{#if selectedCitySuggestion}
							<div class="w-full sm:w-auto sm:min-w-[200px]">
								<RadiusSlider
									value={searchRadius}
									min={1}
									max={50}
									step={1}
									onChange={(val) => {
										searchRadius = val;
									}}
								/>
							</div>
						{/if}

						<!-- Filtre "Notre sélection" (pâtissiers vérifiés) -->
						<button
							on:click={() => {
								showOnlyVerified = !showOnlyVerified;
							}}
							class="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 {showOnlyVerified
								? 'border-[#FF6F61] bg-[#FFE8D6]/30'
								: 'border-neutral-300 bg-white'}"
						>
							<span class="flex items-center gap-1.5">
								<svg
									class="h-4 w-4 shrink-0 {showOnlyVerified
										? 'text-[#FF6F61]'
										: 'text-neutral-400'}"
									viewBox="0 0 22 22"
									fill="none"
								>
									<circle
										cx="11"
										cy="11"
										r="10"
										fill={showOnlyVerified ? '#FF6F61' : 'currentColor'}
									/>
									<path
										d="M6.5 11l2.5 2.5 5-5"
										stroke="white"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								<span
									class={showOnlyVerified
										? 'text-[#FF6F61]'
										: 'text-neutral-700'}>Notre sélection de pâtissiers</span
								>
							</span>
						</button>

						<!-- Filtre par type de gâteau -->
						<div class="flex flex-wrap gap-2">
							{#each cakeTypes as cakeType}
								<Button
									variant={selectedCakeType === cakeType
										? 'default'
										: 'outline'}
									size="sm"
									on:click={() => {
										selectedCakeType =
											selectedCakeType === cakeType ? '' : cakeType;
									}}
									class="rounded-full"
								>
									<Cake class="mr-1 h-3.5 w-3.5" />
									{cakeType}
								</Button>
							{/each}
						</div>

						<!-- Bouton réinitialiser -->
						{#if selectedCitySuggestion || selectedCakeType || showOnlyVerified}
							<button
								on:click={clearFilters}
								class="ml-auto flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:text-[#FF6F61]"
							>
								Réinitialiser
							</button>
						{/if}
					</div>
				{/if}

				<!-- Bouton pour ouvrir/fermer les filtres -->
				<button
					on:click={toggleFilters}
					class="mx-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:text-[#FF6F61]"
					aria-label={filtersExpanded
						? 'Masquer les filtres'
						: 'Afficher les filtres'}
				>
					{#if filtersExpanded}
						<ChevronUp class="h-3.5 w-3.5" />
					{:else}
						<ChevronDown class="h-3.5 w-3.5" />
					{/if}
					<span class="text-xs"
						>{filtersExpanded
							? 'Masquer les filtres'
							: 'Afficher les filtres'}</span
					>
				</button>
			</div>
		</div>
	</section>

	<!-- Titre et résultats -->
	<section
		class="relative overflow-hidden bg-white py-8 pb-12 sm:py-12 sm:pb-16 md:py-16 md:pb-24"
	>
		<div class="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
			<!-- Titre visible -->
			<div class="mb-8">
				<h2 class="text-3xl font-semibold text-neutral-900 sm:text-4xl">
					Tous les <span class="text-[#FF6F61]">gâteaux</span>
				</h2>
				<p class="mt-2 text-base text-neutral-600">
					Découvre tous les gâteaux disponibles chez les meilleurs pâtissiers
				</p>
			</div>

			<!-- Compteur de résultats -->
			<div class="mb-10">
				{#if isLoadingFilter}
					<p class="text-base font-medium text-neutral-700">
						Recherche en cours...
					</p>
				{:else}
					<p class="text-base font-medium text-neutral-700">
						{#if displayedProducts.length === 0}
							{#if selectedCitySuggestion}
								Aucun gâteau trouvé dans un rayon de {searchRadius}km autour de {selectedCitySuggestion.city}
							{:else}
								Aucun gâteau trouvé
							{/if}
						{:else if data.pagination}
							{data.pagination.total} {data.pagination.total === 1 ? 'gâteau trouvé' : 'gâteaux trouvés'}
							{#if selectedCitySuggestion}
								<span class="text-neutral-500"> dans un rayon de {searchRadius}km autour de {selectedCitySuggestion.city}</span>
							{/if}
						{:else if displayedProducts.length === 1}
							{#if selectedCitySuggestion}
								1 gâteau trouvé dans un rayon de {searchRadius}km autour de {selectedCitySuggestion.city}
							{:else}
								1 gâteau trouvé
							{/if}
						{:else if selectedCitySuggestion}
							{displayedProducts.length} gâteaux trouvés dans un rayon de {searchRadius}km
							autour de {selectedCitySuggestion.city}
						{:else}
							{displayedProducts.length} gâteaux trouvés
						{/if}
					</p>
				{/if}
			</div>

			<!-- Grille de résultats -->
			<div
				bind:this={resultsContainer}
				class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
			>
				{#each displayedProducts as product}
					<Card.Root
						class="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all duration-300 hover:scale-[1.02] hover:border-[#FF6F61]/50 hover:shadow-xl"
					>
						<!-- Badge vérifié (si shop premium) -->
						{#if product.shop.isPremium}
							<div
								class="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 shadow-md backdrop-blur-sm"
							>
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
						<!-- Image du gâteau -->
						<div
							class="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#FFE8D6]/20 to-white"
						>
							{#if product.image_url}
								<img
									src={product.image_url}
									alt={product.name}
									class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
								/>
							{:else}
								<div class="flex h-full items-center justify-center">
									<Cake class="h-16 w-16 text-neutral-300" />
								</div>
							{/if}
							{#if product.cake_type}
								<div
									class="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-neutral-700 backdrop-blur-sm"
								>
									{product.cake_type}
								</div>
							{/if}
						</div>

						<!-- Contenu -->
						<Card.Content class="p-6">
							<div class="mb-4 flex items-start justify-between">
								<div class="flex-1">
									<Card.Title
										class="mb-2 text-xl font-semibold text-neutral-900"
									>
										{product.name}
									</Card.Title>
									{#if product.description}
										<p class="mb-3 line-clamp-2 text-sm text-neutral-600">
											{product.description}
										</p>
									{/if}
								</div>
							</div>

							<!-- Informations du shop -->
							<div
								class="mb-4 flex items-center gap-3 border-t border-neutral-100 pt-4"
							>
								{#if product.shop.logo_url}
									<img
										src={product.shop.logo_url}
										alt={product.shop.name}
										class="h-10 w-10 rounded-full object-cover"
									/>
								{:else}
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100"
									>
										<Cake class="h-5 w-5 text-neutral-400" />
									</div>
								{/if}
								<div class="flex-1">
									<p class="text-sm font-medium text-neutral-900">
										{product.shop.name}
									</p>
									<div class="flex items-center gap-1 text-xs text-neutral-500">
										<MapPin class="h-3 w-3" />
										<span>{product.shop.actualCity || product.shop.city}</span>
									</div>
								</div>
							</div>

							<!-- Prix et bouton -->
							<div class="flex items-center justify-between">
								<div>
									<p class="text-2xl font-bold text-[#FF6F61]">
										{product.base_price.toFixed(2)} €
									</p>
									<p class="text-xs text-neutral-500">Prix de base</p>
								</div>
								<Button
									href="/{product.shop.slug}/product/{product.id}"
									class="rounded-full bg-[#FF6F61] px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-[#e85a4f]"
								>
									Voir le gâteau
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<!-- Sentinel pour infinite scroll -->
			{#if hasMore}
				<div bind:this={sentinelElement} class="py-8 text-center">
					{#if isLoadingMore}
						<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#FF6F61] border-t-transparent"></div>
						<p class="mt-4 text-sm text-neutral-600">Chargement...</p>
					{:else}
						<Button
							on:click={loadNextPage}
							variant="outline"
							class="rounded-xl"
						>
							Charger plus
						</Button>
					{/if}
				</div>
			{/if}

			<!-- Message si aucun résultat -->
			{#if displayedProducts.length === 0}
				<div class="py-12 text-center">
					<Cake class="mx-auto mb-4 h-16 w-16 text-neutral-300" />
					<p class="mb-2 text-lg font-medium text-neutral-700">
						Aucun gâteau trouvé
					</p>
					<p class="mb-6 text-sm text-neutral-500">
						Essaie de modifier tes filtres pour voir plus de résultats.
					</p>
					<Button variant="outline" on:click={clearFilters}>
						Réinitialiser les filtres
					</Button>
				</div>
			{/if}
		</div>
	</section>

	<!-- Pagination cachée pour SEO -->
	{#if data.pagination && data.pagination.hasMore}
		<nav class="sr-only" aria-label="Pagination">
			{#each Array(Math.min(5, Math.ceil((data.pagination.total || 0) / data.pagination.limit))) as _, i}
				{@const pageNum = i + 1}
				{#if pageNum > currentPage}
					<a href="/tous-les-gateaux?page={pageNum}" rel="next">Page {pageNum}</a>
				{/if}
			{/each}
		</nav>
	{/if}
</div>
