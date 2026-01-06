import { ResendContactsService } from '$lib/services/resend-contacts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserPermissions } from '$lib/auth';

/**
 * Synchronise les données d'un pâtissier avec Resend
 */
export async function syncPastryToResend(
    profileId: string,
    email: string,
    supabase: SupabaseClient
) {
    try {
        // Récupérer les permissions pour obtenir le plan
        const permissions = await getUserPermissions(profileId, supabase);
        
        // Récupérer les données de la boutique
        const { data: shop } = await supabase
            .from('shops')
            .select('name, slug, directory_enabled')
            .eq('profile_id', profileId)
            .single();

        if (!shop) {
            console.warn('Pas de boutique trouvée pour le profil:', profileId);
            return { success: false, error: 'Shop not found' };
        }

        // Mapper le plan
        const planMap: Record<string, string> = {
            'free': 'free',
            'basic': 'starter',
            'premium': 'premium',
            'exempt': 'exempt'
        };
        const currentPlan = planMap[permissions.plan] || 'free';

        // Synchroniser avec Resend
        await ResendContactsService.upsertContact({
            email,
            current_plan: currentPlan,
            visible_in_listing_page: shop.directory_enabled || false,
            shop_name: shop.name,
            shop_slug: shop.slug,
            unsubscribed: false,
        });

        return { success: true };
    } catch (error) {
        console.error('Erreur syncPastryToResend:', error);
        return { success: false, error };
    }
}

