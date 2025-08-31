import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const email = url.searchParams.get('email');

    // Si pas d'email, rediriger vers la page d'accueil
    if (!email) {
        throw redirect(302, '/');
    }

    return {
        userEmail: email
    };
};
