import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getShopId } from '$lib/permissions';

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
            shop
        };
    }

    // No shop exists, show step 1
    return {
        step: 1,
        shop: null
    };
};

export const actions: Actions = {
    createShop: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();

        if (!session) {
            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;
        const formData = await request.formData();

        const name = formData.get('name') as string;
        const bio = formData.get('bio') as string;
        const slug = formData.get('slug') as string;
        const logoFile = formData.get('logo') as File;

        // Validation
        if (!name || !slug) {
            return { success: false, error: 'Nom et slug sont obligatoires' };
        }

        // Validate slug format (only lowercase letters, numbers, hyphens)
        if (!/^[a-z0-9-]+$/.test(slug)) {
            return { success: false, error: 'Le slug doit contenir seulement des lettres minuscules, chiffres et tirets' };
        }

        // Validate logo file if provided
        let logoUrl = null;
        if (logoFile && logoFile.size > 0) {
            // Check file type
            if (!logoFile.type.startsWith('image/')) {
                return { success: false, error: 'Le logo doit être une image' };
            }

            // Check file size (max 1MB)
            if (logoFile.size > 1 * 1024 * 1024) {
                return { success: false, error: 'Le logo ne doit pas dépasser 1MB' };
            }

            try {
                // Upload to Supabase Storage
                const fileName = `${userId}/${Date.now()}-${logoFile.name}`;
                const { error: uploadError } = await locals.supabase.storage
                    .from('shop-logos')
                    .upload(fileName, logoFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Error uploading logo:', uploadError);
                    return { success: false, error: 'Erreur lors de l\'upload du logo' };
                }

                // Get public URL
                const { data: urlData } = locals.supabase.storage
                    .from('shop-logos')
                    .getPublicUrl(fileName);

                logoUrl = urlData.publicUrl;
            } catch (err) {
                console.error('Error processing logo upload:', err);
                return { success: false, error: 'Erreur lors du traitement du logo' };
            }
        }

        try {
            // Check if slug is already taken
            const { data: existingShop } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('slug', slug)
                .single();

            if (existingShop) {
                return { success: false, error: 'Ce slug est déjà utilisé' };
            }

            // Create shop
            const { data: newShop, error: createError } = await locals.supabase
                .from('shops')
                .insert({
                    profile_id: userId,
                    name,
                    bio,
                    slug,
                    logo_url: logoUrl
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating shop:', createError);
                return { success: false, error: 'Erreur lors de la création de la boutique' };
            }

            // Create default availabilities for the shop (Monday to Friday)
            const availabilities = [];
            for (let day = 0; day < 7; day++) {
                availabilities.push({
                    shop_id: newShop.id,
                    day,
                    is_open: day >= 1 && day <= 5 // Monday (1) to Friday (5) = true, Saturday (6) and Sunday (0) = false
                });
            }

            const { error: availabilitiesError } = await locals.supabase
                .from('availabilities')
                .insert(availabilities);

            if (availabilitiesError) {
                console.error('Error creating default availabilities:', availabilitiesError);
                // Don't fail the shop creation, just log the error
            } else {
                console.log('✅ Default availabilities created for shop:', newShop.id);
            }

            return { success: true, shop: newShop };
        } catch (err) {
            console.error('Unexpected error:', err);
            return { success: false, error: 'Erreur inattendue' };
        }
    },

    connectStripe: async ({ locals }) => {
        const { session } = await locals.safeGetSession();

        if (!session) {
            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;

        try {
            // Create Stripe Connect account
            const account = await locals.stripe.accounts.create({
                type: 'express',
                country: 'FR', // Default to France, can be made configurable
                email: session.user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true }
                }
            });

            // Save Stripe Connect account to database
            const { error: insertError } = await locals.supabase
                .from('stripe_connect_accounts')
                .insert({
                    profile_id: userId,
                    stripe_account_id: account.id,
                    is_active: false // Will be set to true after onboarding completion
                });

            if (insertError) {
                console.error('Error saving Stripe account:', insertError);
                return { success: false, error: 'Erreur lors de la sauvegarde du compte Stripe' };
            }

            // Create Stripe Connect account link
            const accountLink = await locals.stripe.accountLinks.create({
                account: account.id,
                refresh_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/onboarding?refresh=true`,
                return_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/onboarding?success=true`,
                type: 'account_onboarding',
            });

            console.log('🔗 Stripe Connect URL created:', accountLink.url);
            return { success: true, url: accountLink.url };
        } catch (err) {
            console.error('Error creating Stripe Connect account:', err);
            return { success: false, error: 'Erreur lors de la connexion Stripe' };
        }
    }
};
