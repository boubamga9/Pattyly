import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getShopIdAndSlug } from '$lib/auth';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { validateImageServer, validateAndRecompressImage, logValidationInfo } from '$lib/utils/images/server';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

// Fonction pour extraire l'email de base (sans plus addressing)
function getBaseEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    const baseLocalPart = localPart.split('+')[0];
    return `${baseLocalPart}@${domain}`;
}

// Fonction pour vérifier l'éligibilité et créer l'essai gratuit
async function checkAndStartTrial(
    supabase: SupabaseClient,
    userId: string,
    userEmail: string,
    request: Request,
    cookies: Cookies
): Promise<{ success: boolean; error?: string; subscriptionId?: string }> {
    try {
        // Récupérer l'IP de l'utilisateur
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const userIp = forwardedFor?.split(',')[0] || realIp || request.headers.get('cf-connecting-ip') || '127.0.0.1';

        // Extraire l'email de base pour éviter le contournement par plus addressing
        const baseEmail = userEmail ? getBaseEmail(userEmail) : '';

        // Récupérer le fingerprint depuis les cookies
        const cookieHeader = request.headers.get('cookie') || '';
        const fingerprintMatch = cookieHeader.match(/deviceFingerprint=([^;]+)/);
        const fingerprint = fingerprintMatch ? fingerprintMatch[1] : null;

        // ✅ SUPPRIMER LE COOKIE APRÈS RÉCUPÉRATION
        if (fingerprint) {
            cookies.delete('deviceFingerprint', { path: '/' });
        }

        // Vérifier si l'utilisateur est dans la table anti_fraud
        let conditions = [`email.eq.${userEmail}`, `email.eq.${baseEmail}`, `ip_address.eq.${userIp}`];
        if (fingerprint) {
            conditions.push(`fingerprint.eq.${fingerprint}`);
        }

        const { data: antiFraudRecord } = await supabase
            .from('anti_fraud')
            .select('id')
            .or(conditions.join(','))
            .maybeSingle();

        if (antiFraudRecord) {
            return { success: false, error: 'Un essai gratuit a déjà été utilisé' };
        }

        // Vérifier si l'utilisateur a déjà eu un abonnement
        const { data: existingSubscriptions } = await supabase
            .from('user_products')
            .select('id')
            .eq('profile_id', userId);

        if (existingSubscriptions && existingSubscriptions.length > 0) {
            return { success: false, error: 'Un abonnement a déjà été utilisé' };
        }

        // Créer ou récupérer le customer Stripe
        let customer: string;
        const { data: existingCustomer } = await supabase
            .from('stripe_customers')
            .select('stripe_customer_id')
            .eq('profile_id', userId)
            .single();

        if (existingCustomer) {
            customer = existingCustomer.stripe_customer_id;
        } else {
            const { id } = await stripe.customers.create({
                email: userEmail,
                metadata: { user_id: userId }
            });
            customer = id;

            // Sauvegarder le customer
            await supabase
                .from('stripe_customers')
                .insert({
                    profile_id: userId,
                    stripe_customer_id: id
                });
        }

        // Créer l'abonnement avec essai gratuit (7 jours premium)
        const subscription = await stripe.subscriptions.create({
            customer,
            items: [{ price: 'price_1RrdwvPNddYt1P7LGICY3by5' }], // Premium price
            trial_period_days: 7,
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent']
        });

        console.log("user product info", userId, subscription.id, 'prod_Selcz36pAfV3vV');
        // Sauvegarder l'abonnement en base
        await supabase
            .from('user_products')
            .upsert({
                profile_id: userId,
                stripe_product_id: 'prod_Selcz36pAfV3vV', // Premium product
                stripe_subscription_id: subscription.id,
                subscription_status: 'active'
            }, { onConflict: 'profile_id' });

        // Enregistrer l'utilisateur dans la table anti_fraud
        try {
            await supabase
                .from('anti_fraud')
                .insert({
                    fingerprint: fingerprint || '',
                    ip_address: userIp,
                    email: userEmail
                });
        } catch (antiFraudError) {
            // On continue même si l'enregistrement anti_fraud échoue
        }

        return {
            success: true,
            subscriptionId: subscription.id
        };

    } catch (error) {
        console.error('Error in checkAndStartTrial:', error);
        return { success: false, error: 'Erreur lors de la création de l\'essai gratuit' };
    }
}

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const { session } = await locals.safeGetSession();

        if (!session) {
            throw redirect(303, '/login');
        }

        const userId = session.user.id;

        // Check if user already has a shop
        const { id: shopId } = await getShopIdAndSlug(userId, locals.supabase);

        if (shopId) {
            // Check if shop has Stripe Connect configured
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id, name, bio, slug, logo_url')
                .eq('id', shopId)
                .single();

            if (shopError) {
                throw error(500, 'Erreur lors du chargement de la boutique');
            }

            // Check if user has Stripe Connect account
            const { data: stripeAccount, error: stripeError } = await locals.supabase
                .from('stripe_connect_accounts')
                .select('id, is_active')
                .eq('profile_id', userId)
                .single();

            if (stripeError && stripeError.code !== 'PGRST116') {
            }

            // If shop exists and has active Stripe Connect, redirect to dashboard
            if (shop && stripeAccount && stripeAccount.is_active) {
                throw redirect(303, '/dashboard');
            }

            // If shop exists but no Stripe Connect, show step 2
            return {
                step: 2,
                shop,
                form: await superValidate(zod(formSchema))
            };
        }

        // No shop exists, show step 1
        return {
            step: 1,
            shop: null,
            form: await superValidate(zod(formSchema))
        };
    } catch (error) {

        // Return fallback data to prevent app crash
        return {
            step: 1,
            shop: null,
            form: await superValidate(zod(formSchema))
        };
    }
};

