import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { otpSchema } from './schema';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
    const email = url.searchParams.get('email');
    const typeParam = url.searchParams.get('type');
    const plan = url.searchParams.get('plan'); // Récupérer le plan depuis l'URL
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
        plan, // Passer le plan aux données
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
            // Si c'est une inscription, vérifier les transferts
            if (type === 'signup') {
                try {
                    // Exécuter le transfert complet via RPC (inclut la recherche par email)
                    const { data: transferResult, error: transferError } = await (locals.supabaseServiceRole as any)
                        .rpc('execute_shop_transfer_by_email', {
                            p_target_email: email,
                            p_new_user_id: data.user.id,
                            p_new_user_email: data.user.email
                        });

                    if (transferError) {
                        console.error('Transfer RPC error:', transferError);
                        throw redirect(303, '/onboarding');
                    }

                    if (!transferResult?.success) {
                        // Pas de transfert trouvé ou erreur - continuer avec le flux normal
                        throw redirect(303, '/onboarding');
                    }

                    // Supprimer l'ancien utilisateur Auth (après le transfert réussi)
                    if (transferResult.old_profile_id) {
                        const { error: deleteError } = await locals.supabaseServiceRole.auth.admin.deleteUser(transferResult.old_profile_id);
                        if (deleteError) {
                            console.error('Error deleting old auth user:', deleteError);
                            // Ne pas faire échouer le transfert pour ça
                        }
                    }

                    throw redirect(303, '/dashboard');

                } catch (error) {
                    console.error('Error during transfer:', error);
                    throw redirect(303, '/onboarding');
                }
            }

            // Redirection selon le type
            if (type === 'recovery') {
                throw redirect(303, '/new-password');
            } else {
                // Pour signup, rediriger vers l'onboarding
                throw redirect(303, '/onboarding');
            }
        }

        return setError(form, '', 'Vérification échouée');


    }
};
