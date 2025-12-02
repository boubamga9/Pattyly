<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	
	// Import dynamique de Leaflet uniquement côté client
	let L: any = null;
	let markerClusterLoaded = false;

	export let shops: Array<{
		id: string;
		name: string;
		slug: string;
		city: string; // Grande ville pour le filtrage
		actualCity?: string; // Ville précise pour le placement sur la carte (optionnel, fallback sur city)
		postalCode: string;
		specialties: string[];
		logo: string;
		isPremium?: boolean;
		latitude?: number | null; // Coordonnées GPS stockées en base (optionnel)
		longitude?: number | null; // Coordonnées GPS stockées en base (optionnel)
	}> = [];

	export let cityName: string = '';

	let mapContainer: HTMLDivElement;
	let map: any = null;
	let markerClusterGroup: any = null;
	let isLoading = true;

	// Cache pour les coordonnées géocodées (évite de refaire les appels API)
	const geocodedCoordinates: Map<string, [number, number]> = new Map();

	// Coordonnées approximatives des grandes villes françaises (fallback)
	const cityCoordinates: Record<string, [number, number]> = {
		'Paris': [48.8566, 2.3522],
		'Lyon': [45.7640, 4.8357],
		'Marseille': [43.2965, 5.3698],
		'Toulouse': [43.6047, 1.4442],
		'Nice': [43.7102, 7.2620],
		'Nantes': [47.2184, -1.5536],
		'Strasbourg': [48.5734, 7.7521],
		'Montpellier': [43.6108, 3.8767],
		'Bordeaux': [44.8378, -0.5792],
		'Lille': [50.6292, 3.0573],
		'Rennes': [48.1173, -1.6778],
		'Reims': [49.2583, 4.0317],
	};

	// Géocoder une ville avec Nominatim (gratuit, OpenStreetMap)
	async function geocodeCity(cityName: string, postalCode?: string): Promise<[number, number] | null> {
		// Vérifier le cache
		const cacheKey = `${cityName}_${postalCode || ''}`;
		if (geocodedCoordinates.has(cacheKey)) {
			return geocodedCoordinates.get(cacheKey)!;
		}

		// Vérifier les grandes villes en premier
		if (cityCoordinates[cityName]) {
			geocodedCoordinates.set(cacheKey, cityCoordinates[cityName]);
			return cityCoordinates[cityName];
		}

		try {
			// Construire la requête de géocodage
			const query = postalCode 
				? `${postalCode} ${cityName}, France`
				: `${cityName}, France`;
			
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=fr`,
				{
					headers: {
						'User-Agent': 'Pattyly/1.0' // Requis par Nominatim
					}
				}
			);

			if (!response.ok) {
				console.warn(`Géocodage échoué pour ${cityName}`);
				return null;
			}

			const data = await response.json();
			
			if (data && data.length > 0) {
				const coords: [number, number] = [
					parseFloat(data[0].lat),
					parseFloat(data[0].lon)
				];
				geocodedCoordinates.set(cacheKey, coords);
				return coords;
			}
		} catch (error) {
			console.error(`Erreur de géocodage pour ${cityName}:`, error);
		}

		return null;
	}

	// Obtenir les coordonnées de la grande ville (fallback)
	function getCityCoordinates(): [number, number] {
		return cityCoordinates[cityName] || cityCoordinates['Paris'];
	}

	// Créer une icône personnalisée pour les markers
	function createCustomIcon(shop: typeof shops[0]) {
		if (!L) return null;
		return L.divIcon({
			className: 'custom-marker',
			html: `
				<div class="relative flex items-center justify-center">
					<div class="absolute h-12 w-12 rounded-full bg-white shadow-lg border-2 ${shop.isPremium ? 'border-[#FF6F61]' : 'border-neutral-300'}"></div>
					<img 
						src="${shop.logo}" 
						alt="${shop.name}"
						class="relative h-10 w-10 rounded-full object-cover"
						onerror="this.src='/images/logo_icone.svg'"
					/>
				</div>
			`,
			iconSize: [48, 48],
			iconAnchor: [24, 24],
			popupAnchor: [0, -24],
		});
	}

	// Fonction pour mettre à jour les markers
	async function updateMarkers() {
		if (!map || !markerClusterGroup || !L) return;

		// Supprimer tous les markers existants
		markerClusterGroup.clearLayers();

		// Supprimer les cercles existants
		if (map) {
			map.eachLayer((layer: any) => {
				if (layer instanceof L.Circle) {
					map.removeLayer(layer);
				}
			});
		}

		// Ajouter les nouveaux markers
		for (const shop of shops) {
			// ✅ Utiliser les coordonnées stockées en base si disponibles
			let finalCoords: [number, number] | null = null;
			
			if (shop.latitude && shop.longitude) {
				// Utiliser les coordonnées GPS stockées en base
				finalCoords = [shop.latitude, shop.longitude];
			} else {
				// Fallback : géocoder à la volée si pas de coordonnées en base
			const shopCity = shop.actualCity || shop.city || cityName;
			const coords = await geocodeCity(shopCity, shop.postalCode);
				finalCoords = coords || getCityCoordinates();
			}
			
			// Ajouter un petit décalage aléatoire seulement si plusieurs shops dans la même ville précise
			const shopActualCity = shop.actualCity || shop.city;
			const shopsInSameCity = shops.filter(s => (s.actualCity || s.city) === shopActualCity).length;
			const offsetLat = shopsInSameCity > 1 ? (Math.random() - 0.5) * 0.01 : 0;
			const offsetLng = shopsInSameCity > 1 ? (Math.random() - 0.5) * 0.01 : 0;
			
			const icon = createCustomIcon(shop);
			if (!icon) continue;
			
			const marker = L.marker([finalCoords[0] + offsetLat, finalCoords[1] + offsetLng], {
				icon: icon,
			});

			// Créer le popup
			const specialties = shop.specialties.slice(0, 3).join(', ');
			const verifiedBadge = shop.isPremium ? `
				<div class="flex items-center gap-1.5">
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
			` : '';
			const popupContent = `
				<div class="relative p-4 min-w-[200px] pr-8">
					<div class="mb-2 flex items-center gap-2">
						<img src="${shop.logo}" alt="${shop.name}" class="h-8 w-8 rounded-full object-cover" onerror="this.src='/images/logo_icone.svg'" />
						<div class="flex items-center gap-2">
							<h3 class="font-semibold text-neutral-900">${shop.name}</h3>
							${verifiedBadge}
						</div>
					</div>
					<div class="mb-2 flex items-center gap-1 text-sm text-neutral-600">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						<span>${shop.actualCity || shop.city}</span>
					</div>
					${specialties ? `<p class="mb-2 text-xs text-neutral-500">${specialties}</p>` : ''}
					<a href="/${shop.slug}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block rounded-lg bg-[#FF6F61] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#e85a4f]">
						Voir la boutique
					</a>
				</div>
			`;
			marker.bindPopup(popupContent, {
				closeButton: true,
				className: 'custom-popup',
				autoClose: false, // Empêcher la fermeture automatique quand une autre popup s'ouvre
				closeOnClick: false, // Empêcher la fermeture au clic sur la carte
				closeOnEscapeKey: true, // Permettre la fermeture avec Échap
				autoPan: true, // Centrer la carte sur la popup
				autoPanPadding: [50, 50] // Padding pour le centrage
			});
			
			// Ouvrir la popup au clic et empêcher la propagation
			marker.on('click', (e: any) => {
				if (e.originalEvent) {
					e.originalEvent.stopPropagation();
					e.originalEvent.stopImmediatePropagation();
				}
				// Ouvrir la popup manuellement pour s'assurer qu'elle reste ouverte
				setTimeout(() => {
					if (marker && !marker.isPopupOpen()) {
						marker.openPopup();
					}
				}, 10);
			});
			
			markerClusterGroup.addLayer(marker);
		}

		// Ajuster la vue pour inclure tous les markers
		if (shops.length > 0) {
			const bounds = markerClusterGroup.getBounds();
			if (bounds.isValid()) {
				map.fitBounds(bounds, {
					padding: [50, 50],
					maxZoom: 14,
				});

				// Ajouter une zone géographique approximative
				const center = bounds.getCenter();
				const circle = L.circle([center.lat, center.lng], {
					color: '#FF6F61',
					fillColor: '#FFE8D6',
					fillOpacity: 0.2,
					radius: bounds.getNorthEast().distanceTo(center) || 5000,
					weight: 2,
				}).addTo(map);
			}
		} else {
			// Si aucun shop, recentrer sur la ville
			const coords = getCityCoordinates();
			map.setView(coords, 12);
		}
	}

	onMount(async () => {
		if (!browser) return;
		
		// Attendre que le DOM soit complètement rendu
		await tick();
		
		if (!mapContainer) return;

		// Importer Leaflet uniquement côté client
		if (!L) {
			const leafletModule = await import('leaflet');
			L = leafletModule.default;
			
		// Importer les styles CSS (doit être fait avant l'initialisation)
		await import('leaflet/dist/leaflet.css');
		await import('leaflet.markercluster/dist/MarkerCluster.css');
		await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
		await import('leaflet-gesture-handling/dist/leaflet-gesture-handling.css');
		}

		// Importer leaflet.markercluster
		if (!markerClusterLoaded) {
			await import('leaflet.markercluster');
			markerClusterLoaded = true;
		}

		// Importer leaflet-gesture-handling pour le "two-finger panning"
		await import('leaflet-gesture-handling');

		if (!L || !mapContainer) return;

		// Attendre un peu pour s'assurer que les CSS sont chargés
		await new Promise(resolve => setTimeout(resolve, 150));

		// Calculer le centre initial (moyenne des coordonnées des shops ou grande ville)
		let initialCenter: [number, number];
		if (shops.length > 0 && shops[0].city) {
			const firstShopCoords = await geocodeCity(shops[0].city, shops[0].postalCode);
			initialCenter = firstShopCoords || getCityCoordinates();
		} else {
			initialCenter = getCityCoordinates();
		}

		// Initialiser la carte avec gestureHandling pour le "two-finger panning"
		// 1 doigt = scroll de la page, 2 doigts = déplacer la map (comme Google Maps)
		map = L.map(mapContainer, {
			center: initialCenter,
			zoom: 12,
			zoomControl: true,
			closePopupOnClick: false, // Empêcher la fermeture des popups au clic sur la carte
			gestureHandling: true, // Active le mode "two-finger panning" (comme Google Maps)
		});

		// Ajouter la couche OpenStreetMap
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors',
			maxZoom: 19,
			subdomains: ['a', 'b', 'c'],
		}).addTo(map);

		// Forcer la mise à jour de la taille de la carte
		setTimeout(() => {
			if (map) {
				map.invalidateSize();
			}
		}, 200);

		// Créer un groupe de clusters
		// @ts-ignore - leaflet.markercluster ajoute cette méthode à L
		markerClusterGroup = (L as any).markerClusterGroup({
			chunkedLoading: true,
			spiderfyOnMaxZoom: true,
			showCoverageOnHover: false,
			zoomToBoundsOnClick: false, // Désactiver pour éviter la fermeture des popups
			maxClusterRadius: 50,
		});

		// Géocoder toutes les villes et ajouter les markers
		const markers: any[] = [];
		
		for (const shop of shops) {
			// ✅ Utiliser les coordonnées stockées en base si disponibles
			let finalCoords: [number, number] | null = null;
			
			if (shop.latitude && shop.longitude) {
				// Utiliser les coordonnées GPS stockées en base
				finalCoords = [shop.latitude, shop.longitude];
			} else {
				// Fallback : géocoder à la volée si pas de coordonnées en base
			const shopCity = shop.actualCity || shop.city || cityName;
			const coords = await geocodeCity(shopCity, shop.postalCode);
				finalCoords = coords || getCityCoordinates();
			}
			
			// Ajouter un petit décalage aléatoire seulement si plusieurs shops dans la même ville précise
			const shopActualCity = shop.actualCity || shop.city;
			const shopsInSameCity = shops.filter(s => (s.actualCity || s.city) === shopActualCity).length;
			const offsetLat = shopsInSameCity > 1 ? (Math.random() - 0.5) * 0.01 : 0;
			const offsetLng = shopsInSameCity > 1 ? (Math.random() - 0.5) * 0.01 : 0;
			
			const icon = createCustomIcon(shop);
			if (!icon) continue;
			
			const marker = L.marker([finalCoords[0] + offsetLat, finalCoords[1] + offsetLng], {
				icon: icon,
			});

			// Créer le popup
			const specialties = shop.specialties.slice(0, 3).join(', ');
			const verifiedBadge = shop.isPremium ? `
				<div class="flex items-center gap-1.5">
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
			` : '';
			const popupContent = `
				<div class="relative p-4 min-w-[200px] pr-8">
					<div class="mb-2 flex items-center gap-2">
						<img src="${shop.logo}" alt="${shop.name}" class="h-8 w-8 rounded-full object-cover" onerror="this.src='/images/logo_icone.svg'" />
						<div class="flex items-center gap-2">
							<h3 class="font-semibold text-neutral-900">${shop.name}</h3>
							${verifiedBadge}
						</div>
					</div>
					<div class="mb-2 flex items-center gap-1 text-sm text-neutral-600">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						<span>${shop.actualCity || shop.city}</span>
					</div>
					${specialties ? `<p class="mb-2 text-xs text-neutral-500">${specialties}</p>` : ''}
					<a href="/${shop.slug}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block rounded-lg bg-[#FF6F61] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#e85a4f]">
						Voir la boutique
					</a>
				</div>
			`;
			marker.bindPopup(popupContent, {
				closeButton: true,
				className: 'custom-popup',
				autoClose: false, // Empêcher la fermeture automatique quand une autre popup s'ouvre
				closeOnClick: false, // Empêcher la fermeture au clic sur la carte
				closeOnEscapeKey: true, // Permettre la fermeture avec Échap
				autoPan: true, // Centrer la carte sur la popup
				autoPanPadding: [50, 50] // Padding pour le centrage
			});
			
			// Ouvrir la popup au clic et empêcher la propagation
			marker.on('click', (e: any) => {
				if (e.originalEvent) {
					e.originalEvent.stopPropagation();
					e.originalEvent.stopImmediatePropagation();
				}
				// Ouvrir la popup manuellement pour s'assurer qu'elle reste ouverte
				setTimeout(() => {
					if (marker && !marker.isPopupOpen()) {
						marker.openPopup();
					}
				}, 10);
			});
			
			markers.push(marker);
			markerClusterGroup.addLayer(marker);
		}

		// Ajouter le groupe de clusters à la carte
		map.addLayer(markerClusterGroup);
		
		// Empêcher la fermeture des popups au clic sur la carte ou les clusters
		map.on('click', () => {
			// Ne rien faire - les popups restent ouvertes
		});
		
		// Empêcher la fermeture des popups quand on clique sur un cluster
		markerClusterGroup.on('clusterclick', (e: any) => {
			e.originalEvent?.stopPropagation();
		});

		// Ajuster la vue pour inclure tous les markers
		if (shops.length > 0) {
			map.fitBounds(markerClusterGroup.getBounds(), {
				padding: [50, 50],
				maxZoom: 14,
			});
		}

		// Ajouter une zone géographique approximative (cercle autour du centre de la carte)
		if (shops.length > 0) {
			const bounds = markerClusterGroup.getBounds();
			if (bounds.isValid()) {
				const center = bounds.getCenter();
				const circle = L.circle([center.lat, center.lng], {
					color: '#FF6F61',
					fillColor: '#FFE8D6',
					fillOpacity: 0.2,
					radius: bounds.getNorthEast().distanceTo(center) || 5000, // Rayon basé sur les markers
					weight: 2,
				}).addTo(map);
			}
		}

		mapInitialized = true;
		isLoading = false;
		
		// Forcer une dernière mise à jour de la taille après le chargement complet
		setTimeout(() => {
			if (map) {
				map.invalidateSize();
			}
		}, 500);
	});

	// Mettre à jour les markers quand shops change (après l'initialisation)
	let mapInitialized = false;
	$: if (mapInitialized && map && markerClusterGroup && shops) {
		updateMarkers();
	}

	onDestroy(() => {
		if (browser && map) {
			map.remove();
			map = null;
		}
		if (browser && markerClusterGroup) {
			markerClusterGroup.clearLayers();
			markerClusterGroup = null;
		}
	});
</script>

<div class="relative h-screen w-full overflow-hidden bg-neutral-100" style="z-index: 1;">
	{#if isLoading}
		<div class="absolute inset-0 z-10 flex items-center justify-center bg-neutral-50" style="z-index: 10;">
			<div class="text-center">
				<div class="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-[#FF6F61] border-t-transparent mx-auto"></div>
				<p class="text-sm text-neutral-600">Chargement de la carte...</p>
			</div>
		</div>
	{/if}
	<div 
		bind:this={mapContainer} 
		class="h-full w-full {isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300"
		style="z-index: 1;"
	></div>
</div>

<style>
	:global(.custom-marker) {
		background: transparent !important;
		border: none !important;
	}

	:global(.leaflet-popup-content-wrapper) {
		border-radius: 0.5rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		overflow: visible;
	}

	:global(.leaflet-popup-content) {
		margin: 0;
	}

	:global(.leaflet-container) {
		background-color: #e5e7eb !important;
		font-family: inherit;
		z-index: 1 !important;
	}
	
	:global(.leaflet-map-pane) {
		z-index: 1 !important;
	}
	
	:global(.leaflet-tile-pane) {
		z-index: 1 !important;
	}
	
	:global(.leaflet-overlay-pane) {
		z-index: 2 !important;
	}
	
	:global(.leaflet-shadow-pane) {
		z-index: 3 !important;
	}
	
	:global(.leaflet-marker-pane) {
		z-index: 4 !important;
	}
	
	:global(.leaflet-tooltip-pane) {
		z-index: 5 !important;
	}
	
	:global(.leaflet-popup-pane) {
		z-index: 6 !important;
	}

	:global(.leaflet-tile-container img) {
		max-width: none !important;
	}

	/* Style pour le bouton de fermeture de la popup */
	:global(.leaflet-popup-close-button) {
		position: absolute !important;
		top: 8px !important;
		right: 8px !important;
		width: 24px !important;
		height: 24px !important;
		text-align: center !important;
		line-height: 24px !important;
		font-size: 18px !important;
		font-weight: bold !important;
		color: #6b7280 !important;
		text-decoration: none !important;
		background: transparent !important;
		border: none !important;
		padding: 0 !important;
		margin: 0 !important;
		z-index: 10 !important;
		transition: color 0.2s ease !important;
	}

	:global(.leaflet-popup-close-button:hover) {
		color: #374151 !important;
		background: transparent !important;
	}

	:global(.custom-popup .leaflet-popup-content-wrapper) {
		position: relative;
		overflow: visible;
	}
</style>
