import { error, redirect } from '@sveltejs/kit';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import type { PageServerLoad, Actions } from './$types';
import Stripe from 'stripe';

import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { validateImageServer, validateAndRecompressImage, logValidationInfo } from '$lib/utils/server-image-validation';



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


    return {
        shop,
        form: await superValidate(zod(formSchema), {
            defaults: {
                name: shop.name,
                bio: shop.bio || '',
                slug: shop.slug,
                logo_url: shop.logo_url || '',
                instagram: shop.instagram || '',
                tiktok: shop.tiktok || '',
                website: shop.website || ''
            }
        })
    };
};

export const actions: Actions = {
    updateShop: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return { success: false, error: 'Non autorisé' };
        }
        console.log("🚀 Action updateShop appelée !");
        const userId = session.user.id;

        const form = await superValidate(request, zod(formSchema));

        if (!form.valid) {
            return form;
        }

        const { name, bio, slug, instagram, tiktok, website, logo } = form.data;
        const logoFile = logo;
        const currentLogoUrl = form.data.logo_url;

        // Get shop data including logo_url
        const { data: shop } = await locals.supabase
            .from('shops')
            .select('id, logo_url')
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
            // 🔍 Validation serveur stricte + re-compression automatique si nécessaire
            const validationResult = await validateAndRecompressImage(logoFile, 'LOGO');

            // Log de validation pour le debugging
            logValidationInfo(logoFile, 'LOGO', validationResult);

            if (!validationResult.isValid) {
                return { success: false, error: validationResult.error || 'Validation du logo échouée' };
            }

            try {
                // 🔄 Utiliser l'image re-compressée si disponible
                const imageToUpload = validationResult.compressedFile || logoFile;

                // Upload to Supabase Storage
                const fileName = `${userId}/${Date.now()}-${imageToUpload.name}`;
                const { error: uploadError } = await locals.supabase.storage
                    .from('shop-logos')
                    .upload(fileName, imageToUpload, {
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


        // Return form data for Superforms compatibility with updated data
        const updatedForm = await superValidate(zod(formSchema), {
            defaults: {
                name,
                bio: bio || '',
                slug,
                logo_url: logoUrl || '',
                instagram: instagram || '',
                tiktok: tiktok || '',
                website: website || ''
            }
        });
        updatedForm.message = 'Boutique mise à jour avec succès !';
        return { form: updatedForm };
    }
};
