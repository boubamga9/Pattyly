import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();
    if (!session) {
        throw redirect(303, '/');
    }

    const userId = session.user.id;

    // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données
    const { data: dashboardData, error } = await locals.supabase.rpc('get_dashboard_data', {
        p_profile_id: userId
    });

    if (error) {
        console.error('Error fetching dashboard data:', error);
        throw redirect(303, '/onboarding');
    }

    const { shop, permissions, subscription } = dashboardData;

    // Vérifications de sécurité
    if (!shop || !shop.id) {
        throw redirect(303, '/onboarding');
    }

    // Check if user has payment method configured (PayPal or Stripe Connect)
    if (!permissions.has_paypal) {
        throw redirect(303, '/onboarding');
    }

    // Détecter si l'utilisateur a un abonnement inactif (pour afficher l'alerte)
    const hasInactiveSubscription = subscription?.status !== 'active';

    return {
        permissions,
        userId,
        hasInactiveSubscription
    };
}; 