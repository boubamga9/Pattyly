import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { validateImageServer, validateAndRecompressImage, logValidationInfo } from '$lib/utils/images/server';
import { sanitizeFileName } from '$lib/utils/filename-sanitizer';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { STRIPE_PRODUCTS, STRIPE_PRICES } from '$lib/config/server';
import { paypalClient } from '$lib/paypal/client.js';


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

    // 🔄 Vérification du polling PayPal
    const paypalOnboarding = url.searchParams.get('paypal_onboarding');
    if (paypalOnboarding === 'pending') {
        // Vérifier le statut PayPal de l'utilisateur
        const { data: paypalAccount } = await supabase
            .from('paypal_accounts')
            .select('onboarding_status, is_active')
            .eq('profile_id', userId)
            .single();

        if (paypalAccount?.onboarding_status === 'completed' && paypalAccount?.is_active) {
            // PayPal onboarding terminé → rediriger vers dashboard
            throw redirect(303, '/dashboard');
        }

        // Retourner les données pour le polling côté client
        return {
            paypalPolling: true,
            paypalStatus: paypalAccount?.onboarding_status || 'pending'
        };
    }

    // 🧠 On récupère les données, mais sans inclure les redirections ici
    const { data: onboardingData, error: dbError } = await supabase.rpc('get_onboarding_data', {
        p_profile_id: userId
    });

    if (dbError) {
        console.error('Error fetching onboarding data:', dbError);
        throw error(500, 'Erreur lors du chargement des données');
    }

    const { shop, paypal_account } = onboardingData as any;

    // 🟢 Redirection 2 — compte déjà actif
    if (shop && paypal_account && paypal_account.is_active) {
        throw redirect(303, '/dashboard');
    }

    // 🧩 Cas 1 : boutique créée mais pas PayPal → étape 2
    if (shop) {
        return {
            step: 2,
            shop,
            form: await superValidate(zod(formSchema))
        };
    }

    // 🧩 Cas 2 : aucune boutique → étape 1
    return {
        step: 1,
        shop: null,
        form: await superValidate(zod(formSchema))
    };
};

export const actions: Actions = {
    createShop: async ({ request, locals: { safeGetSession, supabase } }) => {
        try {
            const { session, user } = await safeGetSession();

            if (!session || !user) {
                const form = await superValidate(zod(formSchema));
                setError(form, 'name', 'Non autorisé');
                console.log('Return error');
                return { form };
            }

            const userId = user.id;
            const form = await superValidate(request, zod(formSchema));

            if (!form.valid) {
                const cleanForm = await superValidate(zod(formSchema));
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
                    const cleanForm = await superValidate(zod(formSchema));
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
                    const cleanForm = await superValidate(zod(formSchema));
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
                p_bio: bio || null,
                p_slug: slug,
                p_logo_url: logoUrl,
                p_instagram: instagram || null,
                p_tiktok: tiktok || null,
                p_website: website || null
            });

            if (createError) {
                console.error('Error creating shop:', createError);
                const cleanForm = await superValidate(zod(formSchema));

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
            const cleanForm = await superValidate(zod(formSchema));
            cleanForm.message = 'Boutique créée avec succès !';
            return { form: cleanForm, success: true, shop };

        } catch (error) {
            // Gestion globale des erreurs inattendues
            console.error(error);
            const form = await superValidate(zod(formSchema));
            setError(form, 'name', 'Une erreur inattendue est survenue. Veuillez réessayer.');
            return { form };
        }
    },

    connectPayPal: async ({ request, locals, cookies }) => {
        try {
            const { session } = await locals.safeGetSession();

            if (!session) {
                // Create a clean form for Superforms compatibility
                const cleanForm = await superValidate(zod(formSchema));
                setError(cleanForm, 'name', 'Non autorisé');
                return { form: cleanForm };
            }

            const userId = session.user.id;

            console.log('Connect PayPal');
            // Generate unique tracking ID
            const trackingId = `pattyly_${userId}_${Date.now()}`;

            // Create PayPal Partner Referral
            console.log('Create PayPal Partner Referral');
            const referralResponse = await paypalClient.createPartnerReferral(
                trackingId,
                `${PUBLIC_SITE_URL}/onboarding?paypal_onboarding=pending`
            );

            // Find the onboarding URL
            const onboardingLink = referralResponse.links.find(link => link.rel === 'action_url');
            if (!onboardingLink) {
                throw new Error('No onboarding URL found in PayPal response');
            }

            // ✅ UPSERT : Créer ou mettre à jour avec toutes les infos immédiatement
            const { error: upsertError } = await (locals.supabase as any)
                .from('paypal_accounts')
                .upsert({
                    profile_id: userId,
                    tracking_id: trackingId,
                    onboarding_url: onboardingLink.href,
                    onboarding_status: 'in_progress',
                    is_active: false
                }, {
                    onConflict: 'profile_id'
                });

            if (upsertError) {
                console.error('Failed to save PayPal account:', upsertError);
                const cleanForm = await superValidate(zod(formSchema));
                setError(cleanForm, 'name', 'Erreur lors de la sauvegarde du compte PayPal');
                return { form: cleanForm };
            }

            console.log('✅ [Onboarding] PayPal account saved successfully');

            // L'essai gratuit sera créé automatiquement après validation PayPal (via polling ou webhook)

            const cleanForm = await superValidate(zod(formSchema));
            cleanForm.message = 'Connexion PayPal réussie !';
            console.log('Return success');
            return {
                form: cleanForm,
                success: true,
                url: onboardingLink?.href || ''
            };

        } catch (err) {
            // Create a clean form for Superforms compatibility
            const cleanForm = await superValidate(zod(formSchema));
            setError(cleanForm, 'name', 'Erreur lors de la connexion PayPal');
            console.log('PayPal connection error:', err);
            return { form: cleanForm };
        }
    }
};
