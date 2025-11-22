import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserPermissions } from '$lib/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();
    if (!session) {
        throw redirect(303, '/');
    }

    const userId = session.user.id;

    const permissions = await getUserPermissions(userId, locals.supabase);

    // Vérifications de sécurité
    if (!permissions.shopId) {
        throw redirect(303, '/onboarding');
    }

    return {
        permissions,
        userId
    };
}; 