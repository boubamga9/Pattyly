import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getShopId } from '$lib/permissions';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';

export const load: PageServerLoad = async ({ locals }) => {
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
            console.error('Error fetching shop:', shopError);
            throw error(500, 'Erreur lors du chargement de la boutique');
        }

        // Check if user has Stripe Connect account
        const { data: stripeAccount, error: stripeError } = await locals.supabase
            .from('stripe_connect_accounts')
            .select('id, is_active')
            .eq('profile_id', userId)
            .single();

        if (stripeError && stripeError.code !== 'PGRST116') {
            console.error('Error fetching Stripe account:', stripeError);
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
};

export const actions: Actions = {
    createShop: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();

        if (!session) {
            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;
        const form = await superValidate(request, zod(formSchema));

        if (!form.valid) {
            return form;
        }

        const { name, bio, slug, logo } = form.data;

        // Handle logo upload if provided
        let logoUrl = null;
        if (logo && logo.size > 0) {
            try {
                // Upload to Supabase Storage
                const fileName = `logos/${userId}/${Date.now()}_${logo.name}`;
                const { data: uploadData, error: uploadError } = await locals.supabase.storage
                    .from('shop-logos')
                    .upload(fileName, logo, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Logo upload error:', uploadError);
                    return { success: false, error: 'Erreur lors du téléchargement du logo' };
                }

                // Get public URL
                const { data: urlData } = locals.supabase.storage
                    .from('shop-logos')
                    .getPublicUrl(fileName);

                logoUrl = urlData.publicUrl;
            } catch (uploadError) {
                console.error('Logo upload error:', uploadError);
                return { success: false, error: 'Erreur lors du téléchargement du logo' };
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
                console.error('Error checking slug:', slugCheckError);
                return { success: false, error: 'Erreur lors de la vérification du slug' };
            }

            if (existingShop) {
                return { success: false, error: 'Ce nom d\'URL est déjà pris. Veuillez en choisir un autre.' };
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
                console.error('Shop creation error:', createError);
                return { success: false, error: 'Erreur lors de la création de la boutique' };
            }

            // Return form data for Superforms compatibility with success indicator
            const form = await superValidate(zod(formSchema));
            form.message = 'Boutique créée avec succès !';
            return {
                form,
                success: true,
                shop
            };
        } catch (error) {
            console.error('Unexpected error:', error);
            return { success: false, error: 'Une erreur inattendue est survenue' };
        }
    },

    connectStripe: async ({ locals }) => {
        const { session } = await locals.safeGetSession();

        if (!session) {
            return { success: false, error: 'Non autorisé' };
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
                console.error('Error fetching existing Stripe account:', fetchError);
                return { success: false, error: 'Erreur lors de la vérification du compte Stripe' };
            }

            let stripeAccountId: string;

            if (!existingAccount) {
                // Create new Stripe Connect account
                console.log('🆕 Creating new Stripe Connect account for user:', userId);
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
                    console.error('Error saving new Stripe account:', insertError);
                    return { success: false, error: 'Erreur lors de la sauvegarde du compte Stripe' };
                }

                console.log('✅ New Stripe account created and saved:', account.id);
            } else {
                // Account exists, use it but don't change is_active yet
                // is_active will be set to true by Stripe webhook after onboarding completion
                console.log('🔄 Using existing Stripe account:', existingAccount.stripe_account_id);
                stripeAccountId = existingAccount.stripe_account_id;
                console.log('✅ Existing Stripe account will be used');
            }

            // Create Stripe Connect account link
            const accountLink = await locals.stripe.accountLinks.create({
                account: stripeAccountId,
                refresh_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/onboarding?refresh=true`,
                return_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/onboarding?success=true`,
                type: 'account_onboarding',
            });

            console.log('🔗 Stripe Connect URL created:', accountLink.url);
            return { success: true, url: accountLink.url };
        } catch (err) {
            console.error('Error in Stripe Connect process:', err);
            return { success: false, error: 'Erreur lors de la connexion Stripe' };
        }
    }
};
