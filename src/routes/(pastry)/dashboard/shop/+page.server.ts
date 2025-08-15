import { error, redirect } from '@sveltejs/kit';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import type { PageServerLoad, Actions } from './$types';
import Stripe from 'stripe';
import { deleteShopLogo } from '$lib/storage-utils';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
});

export const load: PageServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();
    if (!session) {
        error(401, 'Non autorisé');
    }

    const userId = session.user.id;

    // Get shop data
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('*')
        .eq('profile_id', userId)
        .single();

    if (shopError) {
        console.error('Error loading shop:', shopError);
        error(500, 'Erreur lors du chargement de la boutique');
    }

    if (!shop) {
        error(404, 'Boutique non trouvée');
    }

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
        shop,
        stripeAccount: stripeAccount || null
    };
};

export const actions: Actions = {
    updateShop: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const bio = formData.get('bio') as string;
        const slug = formData.get('slug') as string;
        const instagram = formData.get('instagram') as string;
        const tiktok = formData.get('tiktok') as string;
        const website = formData.get('website') as string;
        const logoFile = formData.get('logo') as File;
        const currentLogoUrl = formData.get('logoUrl') as string;

        // Get shop ID
        const { data: shop } = await locals.supabase
            .from('shops')
            .select('id')
            .eq('profile_id', userId)
            .single();

        if (!shop) {
            return { success: false, error: 'Boutique non trouvée' };
        }

        // Validate inputs
        if (!name || !slug) {
            return { success: false, error: 'Le nom et l\'URL de la boutique sont obligatoires' };
        }

        if (slug.length < 3) {
            return { success: false, error: 'Le slug doit contenir au moins 3 caractères' };
        }

        // Check if slug is available (excluding current shop)
        const { data: existingShop } = await locals.supabase
            .from('shops')
            .select('id')
            .eq('slug', slug)
            .neq('id', shop.id)
            .single();

        if (existingShop) {
            return { success: false, error: 'Ce slug est déjà utilisé' };
        }

        // Handle logo upload if new file is provided
        let logoUrl = currentLogoUrl;
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

        // Update shop
        const { error: updateError } = await locals.supabase
            .from('shops')
            .update({
                name,
                bio,
                slug,
                instagram: instagram || null,
                tiktok: tiktok || null,
                website: website || null,
                logo_url: logoUrl || null
            })
            .eq('id', shop.id);

        if (updateError) {
            console.error('Error updating shop:', updateError);
            return { success: false, error: 'Erreur lors de la mise à jour' };
        }

        // Supprimer l'ancien logo si un nouveau a été uploadé
        if (logoFile && logoFile.size > 0 && currentLogoUrl && currentLogoUrl !== logoUrl) {
            await deleteShopLogo(locals.supabase, currentLogoUrl);
        }

        return { success: true };
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
