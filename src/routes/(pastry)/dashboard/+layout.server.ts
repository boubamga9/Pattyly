import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent, locals }) => {
    // ✅ OPTIMISÉ : Réutiliser les données du layout parent au lieu de refaire les requêtes
    const { permissions, user } = await parent();

    // Vérifications de sécurité supplémentaires pour le dashboard
    if (!permissions.shopId) {
        throw redirect(303, '/onboarding');
    }

    // needsSubscription = true si plan === 'basic' (limité)
    const hasInactiveSubscription = permissions.needsSubscription;

    return {
        permissions,
        userId: user?.id,
        hasInactiveSubscription
    };
}; 