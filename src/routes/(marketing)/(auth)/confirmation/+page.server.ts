import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { otpSchema } from './schema';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, cookies }) => {
    const email = url.searchParams.get('email');
    const typeParam = url.searchParams.get('type');
    const plan = url.searchParams.get('plan');
    // ✅ Récupérer le ref depuis l'URL ou le cookie
    const affiliateCode = url.searchParams.get('ref') || cookies.get('affiliate_ref');

    console.log('🔍 [AFFILIATION LOAD] Ref (URL ou cookie):', affiliateCode);

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
        plan,
        affiliateCode, // ✅ Passer le code aux données
        form
    };
};

export const actions: Actions = {
    verifyOtp: async ({ request, locals, url, cookies }) => {
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
            if (type === 'recovery') {
                throw redirect(303, '/new-password');
            } else {
                // Pour signup, créer le contact dans Resend avant redirection
                // ✅ Créer le contact dans Resend dès la confirmation (fire-and-forget)
                const { createPastryInResend } = await import('$lib/utils/resend-sync');
                createPastryInResend(data.user.id, email, locals.supabase).catch(err => {
                    console.error('Erreur création contact Resend:', err);
                });

                // ✅ Stocker le ref dans un cookie pour l'utiliser lors de la création de la boutique
                // Récupérer depuis l'URL ou le cookie existant
                const affiliateCode = url.searchParams.get('ref') || cookies.get('affiliate_ref');
                if (affiliateCode) {
                    // S'assurer que le cookie est bien défini (même s'il existe déjà)
                    cookies.set('affiliate_ref', affiliateCode, {
                        path: '/',
                        maxAge: 3600, // 1 heure
                        httpOnly: true, // Sécurisé, pas accessible depuis JavaScript
                        sameSite: 'lax'
                    });
                    console.log('✅ [AFFILIATION] Ref stocké dans cookie:', affiliateCode);
                }

                // Rediriger vers l'onboarding
                throw redirect(303, '/onboarding');
            }
        }

        return setError(form, '', 'Vérification échouée');


    }
};
