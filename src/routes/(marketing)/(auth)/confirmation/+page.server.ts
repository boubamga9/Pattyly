import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { otpSchema } from './schema';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
    const email = url.searchParams.get('email');
    const typeParam = url.searchParams.get('type');
    const type: 'signup' | 'recovery' = (typeParam === 'recovery' ? 'recovery' : 'signup');


    // Si pas d'email, rediriger vers la page d'accueil
    if (!email) {
        throw redirect(302, '/');
    }

    const form = await superValidate(zod(otpSchema));

    // Pré-remplir l'email et le type dans le formulaire
    form.data.email = email;
    form.data.type = type;

    return {
        userEmail: email,
        type,
        form
    };
};

export const actions: Actions = {
    verifyOtp: async ({ request, locals, url }) => {
        const form = await superValidate(request, zod(otpSchema));

        if (!form.valid) {
            console.log('form not valid')
            return fail(400, { form });
        }

        const { code, email, type } = form.data;

        if (!email) {
            return setError(form, 'email', 'Email manquant');
        }


        // Vérifier le code OTP avec Supabase
        const { data, error } = await locals.supabase.auth.verifyOtp({
            email,
            token: code,
            type: type === 'recovery' ? 'recovery' : 'signup'
        });

        if (error) {
            let errorMessage = 'Erreur lors de la vérification. Veuillez réessayer.';

            if (error.code === 'otp_invalid' || error.message?.includes('invalid')) {
                errorMessage = 'Code de vérification invalide. Vérifiez votre code et réessayez.';
            } else if (error.code === 'too_many_requests') {
                errorMessage = 'Trop de tentatives. Veuillez patienter avant de réessayer.';
            } else if (error.code === 'otp_expired' || error.message?.includes('expired')) {
                errorMessage = 'Le code de vérification a expiré. Veuillez demander un nouveau code.';
            } else if (error.code === 'user_not_found') {
                errorMessage = 'Utilisateur introuvable. Vérifiez votre email.';
            }

            return setError(form, '', errorMessage);
        }
        console.log(type)

        if (data.user) {
            // Redirection selon le type
            const redirectTo = type === 'recovery' ? '/new-password' : '/onboarding';

            throw redirect(303, redirectTo);
        }

        return setError(form, '', 'Vérification échouée');


    }
};
