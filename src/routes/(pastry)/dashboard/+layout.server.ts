import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserPermissions } from '$lib/permissions';

export const load: LayoutServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();
    if (!session) {
        throw redirect(303, '/');
    }

    const userId = session.user.id;

    // 1. Vérifier que l'utilisateur a un shop associé
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('id')
        .eq('profile_id', userId)
        .single();

    if (shopError || !shop) {
        // Pas de shop trouvé, rediriger vers l'onboarding
        throw redirect(303, '/onboarding');
    }

    // 2. Vérifier que l'utilisateur a un compte Stripe Connect actif
    const { data: connectAccount, error: connectError } = await locals.supabase
        .from('stripe_connect_accounts')
        .select('id, is_active')
        .eq('profile_id', userId)
        .single();

    if (connectError || !connectAccount || !connectAccount.is_active) {
        // Pas de compte Connect actif, rediriger vers l'onboarding
        throw redirect(303, '/onboarding');
    }

    // 2. Vérifier que l'utilisateur a un abonnement actif ou est exempté
    const { data: profile } = await locals.supabase
        .from('profiles')
        .select('role, is_stripe_free')
        .eq('id', userId)
        .single();

    if (!profile) {
        throw redirect(303, '/login');
    }

    // Vérifier si l'utilisateur est exempté
    if (profile.is_stripe_free) {
        // Utilisateur exempté, autoriser l'accès au dashboard
        // Pas de redirection nécessaire
    } else {
        // Vérifier l'abonnement actif pour les utilisateurs non exemptés
        const { data: subscription } = await locals.supabase
            .from('user_products')
            .select('subscription_status')
            .eq('profile_id', userId)
            .eq('subscription_status', 'active')
            .single();

        if (!subscription) {
            // Pas d'abonnement actif, rediriger vers la page d'abonnement
            throw redirect(303, '/subscription');
        }
    }

    console.log('🔧 Mode production : vérifications passées pour', userId);

    const permissions = await getUserPermissions(userId, locals.supabase);

    return {
        permissions,
        userId
    };
}; 