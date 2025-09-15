import { redirect, fail, type Actions } from '@sveltejs/kit';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';
import { newPasswordSchema } from './schema';

export const load: PageServerLoad = async ({ locals, request, cookies }) => {
    // Vérifier que l'utilisateur est connecté avec une session de récupération
    const { session, user } = await locals.safeGetSession();

    if (!session || !user) {
        throw redirect(303, '/login');
    }

    const referer = request.headers.get('referer') || '';

    // si l'URL précédente n'inclut pas "/confirmation"
    if (!referer.includes('/confirmation')) {
        // Déconnexion côté serveur
        await locals.supabase.auth.signOut();

        // Supprimer le cookie de session
        cookies.delete('session', { path: '/' });
        throw redirect(303, '/login');
    }

    const form = await superValidate(zod(newPasswordSchema));

    return {
        form
    };
};

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const form = await superValidate(request, zod(newPasswordSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        const { password } = form.data;

        try {
            // Mettre à jour le mot de passe
            const { error } = await locals.supabase.auth.updateUser({
                password: password
            });

            if (error) {
                return setError(form, '', 'Erreur lors de la mise à jour du mot de passe. Veuillez réessayer.');
            }

        } catch (error) {
            console.error('Erreur lors de la mise à jour du mot de passe:', error);
            return setError(form, '', 'Erreur interne du serveur');
        }

        // Rediriger vers le dashboard après succès
        throw redirect(303, '/dashboard');
    }
};
