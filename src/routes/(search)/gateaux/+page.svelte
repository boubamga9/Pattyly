<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { WebsiteName } from '$src/config';
	import { revealStagger } from '$lib/utils/animations';
	import { Button } from '$lib/components/ui/button';
	import { MapPin, Cake } from 'lucide-svelte';
	import CityAutocomplete from '$lib/components/ui/city-autocomplete.svelte';
	import RadiusSlider from '$lib/components/ui/radius-slider.svelte';
	import {
		searchCities,
		type CitySuggestion,
	} from '$lib/services/city-autocomplete';
	import { isSearchBarVisible as searchBarVisibleStore } from '$lib/stores/searchBarVisibility';

	// ✅ Tracking: Page view côté client (tous-les-gateaux page)
	onMount(() => {
		import('$lib/utils/analytics').then(({ logPageView }) => {
			const supabase = $page.data.supabase;
			logPageView(supabase, {
				page: '/gateaux'
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
	// On initialise vide, les produits seront ajoutés après validation dans onMount
	let displayedProducts: typeof data.products = [];
	let currentPage = data.pagination?.page || 1;
	let hasMore = data.pagination?.hasMore || false;
	let _totalProducts = data.pagination?.total || 0; // Total de produits pour l'affichage (non utilisé dans le template)
	let isLoadingMore = false;
	let sentinelElement: HTMLElement;
	let scrollObserver: IntersectionObserver | null = null;
	
	// Suivre les produits avec des erreurs d'image
	let productsWithImageErrors = new Set<string>();
	// État pour savoir si on est en train de charger initialement (pour masquer "Aucun produit trouvé")
	let isInitialLoading = true;
	// Flag pour savoir si on a déjà fait le chargement initial
	let hasInitialized = false;
	
	// Valider automatiquement les nouveaux produits quand displayedProducts change
	// (seulement après le chargement initial)
	$: if (displayedProducts.length > 0 && typeof window !== 'undefined' && hasInitialized) {
		// Valider de manière asynchrone pour ne pas bloquer le rendu
		setTimeout(() => {
			validateNewProductsImages(displayedProducts, false); // false = pas le chargement initial
		}, 0);
	}

	// Filtrer les produits pour masquer ceux sans image ou avec erreur
	$: visibleProducts = displayedProducts.filter((product) => {
		// Masquer si pas d'image
		if (!product.image_url) {
			return false;
		}
		// Masquer si erreur d'image détectée
		if (productsWithImageErrors.has(product.id)) {
			return false;
		}
		return true;
	});
	
	// Fonction pour gérer les erreurs de chargement d'image
	function handleImageError(productId: string) {
		productsWithImageErrors.add(productId);
		// Forcer la mise à jour réactive
		productsWithImageErrors = productsWithImageErrors;
	}

	// Fonction pour précharger une image et détecter les erreurs avant l'affichage
	function preloadImage(imageUrl: string): Promise<boolean> {
		return new Promise((resolve) => {
			if (typeof window === 'undefined' || typeof Image === 'undefined') {
				resolve(false);
				return;
			}
			
			if (!imageUrl) {
				resolve(false);
				return;
			}
			
			const img = new Image();
			img.onload = () => resolve(true);
			img.onerror = () => resolve(false);
			img.src = imageUrl;
		});
	}

	// Fonction pour valider les images des nouveaux produits avant de les afficher
	async function validateNewProductsImages(newProducts: typeof displayedProducts, isInitial = false) {
		if (typeof window === 'undefined' || typeof Image === 'undefined') {
			if (isInitial) {
				isInitialLoading = false;
			}
			return;
		}

		// Filtrer les produits qui ont besoin d'être validés
		const productsToValidate = newProducts.filter(p => 
			p.image_url && 
			!productsWithImageErrors.has(p.id)
		);

		if (productsToValidate.length === 0) {
			if (isInitial) {
				isInitialLoading = false;
			}
			return;
		}

		// Valider les images en parallèle (le navigateur limite déjà les connexions)
		const validationResults = await Promise.all(
			productsToValidate.map(async (product) => {
				if (!product.image_url) return { productId: product.id, isValid: false };
				const isValid = await preloadImage(product.image_url);
				return { productId: product.id, isValid };
			})
		);

		// Ajouter les produits avec erreur au Set
		validationResults.forEach(({ productId, isValid }) => {
			if (!isValid) {
				productsWithImageErrors.add(productId);
			}
		});

		// Forcer la mise à jour réactive
		productsWithImageErrors = productsWithImageErrors;
		// Masquer le skeleton une fois la validation terminée (seulement si c'est le chargement initial)
		if (isInitial) {
			isInitialLoading = false;
		}
	}

	// Filtres
	let selectedCitySuggestion: CitySuggestion | null = null;
	let selectedCakeType = '';
	let searchRadius = 30; // Rayon par défaut en km
	let showOnlyVerified = false; // Filtre pour afficher uniquement les gâteaux des pâtissiers vérifiés
	let minPrice = 0;
	let maxPrice = 1000;
	
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
		
		if (minPrice > 0 || maxPrice < 1000) {
			if (minPrice > 0 && maxPrice < 1000) {
				parts.push(`${minPrice}€-${maxPrice}€`);
			} else if (minPrice > 0) {
				parts.push(`${minPrice}€+`);
			} else {
				parts.push(`jusqu'à ${maxPrice}€`);
			}
		}
		
		return parts.length > 0 ? parts.join(' • ') : 'Aucun';
	})();

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
		const currentUrlVerified = $page.url.searchParams.get('verified');

		// Réinitialiser la ville si présente dans l'URL
		if (currentUrlCity) {
			const cityResults = await searchCities(currentUrlCity, 5);
			if (cityResults.length > 0) {
				selectedCitySuggestion = cityResults[0];
			} else {
				selectedCitySuggestion = null;
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

		// Réinitialiser le filtre verified si présent dans l'URL
		showOnlyVerified = currentUrlVerified === 'true';
		
		// Réinitialiser les prix si présents dans l'URL
		const currentUrlMinPrice = $page.url.searchParams.get('minPrice');
		const currentUrlMaxPrice = $page.url.searchParams.get('maxPrice');
		if (currentUrlMinPrice) {
			minPrice = parseInt(currentUrlMinPrice, 10) || 0;
		} else {
			minPrice = 0;
		}
		if (currentUrlMaxPrice) {
			maxPrice = parseInt(currentUrlMaxPrice, 10) || 1000;
		} else {
			maxPrice = 1000;
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
	// filteredProductsSync n'est plus utilisé, on utilise directement displayedProducts
	let _isLoadingFilter = false;
	let filterTimeout: ReturnType<typeof setTimeout> | null = null;
	let isFiltering = false;

	async function filterProducts() {
		// Éviter les appels multiples simultanés
		if (isFiltering) {
			console.log('⏸️ [Tous les gateaux] filterProducts already in progress, skipping');
			return;
		}

		// Annuler le timeout précédent si existe
		if (filterTimeout) {
			clearTimeout(filterTimeout);
			filterTimeout = null;
		}

		try {
			isFiltering = true;
			_isLoadingFilter = true;
			
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
			
			if (minPrice > 0) {
				params.set('minPrice', minPrice.toString());
			}
			if (maxPrice < 1000) {
				params.set('maxPrice', maxPrice.toString());
			}

			const response = await fetch(`/gateaux/api?${params.toString()}`);
			if (response.ok) {
				const result = await response.json();
				const newProducts = result.products || [];
				
				// ✅ CORRECTION : Ne garder que les erreurs pour les produits qui sont toujours dans la nouvelle liste
				// Cela évite que les produits avec des images problématiques réapparaissent après un filtrage
				const newProductIds = new Set(newProducts.map((p: { id: string }) => p.id));
				productsWithImageErrors = new Set(
					Array.from(productsWithImageErrors).filter((productId) => 
						newProductIds.has(productId)
					)
				);
				
				// ✅ Valider les images des nouveaux produits avant de les afficher
				// Cela évite les erreurs 404 dans la console et les flashes d'images cassées
				// Ne pas afficher le skeleton lors des filtres, seulement au chargement initial
				await validateNewProductsImages(newProducts, false); // false = pas le chargement initial
				
				displayedProducts = newProducts;
				currentPage = 1;
				hasMore = result.pagination?.hasMore || false;
				_totalProducts = result.pagination?.total || 0; // Mettre à jour le total
				_isLoadingFilter = false;
				isFiltering = false;
				// Réinitialiser l'infinite scroll après le filtrage
				setTimeout(() => {
					setupInfiniteScroll();
				}, 100);
				return;
			} else {
				console.error('❌ [Tous les gateaux] Error loading products:', response.statusText);
			}
			
			let filtered = [...displayedProducts];

			// Filtre par type de gâteau
			if (selectedCakeType) {
				filtered = filtered.filter(
					(product) =>
						product.cake_type?.toLowerCase() === selectedCakeType.toLowerCase(),
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

			// Filtre par prix
			if (minPrice > 0 || maxPrice < 1000) {
				filtered = filtered.filter((product) => {
					const price = product.base_price;
					return price >= minPrice && price <= maxPrice;
				});
			}

			// L'ordre est déjà préservé depuis la base de données (premium shop products en premier, puis hash aléatoire)
			// Pas besoin de re-trier côté client

			// Mettre à jour displayedProducts avec les résultats filtrés
			displayedProducts = Array.isArray(filtered) ? filtered : [];
			_totalProducts = displayedProducts.length; // Mettre à jour le total avec le nombre de produits filtrés
			_isLoadingFilter = false;
			isFiltering = false;
		} catch (error) {
			console.error('Erreur lors du filtrage:', error);
			// En cas d'erreur, afficher un tableau vide
			displayedProducts = [];
			_totalProducts = 0; // Mettre à jour le total à 0 en cas d'erreur
			_isLoadingFilter = false;
			isFiltering = false;
		}
	}

	// Le changement de rayon est géré directement dans le handler du slider
	// Pas de déclaration réactive pour éviter les boucles infinies

	// filteredProductsSync est utilisé pour le fallback côté client si nécessaire
	// Le template utilise directement displayedProducts

	async function clearFilters() {
		selectedCitySuggestion = null;
		selectedCakeType = '';
		searchRadius = 30;
		showOnlyVerified = false;
		minPrice = 0;
		maxPrice = 1000;
		updateUrl();
		// Recharger les produits sans filtres
		await filterProducts();
	}

	// Fonction pour sélectionner une ville (sans déclencher le filtrage)
	function handleCitySelect(city: CitySuggestion | null) {
		selectedCitySuggestion = city;
		updateUrl();
		// Ne pas fermer le popover automatiquement, l'utilisateur peut continuer à modifier
	}

	// Fonction pour sélectionner un type de gâteau (sans déclencher le filtrage)
	function handleCakeTypeSelect(cakeType: string) {
		selectedCakeType = selectedCakeType === cakeType ? '' : cakeType;
		updateUrl();
		// Fermer le popover après la sélection
		activeField = null;
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
		
		// Ajouter les prix si modifiés
		if (minPrice > 0) {
			params.set('minPrice', minPrice.toString());
		}
		if (maxPrice < 1000) {
			params.set('maxPrice', maxPrice.toString());
		}

		// Mettre à jour l'URL sans recharger la page
		const queryString = params.toString();
		const newUrl = queryString
			? `/gateaux?${queryString}`
			: '/gateaux';
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
			if (minPrice > 0) {
				params.set('minPrice', minPrice.toString());
			}
			if (maxPrice < 1000) {
				params.set('maxPrice', maxPrice.toString());
			}
			params.set('page', nextPage.toString());

			const response = await fetch(`/gateaux/api?${params.toString()}`);
			if (!response.ok) throw new Error('Failed to load next page');

			const result = await response.json();
			const newProducts = result.products || [];
			
			// ✅ Valider les images des nouveaux produits avant de les afficher
			// Cela évite les erreurs 404 dans la console et les flashes d'images cassées
			await validateNewProductsImages(newProducts);
			
			// Ajouter les nouveaux produits à la liste (les images invalides sont déjà marquées)
			displayedProducts = [...displayedProducts, ...newProducts];
			currentPage = result.pagination.page;
			hasMore = result.pagination.hasMore;
			// Le total ne change pas quand on charge plus de pages, mais on le met à jour au cas où
			if (result.pagination?.total !== undefined) {
				_totalProducts = result.pagination.total;
			}

			// Animations pour les nouveaux éléments (infinite scroll - très rapide)
			if (resultsContainer) {
				await revealStagger(resultsContainer, ':scope > div', { delay: 0, stagger: 0.01, translateY: 5, duration: 0.2 });
			}
		} catch (error) {
			console.error('Erreur lors du chargement de la page suivante:', error);
		} finally {
			isLoadingMore = false;
		}
	}

	onMount(() => {
		// Fonction asynchrone pour l'initialisation
		async function initialize() {
			// Initialiser avec les paramètres de l'URL
			await initializeFiltersFromUrl();

			// Si on a des produits initiaux depuis le serveur, les valider avant de les afficher
			if (data.products && data.products.length > 0) {
				await validateNewProductsImages(data.products, true); // true = chargement initial
				displayedProducts = data.products;
				currentPage = data.pagination?.page || 1;
				hasMore = data.pagination?.hasMore || false;
				_totalProducts = data.pagination?.total || 0;
			} else {
				// Sinon, recharger les produits depuis le serveur avec les filtres de l'URL
				await filterProducts();
			}
			
			// Marquer que l'initialisation est terminée
			hasInitialized = true;

			// Animations initiales
			if (resultsContainer) {
				await revealStagger(resultsContainer, ':scope > div', {
					delay: 0.1,
					stagger: 0.05,
				});
			}
		}

		// Lancer l'initialisation
		initialize();

		// Configurer l'Intersection Observer pour infinite scroll
		setupInfiniteScroll();

		// Gérer les clics extérieurs pour fermer les popovers
		document.addEventListener('click', handleClickOutside);
		
		// Gérer le scroll pour cacher/afficher la barre de recherche
		function handleScroll() {
			// Ne pas cacher la barre si un popover est ouvert
			if (activeField !== null) {
				return;
			}
			
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
			if (scrollObserver) {
				scrollObserver.disconnect();
				scrollObserver = null;
			}
			document.removeEventListener('click', handleClickOutside);
			window.removeEventListener('scroll', handleScroll);
		};
	});

	// Fonction pour configurer/réinitialiser l'infinite scroll
	function setupInfiniteScroll() {
		// Nettoyer l'observer existant
		if (scrollObserver) {
			scrollObserver.disconnect();
			scrollObserver = null;
		}

		// Créer un nouvel observer si le sentinel existe
		if (typeof IntersectionObserver !== 'undefined' && sentinelElement) {
			scrollObserver = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
						loadNextPage();
					}
				},
				{ rootMargin: '200px' }
			);

			scrollObserver.observe(sentinelElement);
		}
	}

	// Réinitialiser l'observer quand le sentinel change
	$: if (sentinelElement && hasMore) {
		setupInfiniteScroll();
	}

	// Réagir aux changements de navigation (pour gérer le bouton retour du navigateur)
	afterNavigate(async ({ to }) => {
		// Si on revient sur la page /gateaux, réinitialiser les filtres depuis l'URL
		if (to?.url.pathname === '/gateaux') {
			await initializeFiltersFromUrl();
			// Recharger les produits depuis le serveur avec les filtres de l'URL
			await filterProducts();
			// Réinitialiser l'infinite scroll
			setTimeout(() => {
				setupInfiniteScroll();
			}, 100);
		}
	});

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
	<meta property="og:url" content="https://pattyly.com/gateaux" />
	<link rel="canonical" href="https://pattyly.com/gateaux" />
</svelte:head>

<div class="flex flex-col">
	<!-- H1 masqué pour le SEO -->
	<h1 class="sr-only">
		Tous les gâteaux - Catalogue complet de pâtisseries | {WebsiteName}
	</h1>

	<!-- Hero Search Bar style Airbnb -->
	<section 
		class="sticky top-0 z-40 border-b border-neutral-200 bg-white pt-20 shadow-sm transition-all duration-500 ease-in-out {isSearchBarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}"
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
							{selectedCakeType || 'Tous les gâteaux'}
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
										Tous les gâteaux
									</button>
									{#each cakeTypes as cakeType}
										<button
											on:click={() => {
												handleCakeTypeSelect(cakeType);
											}}
											class="rounded-full border px-4 py-2 text-sm font-medium transition-all hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 {selectedCakeType === cakeType
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
								
								<!-- Filtre prix -->
								<div>
									<p class="text-sm font-medium text-neutral-700 mb-2">Prix</p>
									<div class="flex items-center gap-3">
										<div class="flex-1">
											<p class="text-xs text-neutral-500 mb-1">Min</p>
											<input
												type="number"
												bind:value={minPrice}
												min="0"
												max="1000"
												class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#FF6F61] focus:outline-none focus:ring-1 focus:ring-[#FF6F61]"
												placeholder="0"
												aria-label="Prix minimum"
											/>
										</div>
										<div class="flex-1">
											<p class="text-xs text-neutral-500 mb-1">Max</p>
											<input
												type="number"
												bind:value={maxPrice}
												min="0"
												max="1000"
												class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#FF6F61] focus:outline-none focus:ring-1 focus:ring-[#FF6F61]"
												placeholder="1000"
												aria-label="Prix maximum"
											/>
										</div>
									</div>
								</div>

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
										await filterProducts();
										closeAllFields();
									}}
									class="w-full rounded-lg bg-[#FF6F61] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#e85a4f]"
								>
									Valider
								</button>

								<!-- Bouton réinitialiser -->
								{#if selectedCitySuggestion || selectedCakeType || showOnlyVerified || minPrice > 0 || maxPrice < 1000}
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
							await filterProducts();
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
	<section
		class="relative overflow-hidden bg-white pt-8 pb-12 sm:pt-10 sm:pb-16 md:pt-12 md:pb-24"
	>
		<div class="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
			<!-- Div de chargement -->
			{#if isInitialLoading}
				<div class="flex items-center justify-center py-24">
					<div class="flex flex-col items-center gap-4">
						<div class="h-12 w-12 animate-spin rounded-full border-4 border-[#FF6F61] border-t-transparent"></div>
						<p class="text-sm font-medium text-neutral-600">Chargement des gâteaux...</p>
					</div>
				</div>
			{/if}

			<!-- Grille de résultats style Airbnb -->
			{#if !isInitialLoading}
				<div
					bind:this={resultsContainer}
					class="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
				>
					{#each visibleProducts as product}
					<a
						href="/{product.shop.slug}/product/{product.id}?from=app"
						class="group relative flex cursor-pointer flex-col max-w-[280px] mx-auto"
					>
						<!-- Image du gâteau -->
						<div class="relative mb-1.5 aspect-square w-full overflow-hidden rounded-3xl bg-neutral-100">
							{#if product.image_url}
								<img
									src={product.image_url}
									alt={product.name}
									class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
									on:error={() => handleImageError(product.id)}
								/>
							{/if}
						<!-- Badge vérifié (si shop premium) -->
						{#if product.shop.isPremium}
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
							<!-- Nom du produit -->
							<p class="mb-0.5 text-xs font-semibold text-neutral-900 line-clamp-2 leading-tight">
										{product.name}
							</p>

							<!-- Localisation -->
							<div class=" flex items-center gap-0.5 text-[10px] text-neutral-500">
								<MapPin class="h-2.5 w-2.5 shrink-0" />
								<span class="truncate">{product.shop.actualCity || product.shop.city}</span>
							</div>

							<!-- Prix -->
							<div class="flex items-baseline gap-1">
								<span class="text-[10px] text-neutral-500">à partir de</span>
								<span class="text-xs font-semibold text-neutral-500">
									{new Intl.NumberFormat('fr-FR', {
										style: 'currency',
										currency: 'EUR',
										minimumFractionDigits: 0,
										maximumFractionDigits: 0
									}).format(product.base_price)}
								</span>
								</div>
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

			<!-- Message si aucun résultat (seulement après le chargement initial) -->
			{#if !isInitialLoading && visibleProducts.length === 0 && displayedProducts.length === 0}
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
					<a href="/gateaux?page={pageNum}" rel="next">Page {pageNum}</a>
				{/if}
			{/each}
		</nav>
	{/if}
</div>
