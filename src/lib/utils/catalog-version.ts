import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Incrémente la version du catalogue d'une boutique
 * Cette fonction doit être appelée à chaque modification du shop ou des produits
 * pour invalider le cache public
 */
export async function incrementCatalogVersion(
    supabase: SupabaseClient,
    shopId: string
): Promise<void> {
    try {
        // Étape 1 : récupérer la version actuelle
        const { data, error: fetchError } = await supabase
            .from('shops')
            .select('catalog_version')
            .eq('id', shopId)
            .single();

        if (fetchError || !data) {
            console.error('Error fetching catalog version:', fetchError);
            throw new Error('Failed to fetch current catalog version');
        }

        // Étape 2 : incrémenter la version
        const { error: updateError } = await supabase
            .from('shops')
            .update({
                catalog_version: data.catalog_version + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', shopId);

        if (updateError) {
            console.error('Error incrementing catalog version:', updateError);
            throw new Error('Failed to increment catalog version');
        }
    } catch (error) {
        console.error('Error in incrementCatalogVersion:', error);
        throw error;
    }
}

/**
 * Récupère la version actuelle du catalogue d'une boutique
 */
export async function getCatalogVersion(
    supabase: SupabaseClient,
    shopId: string
): Promise<number> {
    try {
        const { data, error } = await supabase
            .from('shops')
            .select('catalog_version')
            .eq('id', shopId)
            .single();

        if (error) {
            console.error('Error getting catalog version:', error);
            return 1; // fallback si jamais la requête échoue
        }

        return data?.catalog_version || 1;
    } catch (error) {
        console.error('Error in getCatalogVersion:', error);
        return 1; // fallback si erreur JS
    }
}
