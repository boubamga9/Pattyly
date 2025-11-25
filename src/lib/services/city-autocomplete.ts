/**
 * Service d'autocomplétion des villes françaises
 * Utilise l'API Adresse de data.gouv.fr (gratuite et officielle)
 * Documentation: https://adresse.data.gouv.fr/api-doc/adresse
 */

export interface CitySuggestion {
	label: string; // Format: "Nom de la ville (Code postal)"
	city: string; // Nom de la ville
	postalCode: string; // Code postal
	coordinates?: {
		lat: number;
		lon: number;
	};
}

export interface ApiAdresseResponse {
	features: Array<{
		properties: {
			label: string;
			city: string;
			postcode: string;
		};
		geometry: {
			coordinates: [number, number]; // [lon, lat]
		};
	}>;
}

/**
 * Recherche des villes avec autocomplétion via l'API Adresse
 * @param query - Texte de recherche (nom de ville ou code postal)
 * @param limit - Nombre maximum de résultats (défaut: 10)
 * @returns Liste de suggestions de villes
 */
export async function searchCities(
	query: string,
	limit: number = 10
): Promise<CitySuggestion[]> {
	if (!query || query.trim().length < 2) {
		return [];
	}

	try {
		// Appel à l'API Adresse de data.gouv.fr
		// type=municipality : uniquement les communes
		// limit : nombre de résultats
		const url = new URL('https://api-adresse.data.gouv.fr/search/');
		url.searchParams.set('q', query.trim());
		url.searchParams.set('type', 'municipality');
		url.searchParams.set('limit', limit.toString());

		const response = await fetch(url.toString(), {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
			},
		});

		if (!response.ok) {
			console.error('❌ [City Autocomplete] API error:', response.status);
			return [];
		}

		const data: ApiAdresseResponse = await response.json();

		// Transformer les résultats en format simplifié
		const suggestions: CitySuggestion[] = data.features.map((feature) => {
			const { label, city, postcode } = feature.properties;
			const [lon, lat] = feature.geometry.coordinates;

			return {
				label: `${city} (${postcode})`,
				city,
				postalCode: postcode,
				coordinates: {
					lat,
					lon,
				},
			};
		});

		// Dédupliquer par ville + code postal (l'API peut retourner des doublons)
		const uniqueSuggestions = suggestions.reduce((acc, current) => {
			const key = `${current.city}-${current.postalCode}`;
			if (!acc.find((item) => `${item.city}-${item.postalCode}` === key)) {
				acc.push(current);
			}
			return acc;
		}, [] as CitySuggestion[]);

		return uniqueSuggestions;
	} catch (error) {
		console.error('❌ [City Autocomplete] Error:', error);
		return [];
	}
}

/**
 * Liste des grandes villes françaises pour le select "grande ville la plus proche"
 * Correspond aux villes proposées dans la page "trouver-un-cake-designer"
 */
export const MAJOR_CITIES = [
	'Paris',
	'Lyon',
	'Marseille',
	'Toulouse',
	'Nice',
	'Nantes',
	'Strasbourg',
	'Montpellier',
	'Bordeaux',
	'Lille',
	'Rennes',
	'Reims',
	'Grenoble',
	'Dijon',
	'Angers',
	'Le Havre',
	'Toulon',
	'Nancy',
	'Rouen',
	'Amiens',
	'Caen',
] as const;

/**
 * Types de gâteaux disponibles pour l'annuaire
 * Doit correspondre exactement aux types proposés dans les pages de l'annuaire
 */
export const CAKE_TYPES = [
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
] as const;

/**
 * Types de gâteaux disponibles pour les formulaires (dashboard et onboarding)
 * Exclut "Gâteau pour événement" car tous les pâtissiers sont visibles sur cette page de toute façon
 */
export const CAKE_TYPES_FOR_FORMS = [
	'Gâteau d\'anniversaire',
	'Gâteau de mariage',
	'Cupcakes',
	'Macarons',
	'Gâteau personnalisé',
	'Gâteau vegan',
	'Gâteau sans gluten',
	'Pâtisserie orientale',
	'Traiteur événementiel',
	'Mignardise',
] as const;

export type CakeType = typeof CAKE_TYPES[number];

