import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getShopId } from '$lib/auth';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { validateImageServer, validateAndRecompressImage, logValidationInfo } from '$lib/utils/images/server';
import { incrementCatalogVersion } from '$lib/utils/catalog';

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const { session } = await locals.safeGetSession();

        if (!session) {
            throw redirect(303, '/login');
        }

        const userId = session.user.id;

        // Check if user already has a shop
        const shopId = await getShopId(userId, locals.supabase);

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

                // Increment catalog version for cache invalidation
                try {
                    await incrementCatalogVersion(locals.supabase, shop.id);
                } catch (cacheError) {
                    // Non-critical error, don't fail the operation
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

    connectStripe: async ({ locals }) => {
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
                    refresh_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/onboarding?refresh=true`,
                    return_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/subscription`,
                    type: 'account_onboarding',
                });


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
