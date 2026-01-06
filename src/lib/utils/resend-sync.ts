import { ResendContactsService } from '$lib/services/resend-contacts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserPermissions } from '$lib/auth';

/**
 * Crée un contact dans Resend dès la confirmation de l'email (sans boutique)
 * Permet de relancer les utilisateurs qui n'ont pas créé leur boutique
 */
export async function createPastryInResend(
    profileId: string,
    email: string,
    supabase: SupabaseClient
) {
    try {
        // Récupérer les permissions pour obtenir le plan (sera 'free' par défaut)
        const permissions = await getUserPermissions(profileId, supabase);
        
        // Mapper le plan
        const planMap: Record<string, string> = {
            'free': 'free',
            'basic': 'starter',
            'premium': 'premium',
            'exempt': 'exempt'
        };
        const currentPlan = planMap[permissions.plan] || 'free';

        // Créer le contact dans Resend sans les infos de boutique
        // (sera mis à jour plus tard lors de la création de la boutique)
        await ResendContactsService.upsertContact({
            email,
            current_plan: currentPlan,
            visible_in_listing_page: false,
            shop_name: '',
            shop_slug: '',
            unsubscribed: false,
        });

        return { success: true };
    } catch (error) {
        console.error('Erreur createPastryInResend:', error);
        return { success: false, error };
    }
}

/**
 * Synchronise les données d'un pâtissier avec Resend (avec boutique)
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

        // Convertir directory_enabled en boolean (gérer null, true, false)
        // null ou undefined → false, true → true, false → false
        const isVisibleInListing = shop.directory_enabled === true;

        console.log('🔄 [Resend Sync] Syncing shop data:', {
            profileId,
            email,
            shopName: shop.name,
            directory_enabled: shop.directory_enabled,
            isVisibleInListing,
            currentPlan
        });

        // Synchroniser avec Resend
        await ResendContactsService.upsertContact({
            email,
            current_plan: currentPlan,
            visible_in_listing_page: isVisibleInListing,
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

