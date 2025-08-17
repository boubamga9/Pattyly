import { fetchCurrentUsersSubscription } from '$lib/stripe/client-helpers';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import Stripe from 'stripe';
import { error, fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';
import {
    deleteAccountFormSchema,
    infoFormSchema,
    changePasswordFormSchema,
    createPasswordFormSchema,
} from './schema';
import { deleteAllShopImages } from '$lib/storage-utils';


const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
});

export const load: PageServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();
    if (!session) {
        error(401, 'Non autorisé');
    }

    const userId = session.user.id;

    // get profile info
    let info;


    const { data: passwordSet } = await locals.supabase.rpc('user_password_set');

    const { amr } = await locals.safeGetSession();
    const recoveryAmr = amr?.find((x) => x.method === 'recovery');

    // Get Stripe Connect account status
    const { data: stripeAccount, error: stripeError } = await locals.supabase
        .from('stripe_connect_accounts')
        .select('*')
        .eq('profile_id', userId)
        .single();

    if (stripeError && stripeError.code !== 'PGRST116') {
        console.error('Error loading Stripe account:', stripeError);
    }


    return {
        infoForm: await superValidate(info, zod(infoFormSchema)),
        deleteAccountForm:
            passwordSet && (await superValidate(zod(deleteAccountFormSchema))),
        changePasswordForm: await superValidate(zod(changePasswordFormSchema)),
        createPasswordForm: await superValidate(zod(createPasswordFormSchema)),
        recoverySession: Boolean(recoveryAmr),
        createPassword: !passwordSet,
        stripeAccount: stripeAccount || null,
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
            success: 'Profile updated successfully.',
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

                console.log(`Successfully cancelled ${currentSubscriptions.length} subscription(s) for user ${user.id}`);
            } catch (error) {
                console.error('Error cancelling subscriptions:', error);
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

        const { error: delError } = await supabaseServiceRole.auth.admin.deleteUser(
            user.id,
            true,
        );

        if (delError) {
            console.error('Error deleting account:', delError.message);
            return fail(500, {
                errorMessage: 'Unknown error. If this persists please contact us.',
            });
        }

        await supabase.auth.signOut();

        redirect(303, '/register?alertDialog=account-deletion');
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
                    'Recovery code expired. Please log out, then use "Forgot Password" on the log in page to reset your password. Codes are valid for 15 minutes.',
                );
            }
        }

        const { new_password } = form.data;

        // this should really never happen
        // at this point the validation would have failed if password was set
        // and the old password was not provided but just in case we check again
        if (!recoveryAmr && passwordSet && !('old_password' in form.data)) {
            return setError(form, '', 'Old password is required');
        }

        if ('old_password' in form.data) {
            if (typeof form.data.old_password !== 'string') {
                console.error(new Error('Old password was not a string'));
                throw setError(
                    form,
                    '',
                    'Could not update password. Please try again.',
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
            console.error(error);
            return setError(form, '', 'Could not update password. Please try again.');
        }

        if (recoveryAmr) {
            await supabase.auth.signOut();
            redirect(303, '/login?alertDialog=reset-password');
        }

        return 'old_password' in form.data
            ? message(form, {
                success: 'Password updated',
            })
            : {
                form,
                success: 'Password set',
            };
    },
    connectStripe: async ({ locals }) => {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;

        // Get shop ID
        const { data: shop } = await locals.supabase
            .from('shops')
            .select('id')
            .eq('profile_id', userId)
            .single();

        if (!shop) {
            return { success: false, error: 'Boutique non trouvée' };
        }

        // Check if Stripe Connect account already exists
        const { data: existingAccount } = await locals.supabase
            .from('stripe_connect_accounts')
            .select('*')
            .eq('profile_id', userId)
            .single();

        if (existingAccount) {
            // Redirect to Stripe Connect dashboard
            const stripe = new (await import('stripe')).default(PRIVATE_STRIPE_SECRET_KEY);

            const accountLink = await stripe.accountLinks.create({
                account: existingAccount.stripe_account_id,
                refresh_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/dashboard/shop`,
                return_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/dashboard/shop`,
                type: 'account_onboarding',
            });

            return { success: true, redirectUrl: accountLink.url };
        }

        // Create new Stripe Connect account
        const stripe = new (await import('stripe')).default(PRIVATE_STRIPE_SECRET_KEY);

        const account = await stripe.accounts.create({
            type: 'express',
            country: 'FR',
            email: session.user.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: 'individual',
        });

        // Save account to database
        const { error: insertError } = await locals.supabase
            .from('stripe_connect_accounts')
            .insert({
                profile_id: userId,
                stripe_account_id: account.id,
                is_active: false
            });

        if (insertError) {
            console.error('Error saving Stripe account:', insertError);
            return { success: false, error: 'Erreur lors de la création du compte Stripe' };
        }

        // Create account link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/dashboard/shop`,
            return_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/dashboard/shop`,
            type: 'account_onboarding',
        });

        return { success: true, redirectUrl: accountLink.url };
    },

    accessStripeBilling: async ({ locals }) => {
        const { session } = await locals.safeGetSession();
        if (!session) {
            console.log('❌ Pas de session');
            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;
        console.log('🔍 User ID:', userId);

        try {
            console.log('🔍 Recherche du customer Stripe pour userId:', userId);

            // Vérifier d'abord si la table existe et a des données
            const { data: allCustomers, error: listError } = await locals.supabase
                .from('stripe_customers')
                .select('*');

            console.log('🔍 Tous les customers dans la DB:', allCustomers);
            console.log('🔍 Erreur liste:', listError);

            // Récupérer le customer Stripe de l'utilisateur
            const { data: customer, error: customerError } = await locals.supabase
                .from('stripe_customers')
                .select('*')
                .eq('profile_id', userId)
                .single();

            console.log('🔍 Résultat recherche customer:', { customer, customerError });

            if (customerError) {
                console.log('❌ Erreur lors de la recherche du customer:', customerError);
                if (customerError.code === 'PGRST116') {
                    return { success: false, error: 'Aucun compte client Stripe trouvé. Veuillez d\'abord souscrire à un abonnement.' };
                }
                return { success: false, error: 'Erreur lors de la recherche du compte client' };
            }

            if (!customer?.stripe_customer_id) {
                console.log('❌ Aucun stripe_customer_id trouvé');
                return { success: false, error: 'Aucun compte client Stripe trouvé. Veuillez d\'abord souscrire à un abonnement.' };
            }

            console.log('✅ Customer Stripe trouvé:', customer);
            console.log('✅ stripe_customer_id:', customer.stripe_customer_id);

            // Créer un lien de billing Stripe avec configuration par défaut
            const billingLink = await stripe.billingPortal.sessions.create({
                customer: customer.stripe_customer_id,
                return_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/dashboard/shop`,
                configuration: undefined // Utilise la configuration par défaut
            });

            console.log('✅ Lien de billing créé:', billingLink.url);
            return { success: true, redirectUrl: billingLink.url };
        } catch (err) {
            console.error('❌ Error creating billing link:', err);
            return { success: false, error: 'Erreur lors de la création du lien de billing' };
        }
    }
}; 