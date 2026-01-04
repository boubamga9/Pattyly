<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { WebsiteName } from '$src/config';
	import { revealElement, revealStagger } from '$lib/utils/animations';
	import { Button } from '$lib/components/ui/button';
	import { MapPin, Cake, Map as MapIcon, List } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import CityAutocomplete from '$lib/components/ui/city-autocomplete.svelte';
	import RadiusSlider from '$lib/components/ui/radius-slider.svelte';
	import ShopsMap from '$lib/components/map/shops-map.svelte';
	import { searchCities, type CitySuggestion } from '$lib/services/city-autocomplete';
	import { isSearchBarVisible as searchBarVisibleStore } from '$lib/stores/searchBarVisibility';

	// ✅ Tracking: Page view côté client (annuaire page)
	onMount(() => {
		import('$lib/utils/analytics').then(({ logPageView }) => {
			const supabase = $page.data.supabase;
			logPageView(supabase, {
				page: '/patissiers'
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
	let viewMode: 'list' | 'map' = 'list'; // Mode d'affichage : liste ou carte
	let isLoadingAllShopsForMap = false; // Indicateur de chargement pour la carte
	let allShopsLoadedForMap = false; // Indicateur si tous les shops ont été chargés pour la carte
	let showOnlyVerified = false; // Filtre pour afficher uniquement les pâtissiers vérifiés
	
	// États pour gérer quel champ est ouvert (popovers style Airbnb)
	let activeField: 'where' | 'type' | 'filters' | null = null;
	let wherePopoverRef: HTMLElement | null = null;
	let typePopoverRef: HTMLElement | null = null;
	let filtersPopoverRef: HTMLElement | null = null;
	
	// États pour gérer la visibilité de la barre de recherche au scroll
	let isSearchBarVisible = true;
	let lastScrollY = 0;
	
	// Synchroniser avec le store
	$: searchBarVisibleStore.set(isSearchBarVisible);
	
	// Texte à afficher dans le champ "Filtres"
	$: filtersText = (() => {
		const parts: string[] = [];
		
		if (showOnlyVerified) {
			parts.push('Vérifiés');
		}
		
		if (selectedCitySuggestion && searchRadius !== 30) {
			parts.push(`${searchRadius}km`);
		}
		
		return parts.length > 0 ? parts.join(' • ') : 'Aucun';
	})();

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

	// Fonction pour charger tous les shops disponibles pour la carte
	async function loadAllShopsForMap() {
		// Si on a déjà tous les shops chargés, ne rien faire
		if (allShopsLoadedForMap && displayedShops.length >= totalShops) {
			return;
		}

		isLoadingAllShopsForMap = true;
		const allShops = [...displayedShops];
		let currentPageForMap = currentPage;
		let hasMorePages = hasMore;

		try {
			// Charger toutes les pages restantes
			while (hasMorePages) {
				currentPageForMap++;
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
				params.set('page', currentPageForMap.toString());

				const response = await fetch(`/patissiers/api?${params.toString()}`);
				if (!response.ok) {
					console.warn(`⚠️ [Annuaire] Erreur lors du chargement de la page ${currentPageForMap}`);
					break;
				}

				const result = await response.json();
				if (!result.shops || result.shops.length === 0) {
					break;
				}

				allShops.push(...result.shops);
				hasMorePages = result.pagination?.hasMore || false;
				
				// Limite de sécurité pour éviter les boucles infinies
				if (currentPageForMap > 100) {
					console.warn(`⚠️ [Annuaire] Limite de pages atteinte (100)`);
					break;
				}
			}

			// Mettre à jour displayedShops avec tous les shops
			displayedShops = allShops;
			
			// Re-trier pour que les premium restent en tête
			displayedShops.sort((a, b) => {
				if (a.isPremium && !b.isPremium) return -1;
				if (!a.isPremium && b.isPremium) return 1;
				return a.name.localeCompare(b.name);
			});

			// Marquer que tous les shops sont chargés pour la carte
			allShopsLoadedForMap = true;
			// NE PAS modifier hasMore ici - on le garde pour l'infinite scroll en vue liste
		} catch (error) {
			console.error('❌ [Annuaire] Erreur lors du chargement de tous les shops pour la carte:', error);
		} finally {
			isLoadingAllShopsForMap = false;
		}
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

			const response = await fetch(`/patissiers/api?${params.toString()}`);
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

			// Animations pour les nouveaux éléments (infinite scroll - animation rapide)
			if (resultsContainer) {
				await revealStagger(resultsContainer, ':scope > div', { 
					delay: 0, 
					stagger: 0.01, 
					translateY: 5, 
					duration: 0.2 
				});
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

		// Animations initiales (chargement initial - animation normale)
		if (resultsContainer) {
			await revealStagger(resultsContainer, ':scope > div', { 
				delay: 0.1, 
				stagger: 0.05 
			});
		}

		// Configurer l'Intersection Observer pour infinite scroll
		setupInfiniteScroll();
		
		// Gérer les clics extérieurs pour fermer les popovers
		document.addEventListener('click', handleClickOutside);
		
		// Gérer le scroll pour cacher/afficher la barre de recherche
		function handleScroll() {
			const currentScrollY = window.scrollY;
			
			// Si on scroll vers le bas et qu'on dépasse un certain seuil, cacher la barre
			if (currentScrollY > lastScrollY && currentScrollY > 100) {
				isSearchBarVisible = false;
			} 
			// Si on scroll vers le haut, afficher la barre
			else if (currentScrollY < lastScrollY) {
				isSearchBarVisible = true;
			}
			
			lastScrollY = currentScrollY;
		}
		
		window.addEventListener('scroll', handleScroll, { passive: true });
		lastScrollY = window.scrollY;
		
		// Initialiser le store
		searchBarVisibleStore.set(isSearchBarVisible);

		return () => {
			if (infiniteScrollObserver) {
				infiniteScrollObserver.disconnect();
			}
			document.removeEventListener('click', handleClickOutside);
			window.removeEventListener('scroll', handleScroll);
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
			
			// Réinitialiser le flag de chargement complet pour la carte
			allShopsLoadedForMap = false;
			
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

			const response = await fetch(`/patissiers/api?${params.toString()}`);
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

	// Fonction pour sélectionner une ville (sans déclencher le filtrage immédiat)
	function handleCitySelect(city: CitySuggestion | null) {
		selectedCitySuggestion = city;
		updateUrl();
		// Ne pas fermer le popover automatiquement, l'utilisateur peut continuer à modifier
	}

	// Fonction pour sélectionner un type de gâteau (sans déclencher le filtrage immédiat)
	function handleCakeTypeSelect(cakeType: string) {
		selectedCakeType = selectedCakeType === cakeType ? '' : cakeType;
		updateUrl();
		// Ne pas fermer le popover automatiquement
	}
	
	// Fonction pour ouvrir/fermer un champ
	function toggleField(field: 'where' | 'type' | 'filters') {
		activeField = activeField === field ? null : field;
	}

	// Fonction pour fermer tous les champs
	function closeAllFields() {
		activeField = null;
	}

	// Fonction pour fermer les popovers quand on clique ailleurs
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Node;
		// Ne pas fermer si on clique dans un input, textarea, ou dans les popovers
		if (target instanceof HTMLElement) {
			if (
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.closest('[role="dialog"]') ||
				wherePopoverRef?.contains(target) ||
				typePopoverRef?.contains(target) ||
				filtersPopoverRef?.contains(target)
			) {
				return;
			}
		}
		if (activeField) {
			activeField = null;
		}
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
		const newUrl = queryString ? `/patissiers?${queryString}` : '/patissiers';
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
	<meta property="og:url" content="https://pattyly.com/patissiers{cityName ? `?city=${cityName.toLowerCase()}` : ''}" />
	<link rel="canonical" href="https://pattyly.com/patissiers{cityName ? `?city=${cityName.toLowerCase()}` : ''}" />
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

	<!-- Hero Search Bar style Airbnb -->
	<section 
		class="sticky top-0 z-40 border-b border-neutral-200 bg-white pt-20 transition-all duration-500 ease-in-out {isSearchBarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12 py-3 sm:py-4">
			<!-- Barre de recherche principale -->
			<div class="relative flex w-full items-center justify-between rounded-full border border-neutral-300 bg-white px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm transition-all hover:shadow-md max-w-5xl mx-auto">
				<div class="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-1 min-w-0">
					<!-- Champ "Où" - Cliquable -->
					<button
						on:click={(e) => {
							e.stopPropagation();
							toggleField('where');
						}}
						class="flex flex-col items-start flex-1 min-w-0 text-left hover:bg-neutral-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors {activeField === 'where' ? 'bg-neutral-50' : ''}"
					>
						<span class="font-semibold text-neutral-900">Où</span>
						<span class="text-neutral-500 truncate w-full">
							{selectedCitySuggestion?.city || 'Recherche une ville...'}
						</span>
					</button>
					
					<!-- Popover "Où" -->
					{#if activeField === 'where'}
						<div
							bind:this={wherePopoverRef}
							class="fixed inset-x-4 sm:absolute sm:left-0 sm:inset-x-auto top-[calc(5rem+80px)] sm:top-full mt-0 sm:mt-2 w-[calc(100%-2rem)] sm:w-80 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl z-50"
							role="dialog"
							aria-label="Sélectionner une ville"
						>
							<div class="relative">
								<CityAutocomplete
									value={selectedCitySuggestion?.label || ''}
									placeholder="Recherche une ville..."
									onSelect={handleCitySelect}
								/>
							</div>
						</div>
					{/if}

					<div class="h-4 sm:h-6 w-px bg-neutral-300 shrink-0"></div>
					
					<!-- Champ "Type" - Cliquable -->
					<button
						on:click={(e) => {
							e.stopPropagation();
							toggleField('type');
						}}
						class="flex flex-col items-start flex-1 min-w-0 text-left hover:bg-neutral-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors {activeField === 'type' ? 'bg-neutral-50' : ''}"
					>
						<span class="font-semibold text-neutral-900">Type</span>
						<span class="text-neutral-500 truncate w-full">
							{selectedCakeType || 'Tous les types'}
						</span>
					</button>
					
					<!-- Popover "Type" -->
					{#if activeField === 'type'}
						<div
							bind:this={typePopoverRef}
							class="fixed inset-x-4 sm:absolute sm:left-1/3 sm:inset-x-auto top-[calc(5rem+80px)] sm:top-full mt-0 sm:mt-2 w-[calc(100%-2rem)] sm:w-80 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl z-50 max-h-[calc(100vh-10rem)] sm:max-h-none overflow-y-auto"
							role="dialog"
							aria-label="Sélectionner un type de gâteau"
						>
							<div class="space-y-2">
								<p class="text-sm font-semibold text-neutral-900 mb-3">Type de gâteau</p>
								<div class="flex flex-wrap gap-2">
									<button
										on:click={() => {
											handleCakeTypeSelect('');
										}}
										class="rounded-full border px-4 py-2 text-sm font-medium transition-all hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 {!selectedCakeType
											? 'border-[#FF6F61] bg-[#FFE8D6]/30 text-[#FF6F61]'
											: 'border-neutral-300 bg-white text-neutral-700'}"
									>
										Tous les types
									</button>
									{#each cakeTypes as cakeType}
										<button
											on:click={() => {
												handleCakeTypeSelect(cakeType);
											}}
											class="rounded-full border px-4 py-2 text-sm font-medium transition-all hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 {selectedCakeType === cakeType.toLowerCase()
												? 'border-[#FF6F61] bg-[#FFE8D6]/30 text-[#FF6F61]'
												: 'border-neutral-300 bg-white text-neutral-700'}"
										>
											{cakeType}
										</button>
									{/each}
								</div>
							</div>
						</div>
					{/if}
					
					<div class="h-4 sm:h-6 w-px bg-neutral-300 shrink-0"></div>
					
					<!-- Champ "Filtres" - Cliquable -->
					<button
						on:click={(e) => {
							e.stopPropagation();
							toggleField('filters');
						}}
						class="flex flex-col items-start flex-1 min-w-0 text-left hover:bg-neutral-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors {activeField === 'filters' ? 'bg-neutral-50' : ''}"
					>
						<span class="font-semibold text-neutral-900">Filtres</span>
						<span class="text-neutral-500 truncate w-full">
							{filtersText}
						</span>
					</button>
					
					<!-- Popover "Filtres" -->
					{#if activeField === 'filters'}
						<div
							bind:this={filtersPopoverRef}
							class="fixed inset-x-4 sm:absolute sm:right-0 sm:inset-x-auto top-[calc(5rem+80px)] sm:top-full mt-0 sm:mt-2 w-[calc(100%-2rem)] sm:w-96 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xl z-50 max-h-[calc(100vh-10rem)] sm:max-h-none overflow-y-auto"
							role="dialog"
							aria-label="Filtres de recherche"
						>
							<div class="space-y-4">
								<p class="text-sm font-semibold text-neutral-900 mb-4">Filtres</p>
								
								<!-- Slider de rayon (si ville sélectionnée) -->
								{#if selectedCitySuggestion}
									<div>
										<p class="text-sm font-medium text-neutral-700 mb-2">
											Rayon de recherche : {searchRadius}km
										</p>
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

								<!-- Filtre "Notre sélection" -->
								<button
									on:click={() => {
										showOnlyVerified = !showOnlyVerified;
									}}
									class="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-all hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 {showOnlyVerified
										? 'border-[#FF6F61] bg-[#FFE8D6]/30'
										: 'border-neutral-300 bg-white'}"
								>
									<span class="flex items-center gap-2">
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
										<span class={showOnlyVerified ? 'text-[#FF6F61]' : 'text-neutral-700'}>
											Notre sélection de pâtissiers
										</span>
									</span>
								</button>

								<!-- Bouton Valider -->
								<button
									on:click={async () => {
										updateUrl();
										closeAllFields();
										await filterDesigners();
									}}
									class="w-full rounded-lg bg-[#FF6F61] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#e85a4f]"
								>
									Valider
								</button>

								<!-- Bouton réinitialiser -->
								{#if selectedCitySuggestion || selectedCakeType || showOnlyVerified}
									<button
										on:click={async () => {
											await clearFilters();
											closeAllFields();
										}}
										class="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:text-[#FF6F61]"
									>
										Réinitialiser
									</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Bouton de recherche -->
				<button
					on:click={async () => {
						await filterDesigners();
						closeAllFields();
					}}
					class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-[#FF6F61] ml-2 sm:ml-4 hover:bg-[#e85a4f] transition-colors"
				>
					<svg class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				</button>
			</div>
		</div>
	</section>

	<!-- Titre et résultats -->
	<section class="relative overflow-hidden bg-white pt-4 pb-12 sm:pt-6 sm:pb-16 md:pt-8 md:pb-24">
		<div class="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
			<!-- Toggle Map/List -->
			<div class="mb-8 flex items-center justify-end gap-4">
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
						on:click={async () => {
							viewMode = 'map';
							// Charger tous les shops disponibles pour la carte
							await loadAllShopsForMap();
						}}
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

			<!-- Vue carte ou liste -->
			{#if viewMode === 'map'}
				<!-- Vue carte -->
				{#if isLoadingAllShopsForMap}
					<div class="relative h-[600px] w-full rounded-xl overflow-hidden border border-neutral-200 flex items-center justify-center bg-neutral-50">
						<div class="text-center">
							<div class="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-[#FF6F61] border-t-transparent mx-auto"></div>
							<p class="text-sm text-neutral-600">Chargement de tous les shops...</p>
						</div>
					</div>
				{:else}
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
				{/if}
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
			<div
				bind:this={resultsContainer}
				class="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
			>
				{#each displayedShops as designer}
					<a
						href="/{designer.slug}?from=app"
						class="group relative flex cursor-pointer flex-col max-w-[280px] mx-auto"
					>
						<!-- Logo du pâtissier -->
						<div class="relative mb-1.5 aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-100 scale-[0.95] origin-top border border-neutral-200">
							<img
								src={designer.logo}
								alt={designer.name}
								class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
							/>
							<!-- Badge vérifié (si shop premium) -->
							{#if designer.isPremium}
								<div
									class="absolute right-1.5 top-1.5 z-10 flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm"
								>
									<svg
										class="h-2.5 w-2.5 shrink-0"
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
									<span class="text-[10px] font-medium text-neutral-700">vérifié</span>
								</div>
							{/if}
						</div>

						<!-- Informations -->
						<div class="flex flex-1 flex-col">
							<!-- Nom du pâtissier -->
							<p class="mb-0.5 text-xs font-semibold text-neutral-900 line-clamp-2 leading-tight">
								{designer.name}
							</p>

							<!-- Localisation -->
							<div class="flex items-center gap-0.5 text-[10px] text-neutral-500">
								<MapPin class="h-2.5 w-2.5 shrink-0" />
								<span class="truncate">{designer.actualCity || designer.city}</span>
							</div>

							<!-- Badges des spécialités -->
							{#if designer.specialties && designer.specialties.length > 0}
								<div class="flex flex-wrap gap-1 mt-1">
									{#each designer.specialties.slice(0, 3) as specialty}
										<span class="rounded-full bg-[#FFE8D6]/50 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
											{specialty}
										</span>
									{/each}
								</div>
							{/if}
						</div>
					</a>
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
					<a href="/patissiers?page={pageNum}" rel="next">Page {pageNum}</a>
				{/if}
			{/each}
		</nav>
	{/if}
</div>

