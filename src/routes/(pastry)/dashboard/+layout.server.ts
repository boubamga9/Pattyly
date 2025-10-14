import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserPermissions } from '$lib/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();
    if (!session) {
        throw redirect(303, '/');
    }

    const userId = session.user.id;

    // ✅ Utiliser getUserPermissions qui tient compte de trial_ending
    const permissions = await getUserPermissions(userId, locals.supabase);

    // Vérifications de sécurité
    if (!permissions.shopId) {
        throw redirect(303, '/onboarding');
    }

    // needsSubscription = true si plan === 'basic' (limité)
    const hasInactiveSubscription = permissions.needsSubscription;

    return {
        permissions,
        userId,
        hasInactiveSubscription
    };
}; 