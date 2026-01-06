import { redirect, error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { shopCreationSchema, paypalConfigSchema, paymentConfigSchema } from './schema';
import { directorySchema } from '$lib/validations/schemas/shop';
import { z } from 'zod';
import { uploadShopLogo } from '$lib/cloudinary';
import { STRIPE_PRICES } from '$lib/config/server';
import { PUBLIC_SITE_URL } from '$env/static/public';
import {
	createStripeConnectAccount,
	createStripeAccountLink,
	getStripeConnectAccount,
	isStripeConnectAccountReady
} from '$lib/stripe/connect-client';
// import { paypalClient } from '$lib/paypal/client.js';




export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase, stripe }, url }) => {
    const { session, user } = await safeGetSession();

    // 🟢 Redirection 1 — pas connecté
    if (!session || !user) {
        throw redirect(303, '/login');
    }

    const userId = user.id;

    // Gérer le retour de Stripe Connect OAuth
    if (url.searchParams.get('stripe_connect') === 'return') {
        try {
            // Récupérer le compte Stripe Connect
            const { data: account } = await supabase
                .from('stripe_connect_accounts')
                .select('stripe_account_id')
                .eq('profile_id', userId)
                .single();

            if (account?.stripe_account_id) {
                // Vérifier le statut du compte
                const stripeAccount = await getStripeConnectAccount(stripe, account.stripe_account_id);

                // Mettre à jour dans la DB
                const { error: updateError } = await supabase
                    .from('stripe_connect_accounts')
                    .update({
                        is_active: isStripeConnectAccountReady(stripeAccount),
                        charges_enabled: stripeAccount.charges_enabled || false,
                        payouts_enabled: stripeAccount.payouts_enabled || false,
                        details_submitted: stripeAccount.details_submitted || false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('profile_id', userId);

                if (!updateError && isStripeConnectAccountReady(stripeAccount)) {
                    // Créer/mettre à jour payment_links si le compte est actif
                    await supabase
                        .from('payment_links')
                        .upsert({
                            profile_id: userId,
                            provider_type: 'stripe',
                            payment_identifier: account.stripe_account_id,
                            is_active: true,
                        }, {
                            onConflict: 'profile_id,provider_type'
                        });
                }
            }
        } catch (err) {
            console.error('Error handling Stripe Connect callback:', err);
            // Continue même si l'erreur - l'utilisateur pourra réessayer
        }

        // Rediriger vers la même page sans le paramètre pour éviter les problèmes
        throw redirect(303, '/onboarding');
    }

    // 🧠 On récupère les données, mais sans inclure les redirections ici
    const { data: onboardingData, error: dbError } = await supabase.rpc('get_onboarding_data', {
        p_profile_id: userId
    });

    if (dbError) {
        console.error('Error fetching onboarding data:', dbError);
        throw error(500, 'Erreur lors du chargement des données');
    }

    const { shop, has_paypal } = onboardingData as any;

    // Vérifier qu'au moins un payment provider est configuré
    const { data: paymentLinks } = await supabase
        .from('payment_links')
        .select('provider_type, payment_identifier')
        .eq('profile_id', userId);

    // Vérifier aussi Stripe Connect
    const { data: stripeConnectAccount } = await supabase
        .from('stripe_connect_accounts')
        .select('id')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .eq('charges_enabled', true)
        .single();

    const hasPaymentMethod = (paymentLinks && paymentLinks.length > 0) || !!stripeConnectAccount;

    // 🟢 Redirection 2 — compte déjà actif (avec payment method et annuaire configuré)
    if (shop && hasPaymentMethod) {
        // Vérifier si l'annuaire est déjà configuré
        const { data: shopData } = await supabase
            .from('shops')
            .select('directory_city, directory_actual_city, directory_postal_code, directory_cake_types')
            .eq('id', shop.id)
            .single();

        // Si l'annuaire est configuré, rediriger vers le dashboard
        // La redirection vers subscription se fera côté client si un plan est dans localStorage
        if (shopData?.directory_city && shopData?.directory_actual_city && shopData?.directory_postal_code) {
            throw redirect(303, '/dashboard');
        }
    }

    // 🧩 Cas 1 : boutique + payment method mais pas annuaire → étape 3
    if (shop && hasPaymentMethod) {
        // Récupérer les données complètes de la boutique avec les champs directory
        const { data: shopData } = await supabase
            .from('shops')
            .select('id, name, slug, logo_url, directory_city, directory_actual_city, directory_postal_code, directory_cake_types, directory_enabled')
            .eq('id', shop.id)
            .single();

        return {
            step: 3,
            shop: shopData || shop,
            form: await superValidate(zod(directorySchema), {
                defaults: {
                    directory_city: shopData?.directory_city || '',
                    directory_actual_city: shopData?.directory_actual_city || '',
                    directory_postal_code: shopData?.directory_postal_code || '',
                    directory_cake_types: shopData?.directory_cake_types || [],
                    directory_enabled: shopData?.directory_enabled || false
                }
            })
        };
    }

    // 🧩 Cas 2 : boutique créée mais pas de payment method → étape 2
    if (shop) {
        // Charger les payment_links existants pour pré-remplir le formulaire
        const { data: existingLinks } = await supabase
            .from('payment_links')
            .select('provider_type, payment_identifier')
            .eq('profile_id', userId);

        // Charger le compte Stripe Connect si existant
        const { data: stripeConnectAccount } = await supabase
            .from('stripe_connect_accounts')
            .select('id, is_active, charges_enabled, payouts_enabled, stripe_account_id')
            .eq('profile_id', userId)
            .single();

        const defaults: any = {};
        existingLinks?.forEach(link => {
            if (link.provider_type === 'paypal') {
                defaults.paypal_me = link.payment_identifier;
            } else if (link.provider_type === 'revolut') {
                defaults.revolut_me = link.payment_identifier;
            }
        });

        return {
            step: 2,
            shop,
            form: await superValidate(zod(paymentConfigSchema), { defaults }),
            stripeConnectAccount: stripeConnectAccount || null
        };
    }

    // 🧩 Cas 3 : aucune boutique → étape 1
    return {
        step: 1,
        shop: null,
        form: await superValidate(zod(shopCreationSchema)),
        stripeConnectAccount: null
    };
};

// ✅ Fonction supprimée : L'essai gratuit est maintenant géré uniquement via Stripe
// lors du choix d'un plan payant dans /subscription avec demande de CB

export const actions: Actions = {
    createShop: async ({ request, locals: { safeGetSession, supabase, supabaseServiceRole } }) => {
        try {
            const { session, user } = await safeGetSession();

            if (!session || !user) {
                const form = await superValidate(zod(shopCreationSchema));
                setError(form, 'name', 'Non autorisé');
                console.log('Return error');
                return { form };
            }

            const userId = user.id;
            const form = await superValidate(request, zod(shopCreationSchema));

            if (!form.valid) {
                const cleanForm = await superValidate(zod(shopCreationSchema));
                cleanForm.errors = form.errors;
                cleanForm.valid = false;
                console.log('Return error');
                return { form: cleanForm };
            }

            const { name, bio, slug, logo, instagram, tiktok, website } = form.data;

            // ✅ OPTIMISÉ : Vérification du slug intégrée dans la fonction SQL
            // Création de la boutique avec disponibilités en une transaction (sans logo d'abord)
            const { data: shop, error: createError } = await supabase.rpc('create_shop_with_availabilities', {
                p_profile_id: userId,
                p_name: name,
                p_bio: bio ?? null,
                p_slug: slug,
                p_logo_url: null, // Logo sera ajouté après si fourni
                p_instagram: instagram ?? null,
                p_tiktok: tiktok ?? null,
                p_website: website ?? null
            });

            if (createError) {
                console.error('Error creating shop:', createError);
                const cleanForm = await superValidate(zod(shopCreationSchema));

                // Gérer les erreurs spécifiques
                if (createError.code === '23505') { // Unique constraint violation
                    setError(cleanForm, 'slug', "Ce nom d'URL est déjà pris. Veuillez en choisir un autre.");
                } else {
                    setError(cleanForm, 'name', 'Erreur lors de la création de la boutique');
                }
                console.log('Return error');
                return { form: cleanForm };
            }

            // Gestion du logo si fourni (maintenant qu'on a le shopId)
            let logoUrl: string | null = null;
            if (logo && logo.size > 0 && shop?.id) {
                // Validation basique : taille max 5MB
                if (logo.size > 5 * 1024 * 1024) {
                    // Supprimer la boutique créée si l'upload échoue
                    await supabase.from('shops').delete().eq('id', shop.id);
                    const cleanForm = await superValidate(zod(shopCreationSchema));
                    setError(cleanForm, 'logo', 'Le logo ne doit pas dépasser 5MB');
                    return { form: cleanForm };
                }

                // Vérifier que c'est bien une image
                if (!logo.type.startsWith('image/')) {
                    // Supprimer la boutique créée si l'upload échoue
                    await supabase.from('shops').delete().eq('id', shop.id);
                    const cleanForm = await superValidate(zod(shopCreationSchema));
                    setError(cleanForm, 'logo', 'Le fichier doit être une image');
                    return { form: cleanForm };
                }

                try {
                    // Upload vers Cloudinary avec le shopId (organisation par boutique)
                    const uploadResult = await uploadShopLogo(logo, shop.id);
                    logoUrl = uploadResult.secure_url;

                    // Mettre à jour la boutique avec l'URL du logo
                    await supabase
                        .from('shops')
                        .update({ logo_url: logoUrl })
                        .eq('id', shop.id);
                } catch (err) {
                    console.error('❌ [Onboarding] Erreur Cloudinary logo:', err);
                    // Supprimer la boutique créée si l'upload échoue
                    await supabase.from('shops').delete().eq('id', shop.id);
                    const cleanForm = await superValidate(zod(shopCreationSchema));
                    setError(cleanForm, 'logo', 'Erreur lors de l\'upload du logo');
                    return { form: cleanForm };
                }
            }

            // ✅ Tracking: Shop created (fire-and-forget pour ne pas bloquer)
            const { logEventAsync, Events } = await import('$lib/utils/analytics');
            logEventAsync(
                supabaseServiceRole,
                Events.SHOP_CREATED,
                { shop_id: shop.id, shop_name: name, shop_slug: slug },
                userId,
                '/onboarding'
            );

            // ✅ Ajouter à Resend (fire-and-forget)
            const { syncPastryToResend } = await import('$lib/utils/resend-sync');
            syncPastryToResend(userId, user.email || '', supabase).catch(err => {
                console.error('Erreur synchronisation Resend:', err);
            });

            // Retour succès
            const cleanForm = await superValidate(zod(shopCreationSchema));
            cleanForm.message = 'Boutique créée avec succès !';
            return { form: cleanForm, success: true, shop };

        } catch (error) {
            // Gestion globale des erreurs inattendues
            console.error(error);
            const form = await superValidate(zod(shopCreationSchema));
            setError(form, 'name', 'Une erreur inattendue est survenue. Veuillez réessayer.');
            return { form };
        }
    },

    createPaymentLinks: async ({ request, locals }) => {
        try {
            const { session, user } = await locals.safeGetSession();

            if (!session || !user) {
                const cleanForm = await superValidate(zod(paymentConfigSchema));
                setError(cleanForm, 'paypal_me', 'Non autorisé');
                return { form: cleanForm };
            }

            const userId = user.id;
            const form = await superValidate(request, zod(paymentConfigSchema));

            if (!form.valid) {
                const cleanForm = await superValidate(zod(paymentConfigSchema));
                cleanForm.errors = form.errors;
                cleanForm.valid = false;
                return { form: cleanForm };
            }

            const { paypal_me, revolut_me } = form.data;

            // Vérifier qu'au moins un est rempli (déjà fait par Zod, mais double vérification)
            // Les chaînes vides sont transformées en undefined par le schéma
            const hasPaypal = paypal_me !== undefined && paypal_me !== null && paypal_me.trim() !== '';
            const hasRevolut = revolut_me !== undefined && revolut_me !== null && revolut_me.trim() !== '';

            if (!hasPaypal && !hasRevolut) {
                const cleanForm = await superValidate(zod(paymentConfigSchema));
                setError(cleanForm, 'paypal_me', 'Vous devez configurer au moins une méthode de paiement');
                return { form: cleanForm };
            }

            console.log('Creating payment links for user:', userId, {
                paypal: hasPaypal ? paypal_me : 'none',
                revolut: hasRevolut ? revolut_me : 'none'
            });

            // Supprimer les anciens payment_links pour ce profil
            const { error: deleteError } = await locals.supabase
                .from('payment_links')
                .delete()
                .eq('profile_id', userId);

            if (deleteError) {
                console.error('Failed to delete old payment links:', deleteError);
            }

            // Insérer les nouveaux payment_links
            const inserts: any[] = [];

            if (hasPaypal) {
                inserts.push({
                    profile_id: userId,
                    provider_type: 'paypal',
                    payment_identifier: paypal_me.trim()
                });
            }

            if (hasRevolut) {
                inserts.push({
                    profile_id: userId,
                    provider_type: 'revolut',
                    payment_identifier: revolut_me.trim()
                });
            }

            if (inserts.length > 0) {
                const { error: insertError } = await locals.supabase
                    .from('payment_links')
                    .insert(inserts);

                if (insertError) {
                    console.error('Failed to create payment links:', insertError);
                    const cleanForm = await superValidate(zod(paymentConfigSchema));

                    // Gérer les erreurs spécifiques
                    if (insertError.code === '23505') { // Unique constraint violation
                        setError(cleanForm, 'paypal_me', 'Erreur: un provider est déjà configuré');
                    } else {
                        setError(cleanForm, 'paypal_me', 'Erreur lors de la création des liens de paiement');
                    }
                    return { form: cleanForm };
                }
            }

            console.log('✅ [Onboarding] Payment links created successfully');

            // Récupérer la boutique pour passer à l'étape 3
            const { data: shopData } = await locals.supabase
                .from('shops')
                .select('id, name, slug, directory_city, directory_actual_city, directory_postal_code, directory_cake_types, directory_enabled')
                .eq('profile_id', userId)
                .single();

            // ✅ Tracking: Payment enabled (fire-and-forget pour ne pas bloquer)
            const { logEventAsync, Events } = await import('$lib/utils/analytics');
            logEventAsync(
                locals.supabaseServiceRole,
                Events.PAYMENT_ENABLED,
                {
                    shop_id: shopData?.id,
                    providers: inserts.map(i => i.provider_type).join(',')
                },
                userId,
                '/onboarding'
            );

            const cleanForm = await superValidate(zod(paymentConfigSchema));
            cleanForm.message = 'Méthodes de paiement configurées avec succès !';
            return {
                form: cleanForm,
                success: true,
                shop: shopData
            };

        } catch (err) {
            console.error('Payment links creation error:', err);
            const cleanForm = await superValidate(zod(paymentConfigSchema));
            setError(cleanForm, 'paypal_me', 'Une erreur inattendue est survenue');
            return { form: cleanForm };
        }
    },

    connectStripe: async ({ locals, url }) => {
        const { session, user } = await locals.safeGetSession();

        if (!session || !user) {
            return { success: false, error: 'Non autorisé' };
        }

        const userId = user.id;

        try {
            // Vérifier si un compte existe déjà
            const { data: existingAccount, error: selectError } = await locals.supabase
                .from('stripe_connect_accounts')
                .select('stripe_account_id')
                .eq('profile_id', userId)
                .single();

            // Logger les erreurs de sélection (PGRST116 = not found, c'est OK)
            if (selectError && selectError.code !== 'PGRST116') {
                console.error('Error fetching existing Stripe Connect account:', selectError);
            }

            let accountId: string;

            if (existingAccount?.stripe_account_id) {
                accountId = existingAccount.stripe_account_id;
                console.log('Using existing Stripe Connect account:', accountId);
            } else {
                // Créer un nouveau compte Connect Express
                console.log('Creating new Stripe Connect account for user:', userId);
                const account = await createStripeConnectAccount(locals.stripe, user.email || '', 'FR');
                accountId = account.id;
                console.log('Stripe Connect account created:', accountId);

                // Sauvegarder dans la DB
                const { error: insertError } = await locals.supabase
                    .from('stripe_connect_accounts')
                    .insert({
                        profile_id: userId,
                        stripe_account_id: accountId,
                        is_active: false,
                        charges_enabled: false,
                        payouts_enabled: false,
                        details_submitted: false,
                    });

                if (insertError) {
                    console.error('Error saving Stripe Connect account:', insertError);
                    return { success: false, error: `Erreur lors de la sauvegarde: ${insertError.message}` };
                }
                console.log('Stripe Connect account saved to database');
            }

            // Créer un account link pour l'onboarding
            const returnUrl = `${PUBLIC_SITE_URL}/onboarding?stripe_connect=return`;
            console.log('Creating account link with returnUrl:', returnUrl);
            const accountLink = await createStripeAccountLink(locals.stripe, accountId, returnUrl);
            console.log('Account link created:', accountLink.url);

            return { success: true, url: accountLink.url };
        } catch (err) {
            // Logger l'erreur complète avec tous les détails
            console.error('Stripe Connect error details:', {
                error: err,
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
                userId,
                publicSiteUrl: PUBLIC_SITE_URL
            });
            
            // Retourner un message plus informatif
            const errorMessage = err instanceof Error 
                ? `Erreur Stripe: ${err.message}` 
                : 'Erreur lors de la connexion Stripe';
            return { success: false, error: errorMessage };
        }
    },

    updatePaypal: async ({ request, locals }) => {
        try {
            const { session, user } = await locals.safeGetSession();

            if (!session || !user) {
                const cleanForm = await superValidate(zod(paymentConfigSchema));
                setError(cleanForm, 'paypal_me', 'Non autorisé');
                return { form: cleanForm };
            }

            const userId = user.id;
            const formData = await request.formData();
            const paypal_me = formData.get('paypal_me') as string;

            // Valider le champ PayPal
            const paypalSchema = z.object({
                paypal_me: z.string()
                    .optional()
                    .transform((val) => {
                        if (!val || val.trim() === '') return undefined;
                        return val.toLowerCase().trim();
                    })
                    .refine(
                        (val) => {
                            if (val === undefined) return true;
                            return /^[a-zA-Z0-9_-]+$/.test(val) && val.length >= 1 && val.length <= 50;
                        },
                        {
                            message: 'Le nom PayPal.me ne peut contenir que des lettres, chiffres, tirets et underscores (max 50 caractères)'
                        }
                    )
            });

            const validation = paypalSchema.safeParse({ paypal_me });
            
            if (!validation.success) {
                const cleanForm = await superValidate(zod(paymentConfigSchema));
                const error = validation.error.errors[0];
                setError(cleanForm, 'paypal_me', error.message);
                return { form: cleanForm };
            }

            const validatedPaypal = validation.data.paypal_me;

            // Utiliser upsert pour mettre à jour uniquement PayPal, sans affecter Revolut
            if (validatedPaypal) {
                const { error: upsertError } = await locals.supabase
                    .from('payment_links')
                    .upsert({
                        profile_id: userId,
                        provider_type: 'paypal',
                        payment_identifier: validatedPaypal,
                        is_active: true
                    }, {
                        onConflict: 'profile_id,provider_type'
                    });

                if (upsertError) {
                    console.error('❌ [PayPal] Failed to upsert payment link:', upsertError);
                    const cleanForm = await superValidate(zod(paymentConfigSchema));
                    setError(cleanForm, 'paypal_me', 'Erreur lors de la sauvegarde de PayPal');
                    return { form: cleanForm };
                }

                console.log('✅ [PayPal] Successfully saved PayPal payment link');
            } else {
                // Si vide, supprimer le payment_link PayPal
                const { error: deleteError } = await locals.supabase
                    .from('payment_links')
                    .delete()
                    .eq('profile_id', userId)
                    .eq('provider_type', 'paypal');

                if (deleteError) {
                    console.warn('⚠️ [PayPal] Failed to delete payment link:', deleteError);
                } else {
                    console.log('✅ [PayPal] Successfully removed PayPal payment link');
                }
            }

            // Récupérer la valeur Revolut actuelle pour la conserver dans le formulaire
            const { data: currentRevolut } = await locals.supabase
                .from('payment_links')
                .select('payment_identifier')
                .eq('profile_id', userId)
                .eq('provider_type', 'revolut')
                .eq('is_active', true)
                .single();

            // Retourner le formulaire mis à jour (conserver les deux valeurs)
            const updatedForm = await superValidate(zod(paymentConfigSchema), {
                defaults: {
                    paypal_me: validatedPaypal,
                    revolut_me: currentRevolut?.payment_identifier || undefined
                }
            });
            updatedForm.message = 'PayPal sauvegardé avec succès !';
            return { form: updatedForm };

        } catch (err) {
            console.error('PayPal update error:', err);
            const cleanForm = await superValidate(zod(paymentConfigSchema));
            setError(cleanForm, 'paypal_me', 'Une erreur inattendue est survenue');
            return { form: cleanForm };
        }
    },

    updateRevolut: async ({ request, locals }) => {
        try {
            const { session, user } = await locals.safeGetSession();

            if (!session || !user) {
                const cleanForm = await superValidate(zod(paymentConfigSchema));
                setError(cleanForm, 'revolut_me', 'Non autorisé');
                return { form: cleanForm };
            }

            const userId = user.id;
            const formData = await request.formData();
            const revolut_me = formData.get('revolut_me') as string;

            // Valider le champ Revolut
            const revolutSchema = z.object({
                revolut_me: z.string()
                    .optional()
                    .transform((val) => {
                        if (!val || val.trim() === '') return undefined;
                        return val.trim();
                    })
                    .refine(
                        (val) => {
                            if (val === undefined) return true;
                            return /^[a-zA-Z0-9_@.-]+$/.test(val) && val.length >= 1 && val.length <= 100;
                        },
                        {
                            message: 'L\'identifiant Revolut contient des caractères invalides (max 100 caractères)'
                        }
                    )
            });

            const validation = revolutSchema.safeParse({ revolut_me });
            
            if (!validation.success) {
                const cleanForm = await superValidate(zod(paymentConfigSchema));
                const error = validation.error.errors[0];
                setError(cleanForm, 'revolut_me', error.message);
                return { form: cleanForm };
            }

            const validatedRevolut = validation.data.revolut_me;

            // Utiliser upsert pour mettre à jour uniquement Revolut, sans affecter PayPal
            if (validatedRevolut) {
                const { error: upsertError } = await locals.supabase
                    .from('payment_links')
                    .upsert({
                        profile_id: userId,
                        provider_type: 'revolut',
                        payment_identifier: validatedRevolut,
                        is_active: true
                    }, {
                        onConflict: 'profile_id,provider_type'
                    });

                if (upsertError) {
                    console.error('❌ [Revolut] Failed to upsert payment link:', upsertError);
                    const cleanForm = await superValidate(zod(paymentConfigSchema));
                    setError(cleanForm, 'revolut_me', 'Erreur lors de la sauvegarde de Revolut');
                    return { form: cleanForm };
                }

                console.log('✅ [Revolut] Successfully saved Revolut payment link');
            } else {
                // Si vide, supprimer le payment_link Revolut
                const { error: deleteError } = await locals.supabase
                    .from('payment_links')
                    .delete()
                    .eq('profile_id', userId)
                    .eq('provider_type', 'revolut');

                if (deleteError) {
                    console.warn('⚠️ [Revolut] Failed to delete payment link:', deleteError);
                } else {
                    console.log('✅ [Revolut] Successfully removed Revolut payment link');
                }
            }

            // Récupérer la valeur PayPal actuelle pour la conserver dans le formulaire
            const { data: currentPaypal } = await locals.supabase
                .from('payment_links')
                .select('payment_identifier')
                .eq('profile_id', userId)
                .eq('provider_type', 'paypal')
                .eq('is_active', true)
                .single();

            // Retourner le formulaire mis à jour (conserver les deux valeurs)
            const updatedForm = await superValidate(zod(paymentConfigSchema), {
                defaults: {
                    paypal_me: currentPaypal?.payment_identifier || undefined,
                    revolut_me: validatedRevolut
                }
            });
            updatedForm.message = 'Revolut sauvegardé avec succès !';
            return { form: updatedForm };

        } catch (err) {
            console.error('Revolut update error:', err);
            const cleanForm = await superValidate(zod(paymentConfigSchema));
            setError(cleanForm, 'revolut_me', 'Une erreur inattendue est survenue');
            return { form: cleanForm };
        }
    },

    updateDirectory: async ({ request, locals: { safeGetSession, supabase }, url }) => {
        try {
            console.log('📋 [Onboarding Directory] updateDirectory called');
            const { session, user } = await safeGetSession();

            if (!session || !user) {
                console.log('📋 [Onboarding Directory] No session or user');
                const form = await superValidate(zod(directorySchema));
                setError(form, 'directory_city', 'Non autorisé');
                return { form };
            }

            const userId = user.id;
            console.log('📋 [Onboarding Directory] Validating form for user:', userId);
            const form = await superValidate(request, zod(directorySchema));

            console.log('📋 [Onboarding Directory] Form validation result:', {
                valid: form.valid,
                data: form.data,
                errors: form.errors
            });

            if (!form.valid) {
                console.log('📋 [Onboarding Directory] Form invalid, returning errors');
                const cleanForm = await superValidate(zod(directorySchema));
                cleanForm.errors = form.errors;
                cleanForm.valid = false;
                return { form: cleanForm };
            }

            // Récupérer la boutique avec les informations actuelles pour détecter les changements
            const { data: shop, error: shopError } = await supabase
                .from('shops')
                .select('id, directory_actual_city, directory_city, directory_postal_code, latitude, longitude')
                .eq('profile_id', userId)
                .single();

            if (shopError || !shop) {
                const cleanForm = await superValidate(zod(directorySchema));
                setError(cleanForm, 'directory_city', 'Boutique non trouvée');
                return { form: cleanForm };
            }

            // Vérifier si la ville a changé pour déclencher le géocodage
            const cityChanged = 
                shop.directory_actual_city !== form.data.directory_actual_city ||
                shop.directory_city !== form.data.directory_city ||
                shop.directory_postal_code !== form.data.directory_postal_code;

            // Mettre à jour les champs annuaire
            console.log('📋 [Onboarding Directory] Updating shop with data:', {
                shop_id: shop.id,
                directory_city: form.data.directory_city,
                directory_actual_city: form.data.directory_actual_city,
                directory_postal_code: form.data.directory_postal_code,
                directory_cake_types: form.data.directory_cake_types,
                directory_enabled: form.data.directory_enabled
            });

            const { error: updateError } = await supabase
                .from('shops')
                .update({
                    directory_city: form.data.directory_city,
                    directory_actual_city: form.data.directory_actual_city,
                    directory_postal_code: form.data.directory_postal_code,
                    directory_cake_types: form.data.directory_cake_types,
                    directory_enabled: form.data.directory_enabled
                })
                .eq('id', shop.id);

            if (updateError) {
                console.error('❌ [Onboarding Directory] Update error:', updateError);
                const cleanForm = await superValidate(zod(directorySchema));
                setError(cleanForm, 'directory_city', 'Erreur lors de la sauvegarde');
                return { form: cleanForm };
            }

            // ✅ Géocoder automatiquement si la ville a changé ou si les coordonnées sont manquantes
            const cityName = form.data.directory_actual_city || form.data.directory_city;
            if (cityName && (cityChanged || !shop.latitude || !shop.longitude)) {
                const { geocodeShopIfNeeded } = await import('$lib/utils/geocoding');
                try {
                    const success = await geocodeShopIfNeeded(
                        supabase,
                        shop.id,
                        cityName,
                        form.data.directory_postal_code
                    );
                    if (!success) {
                        console.warn(`⚠️ [Onboarding Directory] Géocodage échoué pour ${cityName}, mais la mise à jour a réussi`);
                    } else {
                        console.log(`✅ [Onboarding Directory] Coordonnées géocodées avec succès pour ${cityName}`);
                    }
                } catch (error) {
                    console.error('❌ [Onboarding Directory] Erreur lors du géocodage automatique:', error);
                    // Ne pas faire échouer la requête si le géocodage échoue
                }
            }

            console.log('📋 [Onboarding Directory] Update successful, creating success form');

            // Retour succès - retourner le formulaire avec les valeurs soumises dans les defaults
            const successForm = await superValidate(zod(directorySchema), {
                defaults: {
                    directory_city: form.data.directory_city,
                    directory_actual_city: form.data.directory_actual_city,
                    directory_postal_code: form.data.directory_postal_code,
                    directory_cake_types: form.data.directory_cake_types,
                    directory_enabled: form.data.directory_enabled
                }
            });
            successForm.message = 'Inscription à l\'annuaire terminée !';

            console.log('📋 [Onboarding Directory] Returning success form:', {
                valid: successForm.valid,
                data: successForm.data,
                message: successForm.message
            });

            return {
                form: successForm,
                success: true
            };

        } catch (error) {
            console.error('❌ [Onboarding Directory] Error:', error);
            const form = await superValidate(zod(directorySchema));
            setError(form, 'directory_city', 'Une erreur inattendue est survenue');
            return { form };
        }
    },

    skipDirectory: async ({ locals: { safeGetSession, supabase }, url }) => {
        try {
            const { session, user } = await safeGetSession();

            if (!session || !user) {
                throw redirect(303, '/login');
            }

            const userId = user.id;

            // Récupérer la boutique
            const { data: shop, error: shopError } = await supabase
                .from('shops')
                .select('id')
                .eq('profile_id', userId)
                .single();

            if (shopError || !shop) {
                throw error(500, 'Boutique non trouvée');
            }

            // Mettre directory_enabled à false
            const { error: updateError } = await supabase
                .from('shops')
                .update({
                    directory_enabled: false
                })
                .eq('id', shop.id);

            if (updateError) {
                console.error('❌ [Onboarding Directory] Skip error:', updateError);
                throw error(500, 'Erreur lors de la sauvegarde');
            }

            // Retourner un succès - la redirection vers subscription se fera côté client si un plan est dans localStorage
            return { success: true };
        } catch (err) {
            if (err && typeof err === 'object' && 'status' in err) {
                throw err; // C'est une redirection ou une erreur
            }
            console.error('❌ [Onboarding Directory] Skip error:', err);
            throw error(500, 'Une erreur inattendue est survenue');
        }
    }
};
