import { fetchCurrentUsersSubscription } from '$lib/stripe/client-helpers';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import Stripe from 'stripe';
import { error, fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';
// ✅ OPTIMISÉ : getUserPermissions n'est plus utilisé, supprimé
import {
    deleteAccountFormSchema,
    infoFormSchema,
    changePasswordFormSchema,
    createPasswordFormSchema,
} from './schema';
import { deleteAllShopImages } from '$lib/storage';


const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

export const load: PageServerLoad = async ({ locals, parent }) => {
    // ✅ OPTIMISÉ : Réutiliser user et permissions du layout
    const { user, permissions } = await parent();

    if (!user) {
        throw redirect(302, '/login');
    }

    // Récupérer l'ID de la boutique
    if (!permissions.shopId) {
        throw error(400, 'Boutique non trouvée');
    }

    const userId = user.id;

    // ✅ Le schéma infoFormSchema est vide, donc pas besoin de récupérer des données
    const info = {};

    const { data: passwordSet } = await locals.supabase.rpc('user_password_set');

    const { amr } = await locals.safeGetSession();
    const recoveryAmr = amr?.find((x) => x.method === 'recovery');

    // Get PayPal account status
    const { data: paypalAccount, error: paypalError } = await locals.supabase
        .from('paypal_accounts')
        .select('*')
        .eq('profile_id', userId)
        .single();

    if (paypalError && paypalError.code !== 'PGRST116') {
    }

    return {
        infoForm: await superValidate(info, zod(infoFormSchema)),
        deleteAccountForm:
            passwordSet && (await superValidate(zod(deleteAccountFormSchema))),
        changePasswordForm: await superValidate(zod(changePasswordFormSchema)),
        createPasswordForm: await superValidate(zod(createPasswordFormSchema)),
        recoverySession: Boolean(recoveryAmr),
        createPassword: !passwordSet,
        paypalAccount: paypalAccount || null,
        permissions, // ✅ Ajouter les permissions pour accéder à is_stripe_free
    };
};

export const actions = {
    updateProfile: async (event) => {
        const { safeGetSession, supabase } = event.locals;
        const { session, user } = await safeGetSession();
        if (!session || !user?.id) {
            return redirect(303, '/login');
        }

        const form = await superValidate(event, zod(infoFormSchema));
        if (!form.valid) {
            return fail(400, {
                infoForm: form,
            });
        }

        // Note: In our new schema, we don't have a 'name' field in profiles
        // The email is managed through Supabase Auth
        // We can update other profile fields here if needed

        // For now, we'll just return success since email updates are handled separately
        // and we don't have other editable fields in the current schema

        return message(form, {
            success: 'Profil mis à jour avec succès.',
        });
    },
    deleteAccount: async (event) => {
        const { safeGetSession, supabase, supabaseServiceRole, stripe } =
            event.locals;
        const { session, user } = await safeGetSession();
        if (!session || !user?.id) {
            return redirect(303, '/login');
        }

        const form = await superValidate(event, zod(deleteAccountFormSchema));
        if (!form.valid) {
            return fail(400, {
                deleteAccountForm: form,
            });
        }

        const { confirmation } = form.data;

        // Check current password is correct before deleting account
        const { error: pwError } = await supabase.auth.signInWithPassword({
            email: user?.email || '',
            password: confirmation,
        });

        if (pwError) {
            await supabase.auth.signOut();
            // The user was logged out because of bad password. Redirect to error page explaining.
            return redirect(303, '/security-error');
        }

        // Vérifier si l'utilisateur a un compte Stripe
        const { data: customer, error } = await supabaseServiceRole
            .from('stripe_customers')
            .select('stripe_customer_id')
            .eq('profile_id', user.id)
            .single();

        // Si l'utilisateur a un compte Stripe, annuler les abonnements
        if (customer?.stripe_customer_id) {
            try {
                // Annuler les abonnements Stripe
                const currentSubscriptions = await fetchCurrentUsersSubscription(
                    stripe,
                    customer.stripe_customer_id,
                );

                const cancelPromises = currentSubscriptions.map((sub) =>
                    stripe.subscriptions.cancel(sub.id),
                );

                await Promise.all(cancelPromises);

            } catch (error) {
                // On continue avec la suppression du compte même si l'annulation des abonnements échoue
                // car l'utilisateur veut supprimer son compte de toute façon
            }
        }

        // Récupérer l'ID de la boutique avant de supprimer l'utilisateur
        const { data: shop } = await supabaseServiceRole
            .from('shops')
            .select('id')
            .eq('user_id', user.id)
            .single();

        // Supprimer toutes les images de la boutique si elle existe
        if (shop?.id) {
            await deleteAllShopImages(supabaseServiceRole, shop.id);
        }

        const { error: deleteProfileError } = await supabaseServiceRole.from('profiles').delete().eq('id', user.id);

        const { error: delError } = await supabaseServiceRole.auth.admin.deleteUser(
            user.id,
            true,
        );

        if (delError || deleteProfileError) {
            return fail(500, {
                errorMessage: 'Erreur inconnue. Si le problème persiste, veuillez nous contacter.',
            });
        }

        await supabase.auth.signOut();

        redirect(303, '/register');
    },
    updatePassword: async (event) => {
        const { safeGetSession, supabase } = event.locals;
        const { session, user, amr } = await safeGetSession();
        if (!session) {
            redirect(303, '/login');
        }

        const { data: passwordSet } =
            await event.locals.supabase.rpc('user_password_set');

        // Can check if we're a "password recovery" session by checking session amr
        // let currentPassword take priority if provided (user can use either form)
        const recoveryAmr = amr?.find((x) => x.method === 'recovery');

        const form =
            passwordSet && !recoveryAmr
                ? await superValidate(event, zod(changePasswordFormSchema))
                : await superValidate(event, zod(createPasswordFormSchema));
        if (!form.valid) {
            return fail(400, {
                changePasswordForm: form,
            });
        }

        // if this is password recovery session, check timestamp of recovery session
        if (recoveryAmr) {
            const timeSinceLogin = Date.now() - recoveryAmr.timestamp * 1000;
            if (timeSinceLogin > 1000 * 60 * 15) {
                // 15 mins in milliseconds
                return setError(
                    form,
                    '',
                    'Code de récupération expiré. Veuillez vous déconnecter, puis utiliser "Mot de passe oublié" sur la page de connexion pour réinitialiser votre mot de passe. Les codes sont valides pendant 15 minutes.',
                );
            }
        }

        const { new_password } = form.data;

        // this should really never happen
        // at this point the validation would have failed if password was set
        // and the old password was not provided but just in case we check again
        if (!recoveryAmr && passwordSet && !('old_password' in form.data)) {
            return setError(form, '', 'L\'ancien mot de passe est requis');
        }

        if ('old_password' in form.data) {
            if (typeof form.data.old_password !== 'string') {
                throw setError(
                    form,
                    '',
                    'Impossible de mettre à jour le mot de passe. Veuillez réessayer.',
                );
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: user?.email || '',
                password: form.data.old_password,
            });
            if (error) {
                await supabase.auth.signOut();
                // The user was logged out because of bad password. Redirect to error page explaining.
                redirect(303, '/security-error');
            }
        }

        const { error } = await supabase.auth.updateUser({
            password: new_password,
        });

        if (error) {
            return setError(form, '', 'Impossible de mettre à jour le mot de passe. Veuillez réessayer.');
        }

        if (recoveryAmr) {
            await supabase.auth.signOut();
            redirect(303, '/login');
        }

        return 'old_password' in form.data
            ? message(form, {
                success: 'Mot de passe mis à jour',
            })
            : {
                form,
                success: 'Mot de passe défini',
            };
    },

    accessStripeBilling: async ({ locals }) => {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;

        try {

            // Vérifier d'abord si la table existe et a des données
            const { data: allCustomers, error: listError } = await locals.supabase
                .from('stripe_customers')
                .select('*');


            // Récupérer le customer Stripe de l'utilisateur
            const { data: customer, error: customerError } = await locals.supabase
                .from('stripe_customers')
                .select('*')
                .eq('profile_id', userId)
                .single();


            if (customerError) {
                if (customerError.code === 'PGRST116') {
                    return { success: false, error: 'Aucun compte client Stripe trouvé. Veuillez d\'abord souscrire à un abonnement.' };
                }
                return { success: false, error: 'Erreur lors de la recherche du compte client' };
            }

            if (!customer?.stripe_customer_id) {
                return { success: false, error: 'Aucun compte client Stripe trouvé. Veuillez d\'abord souscrire à un abonnement.' };
            }


            // Créer un lien de billing Stripe avec configuration par défaut
            const billingLink = await stripe.billingPortal.sessions.create({
                customer: customer.stripe_customer_id,
                return_url: `${PUBLIC_SITE_URL}/dashboard/settings`,
                configuration: undefined // Utilise la configuration par défaut
            });

            return { success: true, redirectUrl: billingLink.url };
        } catch (err) {
            return { success: false, error: 'Erreur lors de la création du lien de billing' };
        }
    },

    /*connectPayPal: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();

        // Create a clean form for Superforms compatibility
        const cleanForm = await superValidate(zod(infoFormSchema));

        if (!session) {
            return {
                success: false,
                error: 'Non autorisé',
                infoForm: cleanForm
            };
        }

        const userId = session.user.id;

        try {
            // Check if PayPal account already exists
            const { data: existingAccount } = await locals.supabase
                .from('paypal_accounts')
                .select('*')
                .eq('profile_id', userId)
                .single();

            // Generate or reuse tracking ID
            let trackingId: string;

            if (existingAccount) {
                // Reuse existing tracking ID
                trackingId = existingAccount.tracking_id || `pattyly_${userId}_${Date.now()}`;
            } else {
                // Generate new tracking ID
                trackingId = `pattyly_${userId}_${Date.now()}`;

                // Upsert PayPal account to database
                const { error: upsertError } = await locals.supabase
                    .from('paypal_accounts')
                    .upsert({
                        profile_id: userId,
                        tracking_id: trackingId,
                        onboarding_status: 'pending',
                        is_active: false
                    }, {
                        onConflict: 'profile_id'
                    });

                if (upsertError) {
                    return {
                        success: false,
                        error: 'Erreur lors de la sauvegarde du compte PayPal',
                        infoForm: cleanForm
                    };
                }
            }

            // Create PayPal Partner Referral (allows modification even if already configured)
            const referralResponse = await paypalClient.createPartnerReferral(
                trackingId,
                `${PUBLIC_SITE_URL}/dashboard/settings`
            );

            // Find the onboarding URL
            const onboardingLink = referralResponse.links.find(link => link.rel === 'action_url');
            if (!onboardingLink) {
                return {
                    success: false,
                    error: 'Erreur lors de la création du lien PayPal',
                    infoForm: cleanForm
                };
            }

            return {
                success: true,
                redirectUrl: onboardingLink.href,
                infoForm: cleanForm
            };
        } catch (err) {
            console.error('PayPal connection error:', err);
            return {
                success: false,
                error: 'Erreur lors de la connexion PayPal',
                infoForm: cleanForm
            };
        }
    },*/

    logout: async ({ locals, cookies }) => {
        // Déconnexion côté serveur
        await locals.supabase.auth.signOut();

        // Supprimer le cookie de session
        cookies.delete('session', { path: '/' });

        // Rediriger directement vers la homepage
        throw redirect(303, '/');
    }
}; 