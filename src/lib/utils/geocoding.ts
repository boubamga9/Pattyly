/**
 * Utilitaires de géocodage pour les shops
 * Utilise l'API Nominatim (OpenStreetMap) pour géocoder les villes
 */

/**
 * Géocode une ville avec code postal en utilisant Nominatim (OpenStreetMap)
 * @param cityName - Nom de la ville
 * @param postalCode - Code postal (optionnel, améliore la précision)
 * @returns Coordonnées [latitude, longitude] ou null si échec
 */
export async function geocodeCity(
	cityName: string,
	postalCode?: string | null
): Promise<[number, number] | null> {
	if (!cityName || cityName.trim().length === 0) {
		return null;
	}

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
			}
		);

		if (!response.ok) {
			console.warn(`⚠️  [Geocoding] Erreur HTTP ${response.status} pour ${query}`);
			return null;
		}

		const data = await response.json();
		if (data && data.length > 0) {
			const lat = parseFloat(data[0].lat);
			const lon = parseFloat(data[0].lon);

			if (!isNaN(lat) && !isNaN(lon)) {
				return [lat, lon];
			}
		}

		return null;
	} catch (error) {
		console.error(`❌ [Geocoding] Erreur de géocodage pour ${cityName}:`, error);
		return null;
	}
}

/**
 * Met à jour les coordonnées GPS d'un shop via la fonction RPC
 * @param supabase - Client Supabase
 * @param shopId - ID du shop
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @returns true si succès, false sinon
 */
export async function updateShopCoordinates(
	supabase: any,
	shopId: string,
	latitude: number,
	longitude: number
): Promise<boolean> {
	try {
		const { error } = await supabase.rpc('update_shop_coordinates', {
			p_shop_id: shopId,
			p_latitude: latitude,
			p_longitude: longitude
		});

		if (error) {
			console.error(`❌ [Geocoding] Erreur lors de la mise à jour des coordonnées pour ${shopId}:`, error);
			return false;
		}

		return true;
	} catch (error) {
		console.error(`❌ [Geocoding] Erreur lors de la mise à jour des coordonnées pour ${shopId}:`, error);
		return false;
	}
}

/**
 * Géocode automatiquement un shop si les informations de localisation sont disponibles
 * @param supabase - Client Supabase
 * @param shopId - ID du shop
 * @param cityName - Nom de la ville (directory_actual_city ou directory_city)
 * @param postalCode - Code postal (optionnel)
 * @returns true si géocodage réussi, false sinon
 */
export async function geocodeShopIfNeeded(
	supabase: any,
	shopId: string,
	cityName: string | null | undefined,
	postalCode?: string | null
): Promise<boolean> {
	if (!cityName || cityName.trim().length === 0) {
		return false;
	}

	const coordinates = await geocodeCity(cityName, postalCode);

	if (!coordinates) {
		console.warn(`⚠️  [Geocoding] Impossible de géocoder ${cityName} pour le shop ${shopId}`);
		return false;
	}

	const [latitude, longitude] = coordinates;
	const success = await updateShopCoordinates(supabase, shopId, latitude, longitude);

	if (success) {
		console.log(`✅ [Geocoding] Coordonnées mises à jour pour le shop ${shopId}: ${latitude}, ${longitude}`);
	}

	return success;
}

