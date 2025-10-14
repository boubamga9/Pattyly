import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { shopCreationSchema, paypalConfigSchema } from './schema';
import { validateImageServer, validateAndRecompressImage, logValidationInfo } from '$lib/utils/images/server';
import { sanitizeFileName } from '$lib/utils/filename-sanitizer';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { STRIPE_PRICES } from '$lib/config/server';
// import { PUBLIC_SITE_URL } from '$env/static/public';
// import { paypalClient } from '$lib/paypal/client.js';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});




export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase }, url }) => {
    const { session, user } = await safeGetSession();

    // 🟢 Redirection 1 — pas connecté
    if (!session || !user) {
        throw redirect(303, '/login');
    }

    const userId = user.id;

    // 🧠 On récupère les données, mais sans inclure les redirections ici
    const { data: onboardingData, error: dbError } = await supabase.rpc('get_onboarding_data', {
        p_profile_id: userId
    });

    if (dbError) {
        console.error('Error fetching onboarding data:', dbError);
        throw error(500, 'Erreur lors du chargement des données');
    }

    const { shop, payment_link } = onboardingData as any;

    // 🟢 Redirection 2 — compte déjà actif (avec payment_link)
    if (shop && payment_link) {
        throw redirect(303, '/dashboard');
    }

    // 🧩 Cas 1 : boutique créée mais pas PayPal → étape 2
    if (shop) {
        return {
            step: 2,
            shop,
            form: await superValidate(zod(paypalConfigSchema))
        };
    }

    // 🧩 Cas 2 : aucune boutique → étape 1
    return {
        step: 1,
        shop: null,
        form: await superValidate(zod(shopCreationSchema))
    };
};

/**
 * Créer un essai gratuit pour un utilisateur avec PayPal.me
 * Inspiré de createTrialForUser mais adapté pour le nouveau système
 */
async function createTrialForPayPalMe(locals: any, paypalMe: string, userId: string) {
    console.log('🚀 [PayPal.me Trial] Starting createTrialForPayPalMe with paypalMe:', paypalMe);

    try {
        // Récupérer les infos du profile
        const { data: profileData } = await locals.supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single();

        if (!profileData?.email) {
            console.error('❌ [PayPal.me Trial] Profile email not found');
            return false;
        }

        // ✅ La vérification anti-fraud et la création de l'essai sont gérées automatiquement par check_and_create_trial
        console.log('🔄 [PayPal.me Trial] Calling check_and_create_trial RPC with params:', {
            p_paypal_me: paypalMe
        });

        // Appeler la fonction RPC mise à jour
        // Elle retourne TRUE si c'est un nouvel utilisateur, FALSE sinon
        const { data: isNewUser, error: rpcError } = await locals.supabase.rpc('check_and_create_trial', {
            p_paypal_me: paypalMe
        });

        if (rpcError) {
            console.error('❌ [PayPal.me Trial] RPC check_and_create_trial error:', rpcError);
            return false;
        }

        console.log('✅ [PayPal.me Trial] RPC check_and_create_trial result:', { isNewUser });

        // Vérifier que l'enregistrement anti_fraud a bien été créé
        const { data: antiFraudCheck } = await locals.supabase
            .from('anti_fraud')
            .select('*')
            .eq('paypal_me', paypalMe);

        console.log('🔍 [PayPal.me Trial] Anti-fraud record verification:', antiFraudCheck);

        return true;
    } catch (error) {
        console.error('❌ [PayPal.me Trial] Failed to create trial:', error);
        return false;
    }
}

export const actions: Actions = {
    createShop: async ({ request, locals: { safeGetSession, supabase } }) => {
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
            let logoUrl: string | null = null;

            // Gestion du logo si fourni
            if (logo && logo.size > 0) {
                const validationResult = await validateAndRecompressImage(logo, 'LOGO');
                if (!validationResult.isValid) {
                    const cleanForm = await superValidate(zod(shopCreationSchema));
                    setError(cleanForm, 'logo', validationResult.error || 'Validation du logo échouée');
                    console.log('Return error');
                    return { form: cleanForm };
                }

                const imageToUpload = validationResult.compressedFile || logo;
                const sanitizedFileName = sanitizeFileName(imageToUpload.name);
                const fileName = `logos/${userId}/${Date.now()}_${sanitizedFileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('shop-logos')
                    .upload(fileName, imageToUpload, { cacheControl: '3600', upsert: false });

                if (uploadError) {
                    const cleanForm = await superValidate(zod(shopCreationSchema));
                    setError(cleanForm, 'logo', 'Erreur lors du téléchargement du logo');
                    console.log('Return error');
                    return { form: cleanForm };
                }

                const { data: urlData } = supabase.storage.from('shop-logos').getPublicUrl(fileName);
                logoUrl = urlData.publicUrl;
            }

            // ✅ OPTIMISÉ : Vérification du slug intégrée dans la fonction SQL
            // Création de la boutique avec disponibilités en une transaction
            const { data: shop, error: createError } = await supabase.rpc('create_shop_with_availabilities', {
                p_profile_id: userId,
                p_name: name,
                p_bio: bio ?? null,
                p_slug: slug,
                p_logo_url: logoUrl,
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

    createPaymentLink: async ({ request, locals }) => {
        try {
            const { session, user } = await locals.safeGetSession();

            if (!session || !user) {
                const cleanForm = await superValidate(zod(paypalConfigSchema));
                setError(cleanForm, 'paypal_me', 'Non autorisé');
                return { form: cleanForm };
            }

            const userId = user.id;
            const form = await superValidate(request, zod(paypalConfigSchema));

            if (!form.valid) {
                const cleanForm = await superValidate(zod(paypalConfigSchema));
                cleanForm.errors = form.errors;
                cleanForm.valid = false;
                return { form: cleanForm };
            }

            const { paypal_me } = form.data;

            console.log('Creating payment link for user:', userId, 'with PayPal.me:', paypal_me);

            // Créer le payment_link
            const { error: insertError } = await (locals.supabase as any)
                .from('payment_links')
                .insert({
                    profile_id: userId,
                    paypal_me: paypal_me
                });

            if (insertError) {
                console.error('Failed to create payment link:', insertError);
                const cleanForm = await superValidate(zod(paypalConfigSchema));

                // Gérer les erreurs spécifiques
                if (insertError.code === '23505') { // Unique constraint violation
                    setError(cleanForm, 'paypal_me', 'Ce nom PayPal.me est déjà utilisé');
                } else {
                    setError(cleanForm, 'paypal_me', 'Erreur lors de la création du lien de paiement');
                }
                return { form: cleanForm };
            }

            console.log('✅ [Onboarding] Payment link created successfully');

            // Créer l'essai gratuit et la ligne anti_fraud
            console.log('🚀 [Onboarding] Creating trial for PayPal.me user...');
            const trialCreated = await createTrialForPayPalMe(locals, paypal_me, userId);

            if (trialCreated) {
                console.log('✅ [Onboarding] Trial created successfully');
            } else {
                console.log('⚠️ [Onboarding] Trial creation failed or skipped (already exists)');
            }

            const cleanForm = await superValidate(zod(paypalConfigSchema));
            cleanForm.message = 'Lien PayPal créé avec succès !';
            return {
                form: cleanForm,
                success: true
            };

        } catch (err) {
            console.error('Payment link creation error:', err);
            const cleanForm = await superValidate(zod(paypalConfigSchema));
            setError(cleanForm, 'paypal_me', 'Une erreur inattendue est survenue');
            return { form: cleanForm };
        }
    }
};
