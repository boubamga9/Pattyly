import { fetchCurrentUsersSubscription } from '$lib/stripe/client-helpers';
import { fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';
import {
    deleteAccountFormSchema,
    emailFormSchema,
    infoFormSchema,
    changePasswordFormSchema,
    createPasswordFormSchema,
} from './schema';
import { deleteAllShopImages } from '$lib/storage-utils';

export const load: PageServerLoad = async ({ locals }) => {
    const { user } = await locals.safeGetSession();

    // let's not check for session here as it prevents us to show alert after sign out post-account deletion
    // everything is handled in the action
    // if (!session || !user) {
    // 	throw redirect(303, '/login');
    // }

    // get profile info
    let info;
    if (user) {
        const { data, error } = await locals.supabase
            .from('profiles')
            .select('email, role, is_stripe_free')
            .eq('id', user.id)
            .single();
        if (error) {
            console.error('Error getting profile info:', error.message);
            throw fail(500, { error: 'Could not get profile info.' });
        }

        info = data;
    }

    const { data: passwordSet } = await locals.supabase.rpc('user_password_set');

    const { amr } = await locals.safeGetSession();
    const recoveryAmr = amr?.find((x) => x.method === 'recovery');

    return {
        emailForm: await superValidate(user, zod(emailFormSchema)),
        infoForm: await superValidate(info, zod(infoFormSchema)),
        deleteAccountForm:
            passwordSet && (await superValidate(zod(deleteAccountFormSchema))),
        changePasswordForm: await superValidate(zod(changePasswordFormSchema)),
        createPasswordForm: await superValidate(zod(createPasswordFormSchema)),
        recoverySession: Boolean(recoveryAmr),
        createPassword: !passwordSet,
    };
};

export const actions = {
    updateEmail: async (event) => {
        const { safeGetSession, supabase } = event.locals;
        const { session } = await safeGetSession();
        if (!session) {
            redirect(303, '/login');
        }

        const form = await superValidate(event, zod(emailFormSchema));
        if (!form.valid) {
            return fail(400, {
                emailForm: form,
            });
        }

        const { email } = form.data;

        // Supabase does not change the email until the user verifies both
        // if 'Secure email change' is enabled in the Supabase dashboard
        const { error } = await supabase.auth.updateUser({ email });

        if (error) {
            console.error(error);
            return setError(form, '', 'Could not sign up. Please try again.');
        }

        return message(form, {
            success:
                'An email has been sent to both your old and new email addresses. Please follow instructions in both.',
        });
    },
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
}; 