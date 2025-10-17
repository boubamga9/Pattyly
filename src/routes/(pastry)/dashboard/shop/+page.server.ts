import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import Stripe from 'stripe';
import { getUserPermissions } from '$lib/auth';

import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { customizationSchema } from './customization-schema';
import { validateImageServer, validateAndRecompressImage, logValidationInfo } from '$lib/utils/images/server';
import { sanitizeFileName } from '$lib/utils/filename-sanitizer';
import { forceRevalidateShop } from '$lib/utils/catalog';



export const load: PageServerLoad = async ({ locals }) => {
    // Récupérer l'utilisateur connecté
    const {
        data: { user },
    } = await locals.supabase.auth.getUser();

    if (!user) {
        throw redirect(302, '/login');
    }

    // Vérifier les permissions
    const permissions = await getUserPermissions(user.id, locals.supabase);


    // Récupérer l'ID de la boutique
    if (!permissions.shopId) {
        throw error(400, 'Boutique non trouvée');
    }

    // Get shop data
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('id, name, bio, slug, logo_url, instagram, tiktok, website')
        .eq('id', permissions.shopId)
        .single();

    if (shopError) {
        error(500, 'Erreur lors du chargement de la boutique');
    }

    if (!shop) {
        error(404, 'Boutique non trouvée');
    }

    // Get shop customizations
    const { data: customizations, error: customizationsError } = await (locals.supabase as any)
        .from('shop_customizations')
        .select('button_color, button_text_color, text_color, icon_color, secondary_text_color, background_color, background_image_url')
        .eq('shop_id', permissions.shopId)
        .single();

    if (customizationsError && customizationsError.code !== 'PGRST116') {
        console.error('🎨 [Dashboard Shop] Customizations error:', customizationsError);
        error(500, 'Erreur lors du chargement des personnalisations');
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
        }),
        customizationForm: await superValidate(zod(customizationSchema), {
            defaults: {
                button_color: customizations?.button_color || '#ff6f61',
                button_text_color: customizations?.button_text_color || '#ffffff',
                text_color: customizations?.text_color || '#333333',
                icon_color: customizations?.icon_color || '#6b7280',
                secondary_text_color: customizations?.secondary_text_color || '#333333',
                background_color: customizations?.background_color || '#ffe8d6',
                background_image_url: customizations?.background_image_url || '',
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
            .select('id, logo_url, slug')
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
                const sanitizedFileName = sanitizeFileName(imageToUpload.name);
                const fileName = `${userId}/${Date.now()}-${sanitizedFileName}`;
                const { error: uploadError } = await locals.supabase.storage
                    .from('shop-logos')
                    .upload(fileName, imageToUpload, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    return { success: false, error: 'Erreur lors de l\'upload du logo' };
                }

                // Get public URL
                const { data: urlData } = locals.supabase.storage
                    .from('shop-logos')
                    .getPublicUrl(fileName);

                logoUrl = urlData.publicUrl;
            } catch (err) {
                return { success: false, error: 'Erreur lors du traitement du logo' };
            }
        }

        // Store old slug for cache invalidation
        const oldSlug = shop.slug;
        const slugChanged = oldSlug !== slug;

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
            return { success: false, error: 'Erreur lors de la mise à jour' };
        }

        // Invalidate cache for both old and new slugs if slug changed
        if (slugChanged) {
            try {
                // Revalidate new slug
                await forceRevalidateShop(slug);
                // Also revalidate old slug to return 404
                await forceRevalidateShop(oldSlug);
                console.log(`🔄 Revalidated both slugs: ${oldSlug} -> ${slug}`);
            } catch (error) {
                console.error('Cache revalidation failed:', error);
                // Don't fail the entire operation, just log the warning
            }
        } else {
            // If slug didn't change, just revalidate current slug
            try {
                await forceRevalidateShop(slug);
            } catch (error) {
                console.error('Cache revalidation failed:', error);
            }
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
    },

    updateCustomizationForm: async ({ request, locals }) => {

        const { session } = await locals.safeGetSession();
        if (!session) {
            return { form: await superValidate(zod(customizationSchema)) };
        }

        const userId = session.user.id;
        const form = await superValidate(request, zod(customizationSchema));


        if (!form.valid) {
            return { form };
        }

        const { data: shop } = await locals.supabase
            .from('shops')
            .select('id, slug')
            .eq('profile_id', userId)
            .single();

        if (!shop) {
            form.message = 'Boutique non trouvée';
            return { form };
        }

        // Handle background image upload
        const { background_image, background_image_url } = form.data;
        let finalBackgroundImageUrl = background_image_url;

        if (background_image && background_image.size > 0) {
            try {
                // Upload to Supabase Storage
                const sanitizedFileName = sanitizeFileName(background_image.name);
                const fileName = `${userId}/${Date.now()}-${sanitizedFileName}`;
                const { error: uploadError } = await locals.supabase.storage
                    .from('shop_backgrounds')
                    .upload(fileName, background_image, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('🎨 [Dashboard Shop] Background upload error:', uploadError);
                    form.message = 'Erreur lors de l\'upload de l\'image de fond';
                    return { form };
                }

                // Get public URL
                const { data: urlData } = locals.supabase.storage
                    .from('shop_backgrounds')
                    .getPublicUrl(fileName);

                finalBackgroundImageUrl = urlData.publicUrl;
                console.log('🎨 [Dashboard Shop] Background image uploaded:', finalBackgroundImageUrl);
            } catch (err) {
                console.error('🎨 [Dashboard Shop] Background image processing error:', err);
                form.message = 'Erreur lors du traitement de l\'image de fond';
                return { form };
            }
        }

        const { error: updateError } = await locals.supabase
            .from('shop_customizations')
            .update({
                button_color: form.data.button_color,
                button_text_color: form.data.button_text_color,
                text_color: form.data.text_color,
                icon_color: form.data.icon_color,
                secondary_text_color: form.data.secondary_text_color,
                background_color: form.data.background_color,
                background_image_url: finalBackgroundImageUrl
            })
            .eq('shop_id', shop.id);

        if (updateError) {
            console.error('🎨 [Dashboard Shop] Upsert error:', updateError);
            form.message = 'Erreur lors de la mise à jour des personnalisations';
            return { form };
        }

        // ✅ Succès
        const updatedForm = await superValidate(zod(customizationSchema), {
            defaults: {
                button_color: form.data.button_color,
                button_text_color: form.data.button_text_color,
                text_color: form.data.text_color,
                icon_color: form.data.icon_color,
                secondary_text_color: form.data.secondary_text_color,
                background_color: form.data.background_color,
                background_image_url: finalBackgroundImageUrl
                // Note: background_image (File) n'est pas inclus car non sérialisable
            }
        });

        // Revalidate shop cache to update the slug page
        try {
            await forceRevalidateShop(shop.slug);
        } catch (error) {
            console.error('🎨 [Customization] Cache revalidation failed:', error);
        }

        updatedForm.message = 'Personnalisation sauvegardée avec succès !';
        return { form: updatedForm };
    },

    removeBackgroundImage: async ({ locals }) => {

        const { session } = await locals.safeGetSession();
        if (!session) {

            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;

        // Récupérer la boutique et l'URL actuelle de l'image
        const { data: shop } = await locals.supabase
            .from('shops')
            .select('id, slug')
            .eq('profile_id', userId)
            .single();

        if (!shop) {
            return { success: false, error: 'Boutique non trouvée' };
        }

        // Récupérer l'URL actuelle de l'image de fond
        const { data: customizations } = await locals.supabase
            .from('shop_customizations')
            .select('background_image_url')
            .eq('shop_id', shop.id)
            .single();

        if (customizations?.background_image_url) {
            try {
                // Supprimer le fichier du storage
                const fileName = customizations.background_image_url.split('/').pop();
                if (fileName) {
                    const { error: deleteError } = await locals.supabase.storage
                        .from('shop_backgrounds')
                        .remove([`${userId}/${fileName}`]);

                    if (deleteError) {
                        console.error('🎨 [Dashboard Shop] Error deleting background image:', deleteError);
                    } else {
                        console.log('🎨 [Dashboard Shop] Background image deleted from storage');
                    }
                }
            } catch (error) {
                console.error('🎨 [Dashboard Shop] Error processing background image deletion:', error);
            }
        }

        // Mettre à jour la base de données pour supprimer l'URL
        const { error: updateError } = await locals.supabase
            .from('shop_customizations')
            .update({
                background_image_url: null,
                updated_at: new Date().toISOString()
            })
            .eq('shop_id', shop.id);

        if (updateError) {
            console.error('🎨 [Dashboard Shop] Error updating customizations:', updateError);
            return { success: false, error: 'Erreur lors de la suppression' };
        }

        // Revalidate shop cache
        try {
            await forceRevalidateShop(shop.slug);
        } catch (error) {
            console.error('🎨 [Customization] Cache revalidation failed:', error);
        }

        return { success: true };
    }

};
