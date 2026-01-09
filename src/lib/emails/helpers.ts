/**
 * Helpers pour les emails
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Récupère la couleur de la boutique depuis les customizations
 * Utilise button_color ou icon_color comme couleur principale
 */
export function getShopColorFromCustomizations(customizations: {
	button_color?: string | null;
	icon_color?: string | null;
} | null | undefined): string | null {
	if (!customizations) return null;
	
	// Prioriser button_color, sinon icon_color, sinon null
	return customizations.button_color || customizations.icon_color || null;
}

/**
 * Récupère la couleur de la boutique depuis shop_id
 * Utilise button_color ou icon_color comme couleur principale
 * Retourne null si la boutique n'a pas de customizations ou si une erreur survient
 */
export async function getShopColorFromShopId(
	supabase: SupabaseClient,
	shopId: string
): Promise<string | null> {
	try {
		const { data: customizations, error } = await supabase
			.from('shop_customizations')
			.select('button_color, icon_color')
			.eq('shop_id', shopId)
			.maybeSingle();

		if (error || !customizations) {
			return null;
		}

		return getShopColorFromCustomizations(customizations);
	} catch (error) {
		// En cas d'erreur, retourner null pour ne pas bloquer l'envoi de l'email
		console.error('Error fetching shop color:', error);
		return null;
	}
}