export const actions: Actions = {
    createShop: async ({ request, locals }) => {
        try {
            const { session } = await locals.safeGetSession();

            if (!session) {
                const form = await superValidate(zod(formSchema));
                setError(form, 'name', 'Non autorisé');
                return { form };
            }

            const userId = session.user.id;
            const form = await superValidate(request, zod(formSchema));

            if (!form.valid) {
                // Create a clean form without File objects for serialization
                const cleanForm = await superValidate(zod(formSchema));
                cleanForm.errors = form.errors;
                cleanForm.valid = false;
                return { form: cleanForm };
            }

            const { name, bio, slug, logo } = form.data;

            // Handle logo upload if provided
            let logoUrl = null;

            if (logo && logo.size > 0) {
                try {
                    // 🔍 Validation serveur stricte + re-compression automatique si nécessaire
                    const validationResult = await validateAndRecompressImage(logo, 'LOGO');

                    // Log de validation pour le debugging
                    logValidationInfo(logo, 'LOGO', validationResult);

                    if (!validationResult.isValid) {
                        // Create a clean form without File objects for serialization
                        const cleanForm = await superValidate(zod(formSchema));
                        setError(cleanForm, 'logo', validationResult.error || 'Validation du logo échouée');
                        return { form: cleanForm };
                    }

                    // 🔄 Utiliser l'image re-compressée si disponible
                    const imageToUpload = validationResult.compressedFile || logo;

                    // Upload to Supabase Storage
                    const fileName = `logos/${userId}/${Date.now()}_${imageToUpload.name}`;
                    const { data: uploadData, error: uploadError } = await locals.supabase.storage
                        .from('shop-logos')
                        .upload(fileName, imageToUpload, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) {
                        // Create a clean form without File objects for serialization
                        const cleanForm = await superValidate(zod(formSchema));
                        setError(cleanForm, 'logo', 'Erreur lors du téléchargement du logo');
                        return { form: cleanForm };
                    }

                    // Get public URL
                    const { data: urlData } = locals.supabase.storage
                        .from('shop-logos')
                        .getPublicUrl(fileName);

                    logoUrl = urlData.publicUrl;
                } catch (uploadError) {
                    // Create a clean form without File objects for serialization
                    const cleanForm = await superValidate(zod(formSchema));
                    setError(cleanForm, 'logo', 'Erreur lors du téléchargement du logo');
                    return { form: cleanForm };
                }
            }

            try {
                // Check if slug already exists
                const { data: existingShop, error: slugCheckError } = await locals.supabase
                    .from('shops')
                    .select('id')
                    .eq('slug', slug)
                    .single();

                if (slugCheckError && slugCheckError.code !== 'PGRST116') {
                    // Create a clean form without File objects for serialization
                    const cleanForm = await superValidate(zod(formSchema));
                    setError(cleanForm, 'slug', 'Erreur lors de la vérification du slug');
                    return { form: cleanForm };
                }

                if (existingShop) {
                    // Create a clean form without File objects for serialization
                    const cleanForm = await superValidate(zod(formSchema));
                    setError(cleanForm, 'slug', "Ce nom d'URL est déjà pris. Veuillez en choisir un autre.");
                    return { form: cleanForm };
                }

                // Create shop
                const { data: shop, error: createError } = await locals.supabase
                    .from('shops')
                    .insert({
                        name,
                        bio: bio || null,
                        slug,
                        logo_url: logoUrl,
                        profile_id: userId
                    })
                    .select('id, name, bio, slug, logo_url')
                    .single();

                if (createError) {
                    // Create a clean form without File objects for serialization
                    const cleanForm = await superValidate(zod(formSchema));
                    setError(cleanForm, 'name', 'Erreur lors de la création de la boutique');
                    return { form: cleanForm };
                }

                // Create default availabilities for the shop (Monday to Friday)
                const availabilities = [];
                for (let day = 0; day < 7; day++) {
                    availabilities.push({
                        shop_id: shop.id,
                        day,
                        is_open: day >= 1 && day <= 5 // Monday (1) to Friday (5) = true, Saturday (6) and Sunday (0) = false
                    });
                }

                const { error: availabilitiesError } = await locals.supabase
                    .from('availabilities')
                    .insert(availabilities);

                if (availabilitiesError) {
                    // Don't fail the shop creation, just log the error
                } else {

                }

                // Return success with form data for Superforms compatibility
                // Create a clean form without the File object for serialization
                const cleanForm = await superValidate(zod(formSchema));
                cleanForm.message = 'Boutique créée avec succès !';
                return {
                    form: cleanForm,
                    success: true,
                    shop
                };
            } catch (error) {
                // Create a clean form for serialization
                const cleanForm = await superValidate(zod(formSchema));
                setError(cleanForm, 'name', 'Une erreur inattendue est survenue lors de la création de la boutique');
                return { form: cleanForm };
            }
        } catch (error) {

            // Always return a form for Superforms compatibility
            const form = await superValidate(zod(formSchema));
            setError(form, 'name', 'Une erreur critique est survenue. Veuillez réessayer.');
            return { form };
        }
    },

    connectStripe: async ({ request, locals, cookies }) => {
        try {
            const { session } = await locals.safeGetSession();

            if (!session) {
                // Create a clean form for Superforms compatibility
                const cleanForm = await superValidate(zod(formSchema));
                setError(cleanForm, 'name', 'Non autorisé');
                return { form: cleanForm };
            }

            const userId = session.user.id;

            try {
                // Check if Stripe Connect account already exists
                const { data: existingAccount, error: fetchError } = await locals.supabase
                    .from('stripe_connect_accounts')
                    .select('id, stripe_account_id, is_active')
                    .eq('profile_id', userId)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') {
                    // Create a clean form for Superforms compatibility
                    const cleanForm = await superValidate(zod(formSchema));
                    setError(cleanForm, 'name', 'Erreur lors de la vérification du compte Stripe');
                    return { form: cleanForm };
                }

                let stripeAccountId: string;

                if (!existingAccount) {
                    // Create new Stripe Connect account

                    const account = await locals.stripe.accounts.create({
                        type: 'express',
                        country: 'FR', // Default to France, can be made configurable
                        email: session.user.email,
                        capabilities: {
                            card_payments: { requested: true },
                            transfers: { requested: true }
                        }
                    });

                    stripeAccountId = account.id;

                    // Save new Stripe Connect account to database
                    const { error: insertError } = await locals.supabase
                        .from('stripe_connect_accounts')
                        .insert({
                            profile_id: userId,
                            stripe_account_id: account.id,
                            is_active: false // Will be set to true after onboarding completion
                        });

                    if (insertError) {
                        // Create a clean form for Superforms compatibility
                        const cleanForm = await superValidate(zod(formSchema));
                        setError(cleanForm, 'name', 'Erreur lors de la sauvegarde du compte Stripe');
                        return { form: cleanForm };
                    }


                } else {
                    // Account exists, use it but don't change is_active yet
                    // is_active will be set to true by Stripe webhook after onboarding completion

                    stripeAccountId = existingAccount.stripe_account_id;

                }



                // Create Stripe Connect account link
                const accountLink = await locals.stripe.accountLinks.create({
                    account: stripeAccountId,
                    refresh_url: `${process.env.PUBLIC_SITE_URL}/onboarding`,
                    return_url: `${process.env.PUBLIC_SITE_URL}/dashboard`,
                    type: 'account_onboarding',
                });

                // Essai gratuit : vérifier l'éligibilité et créer l'essai si possible
                const trialResult = await checkAndStartTrial(
                    locals.supabase,
                    userId,
                    session.user.email || '',
                    request,
                    cookies
                );

                if (trialResult.success) {
                    console.log(`✅ Essai gratuit créé pour l'utilisateur ${userId}`);
                } else {
                    console.log(`ℹ️ Essai gratuit non éligible pour l'utilisateur ${userId}: ${trialResult.error}`);
                }


                // Create a clean form for Superforms compatibility
                const cleanForm = await superValidate(zod(formSchema));
                cleanForm.message = 'Connexion Stripe réussie !';
                return {
                    form: cleanForm,
                    success: true,
                    url: accountLink.url
                };
            } catch (err) {
                // Create a clean form for Superforms compatibility
                const cleanForm = await superValidate(zod(formSchema));
                setError(cleanForm, 'name', 'Erreur lors de la connexion Stripe');
                return { form: cleanForm };
            }
        } catch (error) {
            // Create a clean form for Superforms compatibility
            const cleanForm = await superValidate(zod(formSchema));
            setError(cleanForm, 'name', 'Une erreur critique est survenue. Veuillez réessayer.');
            return { form: cleanForm };
        }
    }
};
