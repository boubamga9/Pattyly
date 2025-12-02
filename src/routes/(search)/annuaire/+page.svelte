<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { WebsiteName } from '$src/config';
	import { revealElement, revealStagger } from '$lib/utils/animations';
	import { Button } from '$lib/components/ui/button';
	import { MapPin, Cake, X, ChevronDown, ChevronUp, Map as MapIcon, List } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import CityAutocomplete from '$lib/components/ui/city-autocomplete.svelte';
	import RadiusSlider from '$lib/components/ui/radius-slider.svelte';
	import ShopsMap from '$lib/components/map/shops-map.svelte';
	import { searchCities, type CitySuggestion } from '$lib/services/city-autocomplete';

	// ✅ Tracking: Page view côté client (annuaire page)
	onMount(() => {
		import('$lib/utils/analytics').then(({ logPageView }) => {
			const supabase = $page.data.supabase;
			logPageView(supabase, {
				page: '/annuaire'
			}).catch((err: unknown) => {
				console.error('Error tracking page_view:', err);
			});
		});
	});

	export let data: {
		shops: Array<{
			id: string;
			name: string;
			slug: string;
			city: string;
			actualCity?: string;
			postalCode: string;
			specialties: string[];
			logo: string;
			bio?: string;
			isPremium?: boolean;
			distance?: number | null;
			latitude?: number | null;
			longitude?: number | null;
		}>;
		pagination?: {
			page: number;
			limit: number;
			total: number;
			hasMore: boolean;
		};
	};

	let resultsContainer: HTMLElement;

	let selectedCitySuggestion: CitySuggestion | null = null;
	let selectedCakeType = '';
	let searchRadius = 30; // Rayon par défaut en km
	let filtersExpanded = true; // Filtres ouverts par défaut
	let viewMode: 'list' | 'map' = 'list'; // Mode d'affichage : liste ou carte
	let showOnlyVerified = false; // Filtre pour afficher uniquement les pâtissiers vérifiés

	const cakeTypes = [
		'Gâteau d\'anniversaire',
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
		'gâteau d\'anniversaire': 'gateau-anniversaire',
		'gateau d\'anniversaire': 'gateau-anniversaire',
		'gâteau de mariage': 'gateau-mariage',
		'gateau de mariage': 'gateau-mariage',
		'cupcakes': 'cupcakes',
		'macarons': 'macarons',
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
		'mignardise': 'mignardise',
	};

	// Utiliser les données du serveur (première page)
	let displayedShops = data.shops || [];
	let currentPage = data.pagination?.page || 1;
	let hasMore = data.pagination?.hasMore || false;
	let totalShops = data.pagination?.total || 0; // Total de pâtissiers pour l'affichage
	let isLoadingMore = false;
	let sentinelElement: HTMLElement;

	// Récupérer les paramètres de l'URL
	$: urlCity = $page.url.searchParams.get('city') || '';
	$: urlCakeType = $page.url.searchParams.get('type') || '';

	// Titre et description dynamiques pour le SEO
	$: cityName = selectedCitySuggestion?.city || '';
	$: cakeTypeName = selectedCakeType
		? cakeTypes.find((t) => t.toLowerCase() === selectedCakeType.toLowerCase()) || selectedCakeType
		: '';

	/**
	 * Calcule la distance entre deux points GPS en kilomètres (formule de Haversine)
	 */
	function calculateDistance(
		lat1: number,
		lon1: number,
		lat2: number,
		lon2: number
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
	async function geocodeCity(cityName: string, postalCode?: string): Promise<[number, number] | null> {
		try {
			const query = postalCode
				? `${postalCode} ${cityName}, France`
				: `${cityName}, France`;

			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=fr`,
				{
					headers: {
						'User-Agent': 'Pattyly/1.0'
					}
				}
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

	$: pageTitle = cityName
		? `Cake designer ${cityName} - Annuaire de pâtissiers | ${WebsiteName}`
		: `Annuaire de cake designers - Trouve ton pâtissier | ${WebsiteName}`;

	$: pageDescription = cityName
		? `Trouve les meilleurs cake designers à ${cityName}. Recherche par type de gâteau et découvre leurs boutiques en ligne. Commandes directes, paiement sécurisé.`
		: `Recherche un cake designer près de chez toi par ville et type de gâteau. Découvre les meilleurs pâtissiers avec leur boutique en ligne Pattyly.`;

	$: h1Title = cityName
		? `Cake designers à ${cityName}`
		: 'Trouve le cake designer parfait';

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

			const response = await fetch(`/annuaire/api?${params.toString()}`);
			if (!response.ok) throw new Error('Failed to load next page');

			const result = await response.json();
			
			// Ajouter les nouveaux shops à la liste
			displayedShops = [...displayedShops, ...result.shops];
			
			// ✅ Re-trier pour que les premium restent en tête
			displayedShops.sort((a, b) => {
				if (a.isPremium && !b.isPremium) return -1;
				if (!a.isPremium && b.isPremium) return 1;
				return a.name.localeCompare(b.name);
			});
			
			currentPage = result.pagination.page;
			hasMore = result.pagination.hasMore;
			totalShops = result.pagination.total; // Mettre à jour le total

			// Animations pour les nouveaux éléments
			if (resultsContainer) {
				const newElements = resultsContainer.querySelectorAll(':scope > div');
				await revealStagger(resultsContainer, ':scope > div', { delay: 0.1, stagger: 0.05 });
			}
		} catch (error) {
			console.error('Erreur lors du chargement de la page suivante:', error);
		} finally {
			isLoadingMore = false;
		}
	}

	// Fonction pour configurer/réinitialiser l'infinite scroll
	let infiniteScrollObserver: IntersectionObserver | null = null;
	
	function setupInfiniteScroll() {
		// Déconnecter l'observer existant s'il existe
		if (infiniteScrollObserver) {
			infiniteScrollObserver.disconnect();
			infiniteScrollObserver = null;
		}

		// Créer un nouvel observer
		if (typeof IntersectionObserver !== 'undefined' && sentinelElement) {
			infiniteScrollObserver = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
						loadNextPage();
					}
				},
				{ rootMargin: '200px' } // Charger 200px avant d'arriver en bas
			);

			infiniteScrollObserver.observe(sentinelElement);
		}
	}

	// Intersection Observer pour infinite scroll
	onMount(async () => {
		// Initialiser avec les paramètres de l'URL
		if (urlCity) {
			const cityResults = await searchCities(urlCity, 5);
			if (cityResults.length > 0) {
				selectedCitySuggestion = cityResults[0];
				// Ne pas appeler handleCitySelect ici pour éviter un double filtrage
				// Le filtrage sera fait par le serveur lors du chargement initial
			}
		}
		
		if (urlCakeType) {
			const slugToCakeType: Record<string, string> = {
				'gateau-anniversaire': 'gâteau d\'anniversaire',
				'gateau-mariage': 'gâteau de mariage',
				'cupcakes': 'cupcakes',
				'macarons': 'macarons',
				'gateau-personnalise': 'gâteau personnalisé',
				'gateau-evenement': 'gâteau pour événement',
				'gateau-vegan': 'gâteau vegan',
				'gateau-sans-gluten': 'gâteau sans gluten',
				'patisserie-orientale': 'pâtisserie orientale',
				'traiteur-evenementiel': 'traiteur événementiel',
				'mignardise': 'mignardise',
			};
			
			const cakeTypeName = slugToCakeType[urlCakeType.toLowerCase()];
			if (cakeTypeName) {
				selectedCakeType = cakeTypeName.toLowerCase();
			}
		}

		// Animations initiales
		if (resultsContainer) {
			await revealStagger(resultsContainer, ':scope > div', { delay: 0.1, stagger: 0.05 });
		}

		// Configurer l'Intersection Observer pour infinite scroll
		setupInfiniteScroll();

		return () => {
			if (infiniteScrollObserver) {
				infiniteScrollObserver.disconnect();
			}
		};
	});

	// Cache pour les coordonnées géocodées (évite de refaire les appels API)
	const geocodedCache = new Map<string, [number, number]>();

	// Filtrer les résultats avec rayon de recherche (fallback côté client si pas de coordonnées GPS)
	let filteredDesignersSync: typeof displayedShops = displayedShops;
	let isLoadingFilter = false;
	let filterTimeout: ReturnType<typeof setTimeout> | null = null;
	let isFiltering = false;

	async function filterDesigners() {
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
			
			// ✅ Si le filtre "verified" change, recharger depuis le serveur
			// On recharge toujours depuis le serveur pour éviter les incohérences
			const params = new URLSearchParams();
			params.set('page', '1');
			
			if (showOnlyVerified) {
				params.set('verified', 'true');
			}
			
			if (selectedCitySuggestion) {
				params.set('city', selectedCitySuggestion.city.toLowerCase());
				// Toujours envoyer les coordonnées si disponibles pour le filtrage géographique
				if (selectedCitySuggestion.coordinates) {
					params.set('lat', selectedCitySuggestion.coordinates.lat.toString());
					params.set('lon', selectedCitySuggestion.coordinates.lon.toString());
					params.set('radius', searchRadius.toString());
				}
			}
			if (selectedCakeType) {
				const cakeTypeSlug = cakeTypeToSlug[selectedCakeType.toLowerCase()];
				if (cakeTypeSlug) {
					params.set('type', cakeTypeSlug);
				}
			}

			const response = await fetch(`/annuaire/api?${params.toString()}`);
			if (response.ok) {
				const result = await response.json();
				displayedShops = result.shops || [];
				currentPage = 1;
				hasMore = result.pagination?.hasMore || false;
				totalShops = result.pagination?.total || 0; // Mettre à jour le total
				filteredDesignersSync = displayedShops;
				isLoadingFilter = false;
				isFiltering = false;
				// Réinitialiser l'infinite scroll après le filtrage
				setTimeout(() => {
					setupInfiniteScroll();
				}, 100);
				return;
			} else {
				console.error('❌ [Annuaire] Error loading shops:', response.statusText);
			}
			
			let filtered = [...displayedShops];

		// Filtre par type de gâteau
		if (selectedCakeType) {
			filtered = filtered.filter((designer) =>
				designer.specialties.some((s) => s.toLowerCase().includes(selectedCakeType.toLowerCase()))
			);
		}

		// Filtre par rayon si une ville est sélectionnée
		if (selectedCitySuggestion?.coordinates) {
			const [centerLat, centerLon] = [
				selectedCitySuggestion.coordinates.lat,
				selectedCitySuggestion.coordinates.lon
			];

			// Filtrer par distance (on géocode chaque pâtissier si nécessaire)
			const filteredByRadius = await Promise.all(
				filtered.map(async (designer) => {
					const cacheKey = `${designer.actualCity || designer.city}_${designer.postalCode || ''}`;
					
					// Vérifier le cache
					let designerCoords = geocodedCache.get(cacheKey);
					
					if (!designerCoords) {
						// Géocoder si pas en cache
						designerCoords = await geocodeCity(
							designer.actualCity || designer.city,
							designer.postalCode || undefined
						);
						
						if (designerCoords) {
							geocodedCache.set(cacheKey, designerCoords);
						}
					}

					if (!designerCoords) {
						// Si on ne peut pas géocoder, on inclut quand même (fallback)
						return { designer, distance: null };
					}

					const distance = calculateDistance(
						centerLat,
						centerLon,
						designerCoords[0],
						designerCoords[1]
					);

					return { designer, distance };
				})
			);

			// Filtrer ceux qui sont dans le rayon
			filtered = filteredByRadius
				.filter((item) => item.distance === null || item.distance <= searchRadius)
				.map((item) => item.designer);
		}

		// Trier : vérifiés en premier, puis par nom
		filtered.sort((a, b) => {
			if (a.isPremium && !b.isPremium) return -1;
			if (!a.isPremium && b.isPremium) return 1;
			return a.name.localeCompare(b.name);
		});

		// S'assurer que filtered est toujours un tableau
		filteredDesignersSync = Array.isArray(filtered) ? filtered : [];
		totalShops = filteredDesignersSync.length; // Mettre à jour le total avec le nombre de pâtissiers filtrés
		isLoadingFilter = false;
		isFiltering = false;
		} catch (error) {
			console.error('Erreur lors du filtrage:', error);
			// En cas d'erreur, afficher un tableau vide
			filteredDesignersSync = [];
			totalShops = 0; // Mettre à jour le total à 0 en cas d'erreur
			isLoadingFilter = false;
			isFiltering = false;
		}
	}

	// Le changement de rayon est géré directement dans le handler du slider
	// Pas de déclaration réactive pour éviter les boucles infinies

	// filteredDesignersSync est utilisé pour le fallback côté client si nécessaire
	// Le template utilise directement displayedShops

	async function clearFilters() {
		selectedCitySuggestion = null;
		selectedCakeType = '';
		searchRadius = 30;
		showOnlyVerified = false;
		updateUrl();
		// Recharger les shops sans filtres
		await filterDesigners();
	}

	async function handleCitySelect(city: CitySuggestion | null) {
		selectedCitySuggestion = city;
		updateUrl();
		// Gérer le filtrage directement
		await filterDesigners();
	}

	async function handleCakeTypeSelect(cakeType: string) {
		selectedCakeType = selectedCakeType === cakeType ? '' : cakeType;
		updateUrl();
		// Gérer le filtrage directement
		await filterDesigners();
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

		// Ajouter le filtre verified si activé
		if (showOnlyVerified) {
			params.set('verified', 'true');
		}

		// Mettre à jour l'URL sans recharger la page
		const queryString = params.toString();
		const newUrl = queryString ? `/annuaire?${queryString}` : '/annuaire';
		window.history.replaceState({}, '', newUrl);
	}

</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta
		name="keywords"
		content={cityName
			? `cake designer ${cityName}, pâtissier ${cityName}, gâteau personnalisé ${cityName}, annuaire cake designer ${cityName}`
			: 'annuaire cake designer, trouver pâtissier, cake designer [ville], gâteau personnalisé, pâtissier professionnel'}
	/>
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/annuaire{cityName ? `?city=${cityName.toLowerCase()}` : ''}" />
	<link rel="canonical" href="https://pattyly.com/annuaire{cityName ? `?city=${cityName.toLowerCase()}` : ''}" />
</svelte:head>

<div class="flex flex-col">
	<!-- H1 masqué pour le SEO -->
	<h1 class="sr-only">
					{#if cityName}
			Cake designers à {cityName} - Annuaire de pâtissiers | {WebsiteName}
					{:else}
			Annuaire de cake designers - Trouve ton pâtissier | {WebsiteName}
					{/if}
				</h1>

	<!-- Barre de recherche et filtres en haut -->
	<section class="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-sm pt-20">
		<div class="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 {filtersExpanded ? 'py-4' : 'py-2'}">
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

						<!-- Slider rayon -->
						{#if selectedCitySuggestion}
							<div class="w-full sm:w-auto sm:min-w-[200px]">
								<RadiusSlider
									value={searchRadius}
									min={1}
									max={50}
									step={1}
									onChange={async (val) => {
										searchRadius = val;
										updateUrl();
										// Debounce pour éviter trop d'appels pendant le glissement
										if (filterTimeout) {
											clearTimeout(filterTimeout);
										}
										filterTimeout = setTimeout(async () => {
											await filterDesigners();
										}, 300);
									}}
								/>
							</div>
						{/if}

						<!-- Filtre "Notre sélection" (pâtissiers vérifiés) -->
						<button
							on:click={async () => {
								showOnlyVerified = !showOnlyVerified;
								updateUrl();
								// Gérer le filtre verified directement sans passer par la déclaration réactive
								await filterDesigners();
							}}
							class="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 {showOnlyVerified 
								? 'border-[#FF6F61] bg-[#FFE8D6]/30' 
								: 'border-neutral-300 bg-white'}">
							<span class="flex items-center gap-1.5">
								<svg
									class="h-4 w-4 shrink-0 {showOnlyVerified ? 'text-[#FF6F61]' : 'text-neutral-400'}"
									viewBox="0 0 22 22"
									fill="none"
								>
									<circle cx="11" cy="11" r="10" fill={showOnlyVerified ? '#FF6F61' : 'currentColor'} />
									<path
										d="M6.5 11l2.5 2.5 5-5"
										stroke="white"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								<span class={showOnlyVerified ? 'text-[#FF6F61]' : 'text-neutral-700'}>Notre sélection de pâtissiers</span>
							</span>
						</button>

						<!-- Filtres par type de gâteau (pills) -->
						<div class="flex flex-wrap gap-2">
							{#each ['Gâteau d\'anniversaire', 'Gâteau de mariage', 'Cupcakes', 'Macarons', 'Gâteau personnalisé'] as type}
								<button
									on:click={() => {
										handleCakeTypeSelect(type.toLowerCase());
									}}
									class="rounded-full border px-4 py-2 text-sm font-medium transition-all {selectedCakeType === type.toLowerCase() 
										? 'border-[#FF6F61] bg-[#FF6F61] text-white' 
										: 'border-neutral-300 bg-white text-neutral-700 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20'}"
								>
									{type}
								</button>
									{/each}
							</div>

						<!-- Bouton reset si filtres actifs -->
						{#if selectedCitySuggestion || selectedCakeType || showOnlyVerified}
								<button
									on:click={clearFilters}
								class="ml-auto flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:text-[#FF6F61]"
								>
									<X class="h-4 w-4" />
								Réinitialiser
								</button>
							{/if}
					</div>
				{/if}

				<!-- Bouton pour ouvrir/fermer les filtres -->
				<button
					on:click={() => filtersExpanded = !filtersExpanded}
					class="mx-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:text-[#FF6F61]"
					aria-label={filtersExpanded ? 'Masquer les filtres' : 'Afficher les filtres'}
				>
					{#if filtersExpanded}
						<ChevronUp class="h-3.5 w-3.5" />
					{:else}
						<ChevronDown class="h-3.5 w-3.5" />
					{/if}
					<span class="text-xs">{filtersExpanded ? 'Masquer les filtres' : 'Afficher les filtres'}</span>
				</button>
			</div>
		</div>
	</section>

	<!-- Titre et résultats -->
	<section class="relative overflow-hidden bg-white py-8 pb-12 sm:py-12 sm:pb-16 md:py-16 md:pb-24">
		<div class="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
			<!-- Titre et toggle map/list -->
			<div class="mb-8 flex items-center justify-between gap-4">
				<h2 class="text-3xl font-semibold text-neutral-900 sm:text-4xl">
					{#if cityName}
						Pâtissiers et cake designers à <span class="text-[#FF6F61]">{cityName}</span>
					{:else}
						Pâtissiers et <span class="text-[#FF6F61]">cake designers</span>
					{/if}
				</h2>
				
				<!-- Toggle Map/List -->
				<div class="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-1">
					<button
						on:click={() => viewMode = 'list'}
						class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all {viewMode === 'list' 
							? 'bg-[#FF6F61] text-white' 
							: 'text-neutral-600 hover:bg-neutral-50'}"
						aria-label="Vue liste"
					>
						<List class="h-4 w-4" />
						<span class="hidden sm:inline">Liste</span>
					</button>
					<button
						on:click={() => viewMode = 'map'}
						class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all {viewMode === 'map' 
							? 'bg-[#FF6F61] text-white' 
							: 'text-neutral-600 hover:bg-neutral-50'}"
						aria-label="Vue carte"
					>
						<MapIcon class="h-4 w-4" />
						<span class="hidden sm:inline">Carte</span>
					</button>
				</div>
			</div>
			
			{#if displayedShops.length > 0}
				<p class="mb-6 text-sm text-neutral-600">
					{#if selectedCitySuggestion && searchRadius}
						{#if totalShops === 0}
							Aucun pâtissier trouvé
						{:else if totalShops === 1}
							1 pâtissier trouvé dans un rayon de {searchRadius}km autour de {selectedCitySuggestion.city}
						{:else}
							{totalShops} pâtissiers trouvés dans un rayon de {searchRadius}km autour de {selectedCitySuggestion.city}
						{/if}
					{:else}
						{#if totalShops === 0}
							Aucun pâtissier trouvé
						{:else if totalShops === 1}
							1 pâtissier trouvé
						{:else}
							{totalShops} pâtissiers trouvés
						{/if}
					{/if}
				</p>
			{/if}

			<!-- Vue carte ou liste -->
			{#if viewMode === 'map'}
				<!-- Vue carte -->
				<div class="relative h-[600px] w-full rounded-xl overflow-hidden border border-neutral-200" style="z-index: 1;">
					<ShopsMap
						shops={displayedShops.map(designer => ({
							id: designer.id,
							name: designer.name,
							slug: designer.slug,
							city: designer.city,
							actualCity: designer.actualCity || designer.city,
							postalCode: designer.postalCode,
							specialties: designer.specialties,
							logo: designer.logo,
							isPremium: designer.isPremium,
							latitude: designer.latitude,
							longitude: designer.longitude
						}))}
						cityName={selectedCitySuggestion?.city || cityName || ''}
					/>
				</div>
			{:else}
				<!-- Vue liste -->
				{#if isLoadingFilter}
					<div class="py-12 text-center">
						<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#FF6F61] border-t-transparent"></div>
						<p class="mt-4 text-sm text-neutral-600">Recherche en cours...</p>
					</div>
				{:else if displayedShops.length === 0}
				<div class="py-20 text-center">
					<div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFE8D6]/30">
						<MapPin class="h-8 w-8 text-[#FF6F61]" />
					</div>
					<p class="mb-2 text-xl font-semibold text-neutral-900">Aucun pâtissier trouvé</p>
					<p class="mb-8 text-neutral-600">
						{#if selectedCitySuggestion}
							Aucun cake designer ne correspond à tes critères dans un rayon de {searchRadius}km autour de {selectedCitySuggestion.city}.
						{:else}
							Aucun cake designer ne correspond à tes critères de recherche.
						{/if}
					</p>
					<Button
							on:click={clearFilters}
						class="rounded-xl bg-[#FF6F61] px-8 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#e85a4f] hover:shadow-xl"
						>
						Réinitialiser les filtres
					</Button>
				</div>
			{:else}
			<div bind:this={resultsContainer} class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
					{#each displayedShops as designer}
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
										<span>{designer.actualCity || designer.city}</span>
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
				{/if}
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
					Explore nos types de gâteaux
				</h2>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<a
					href="/gateau-anniversaire"
					class="group rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
				>
					<div class="mb-3 text-3xl">🎂</div>
					<h3 class="mb-2 text-lg font-semibold text-neutral-900">Gâteau d'anniversaire</h3>
					<p class="text-sm leading-relaxed text-neutral-600" style="font-weight: 300;">
						Gâteaux d'anniversaire personnalisés pour tous les âges
					</p>
					<span class="mt-3 inline-flex items-center text-sm font-medium text-[#FF6F61] transition-colors group-hover:text-[#e85a4f]">
						Découvrir →
					</span>
				</a>
				<a
					href="/gateau-mariage"
					class="group rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
				>
					<div class="mb-3 text-3xl">💍</div>
					<h3 class="mb-2 text-lg font-semibold text-neutral-900">Gâteau de mariage</h3>
					<p class="text-sm leading-relaxed text-neutral-600" style="font-weight: 300;">
						Wedding cakes et layer cakes sur mesure pour votre grand jour
					</p>
					<span class="mt-3 inline-flex items-center text-sm font-medium text-[#FF6F61] transition-colors group-hover:text-[#e85a4f]">
						Découvrir →
					</span>
				</a>
				<a
					href="/trouver-un-cake-designer"
					class="group rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
				>
					<div class="mb-3 text-3xl">🔍</div>
					<h3 class="mb-2 text-lg font-semibold text-neutral-900">Trouver un cake designer</h3>
					<p class="text-sm leading-relaxed text-neutral-600" style="font-weight: 300;">
						Recherche par ville et découvre les meilleurs pâtissiers
					</p>
					<span class="mt-3 inline-flex items-center text-sm font-medium text-[#FF6F61] transition-colors group-hover:text-[#e85a4f]">
						Rechercher →
					</span>
				</a>
			</div>
		</div>
	</section>

	<!-- Pagination cachée pour SEO -->
	{#if data.pagination && data.pagination.hasMore}
		<nav class="sr-only" aria-label="Pagination">
			{#each Array(Math.min(5, Math.ceil((data.pagination.total || 0) / data.pagination.limit))) as _, i}
				{@const pageNum = i + 1}
				{#if pageNum > currentPage}
					<a href="/annuaire?page={pageNum}" rel="next">Page {pageNum}</a>
				{/if}
			{/each}
		</nav>
	{/if}
</div>

