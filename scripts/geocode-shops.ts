import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
// Priorité : .env.production.local > .env.local
const envFile = process.env.NODE_ENV === 'production' 
	? '.env.production.local' 
	: '.env.local';
dotenv.config({ path: envFile });

// Fallback sur .env.local si .env.production.local n'existe pas
if (!process.env.PUBLIC_SUPABASE_URL) {
	dotenv.config({ path: '.env.local' });
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.error('❌ Variables d\'environnement Supabase manquantes !');
	console.error('Assure-toi que PUBLIC_SUPABASE_URL et PUBLIC_SUPABASE_ANON_KEY sont définies dans .env.local');
	process.exit(1);
}

// Créer le client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Shop {
	id: string;
	name: string;
	directory_actual_city: string | null;
	directory_city: string | null;
	directory_postal_code: string | null;
	latitude: number | null;
	longitude: number | null;
}

/**
 * Géocode une ville avec code postal en utilisant Nominatim (OpenStreetMap)
 */
async function geocodeCity(
	cityName: string,
	postalCode?: string | null
): Promise<[number, number] | null> {
	try {
		const query = postalCode
			? `${postalCode} ${cityName}, France`
			: `${cityName}, France`;

		// Respecter le rate limiting de Nominatim (1 requête par seconde)
		await new Promise(resolve => setTimeout(resolve, 1100));

		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=fr`,
			{
				headers: {
					'User-Agent': 'Pattyly/1.0 (geocoding script)',
				},
			}
		);

		if (!response.ok) {
			console.warn(`⚠️  Erreur HTTP ${response.status} pour ${query}`);
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
		console.error(`❌ Erreur de géocodage pour ${cityName}:`, error);
		return null;
	}
}

/**
 * Met à jour les coordonnées d'un shop via la fonction RPC
 */
async function updateShopCoordinates(
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
			console.error(`❌ Erreur lors de la mise à jour des coordonnées pour ${shopId}:`, error);
			return false;
		}

		return true;
	} catch (error) {
		console.error(`❌ Erreur lors de la mise à jour des coordonnées pour ${shopId}:`, error);
		return false;
	}
}

/**
 * Géocode tous les shops qui n'ont pas encore de coordonnées
 */
async function geocodeShops() {
	console.log('🚀 Début du géocodage des shops...\n');

	try {
		// Récupérer tous les shops avec directory_enabled = true qui n'ont pas de coordonnées
		const { data: shops, error: shopsError } = await supabase
			.from('shops')
			.select('id, name, directory_actual_city, directory_city, directory_postal_code, latitude, longitude')
			.eq('directory_enabled', true)
			.or('latitude.is.null,longitude.is.null');

		if (shopsError) {
			console.error('❌ Erreur lors de la récupération des shops:', shopsError);
			process.exit(1);
		}

		if (!shops || shops.length === 0) {
			console.log('✅ Tous les shops ont déjà des coordonnées !');
			return;
		}

		console.log(`📋 ${shops.length} shop(s) à géocoder\n`);

		let successCount = 0;
		let errorCount = 0;
		const errors: Array<{ shop: string; error: string }> = [];

		for (let i = 0; i < shops.length; i++) {
			const shop = shops[i] as Shop;
			const cityName = shop.directory_actual_city || shop.directory_city;

			if (!cityName) {
				console.log(`⚠️  [${i + 1}/${shops.length}] ${shop.name}: Pas de ville définie, ignoré`);
				errorCount++;
				errors.push({
					shop: shop.name,
					error: 'Pas de ville définie'
				});
				continue;
			}

			console.log(`📍 [${i + 1}/${shops.length}] Géocodage de ${shop.name} (${cityName}${shop.directory_postal_code ? `, ${shop.directory_postal_code}` : ''})...`);

			const coordinates = await geocodeCity(cityName, shop.directory_postal_code);

			if (!coordinates) {
				console.log(`  ❌ Impossible de géocoder ${shop.name}`);
				errorCount++;
				errors.push({
					shop: shop.name,
					error: 'Géocodage échoué'
				});
				continue;
			}

			const [latitude, longitude] = coordinates;
			console.log(`  ✓ Coordonnées trouvées: ${latitude}, ${longitude}`);

			const updated = await updateShopCoordinates(shop.id, latitude, longitude);

			if (updated) {
				console.log(`  ✅ Coordonnées mises à jour pour ${shop.name}\n`);
				successCount++;
			} else {
				console.log(`  ❌ Échec de la mise à jour pour ${shop.name}\n`);
				errorCount++;
				errors.push({
					shop: shop.name,
					error: 'Échec de la mise à jour en base'
				});
			}
		}

		// Résumé
		console.log('\n' + '='.repeat(50));
		console.log('📊 RÉSUMÉ');
		console.log('='.repeat(50));
		console.log(`✅ Succès: ${successCount}`);
		console.log(`❌ Erreurs: ${errorCount}`);
		console.log(`📋 Total: ${shops.length}`);

		if (errors.length > 0) {
			console.log('\n⚠️  Shops en erreur:');
			errors.forEach(({ shop, error }) => {
				console.log(`  - ${shop}: ${error}`);
			});
		}

		console.log('\n✨ Géocodage terminé !');
	} catch (error) {
		console.error('❌ Erreur fatale lors du géocodage:', error);
		process.exit(1);
	}
}

// Exécuter le script
geocodeShops()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n💥 Erreur fatale:', error);
		process.exit(1);
	});

