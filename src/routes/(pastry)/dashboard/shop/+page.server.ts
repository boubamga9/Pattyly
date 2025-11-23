import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { customizationSchema } from './customization-schema';
import { directorySchema } from '$lib/validations/schemas/shop';
import { uploadShopLogo, uploadBackgroundImage, deleteImage, extractPublicIdFromUrl } from '$lib/cloudinary';
import { forceRevalidateShop } from '$lib/utils/catalog';

export const load: PageServerLoad = async ({ locals, parent }) => {
    // ✅ OPTIMISÉ : Réutiliser les permissions et shop du layout
    const { permissions, shop: layoutShop, user } = await parent();

    if (!user) {
        throw redirect(302, '/login');
    }

    // Récupérer l'ID de la boutique
    if (!permissions.shopId) {
        throw error(400, 'Boutique non trouvée');
    }

    // Get shop data (including directory fields) - on récupère seulement les champs supplémentaires
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('id, name, bio, slug, logo_url, instagram, tiktok, website, directory_city, directory_actual_city, directory_postal_code, directory_cake_types, directory_enabled')
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
        }),
        directoryForm: await superValidate(zod(directorySchema), {
            defaults: {
                directory_city: shop.directory_city || '',
                directory_actual_city: shop.directory_actual_city || '',
                directory_postal_code: shop.directory_postal_code || '',
                directory_cake_types: shop.directory_cake_types || [],
                directory_enabled: shop.directory_enabled || false
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

        // ✅ OPTIMISÉ : Utiliser parent() pour récupérer shopId, puis vérifier la propriété
        // Note: On récupère quand même logo_url et slug car nécessaires pour la logique
        const { permissions } = await parent();
        const shopId = permissions?.shopId;

        if (!shopId) {
            return { success: false, error: 'Boutique non trouvée' };
        }

        // Vérifier la propriété avec le RPC optimisé
        const { data: isOwner, error: verifyError } = await (locals.supabase as any).rpc('verify_shop_ownership', {
            p_profile_id: userId,
            p_shop_id: shopId
        });

        if (verifyError || !isOwner) {
            return { success: false, error: 'Boutique non trouvée ou non autorisée' };
        }

        // Récupérer seulement les champs nécessaires
        const { data: shop } = await locals.supabase
            .from('shops')
            .select('id, logo_url, slug')
            .eq('id', shopId)
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
            // Validation basique : taille max 5MB
            if (logoFile.size > 5 * 1024 * 1024) {
                return { success: false, error: 'Le logo ne doit pas dépasser 5MB' };
            }

            // Vérifier que c'est bien une image
            if (!logoFile.type.startsWith('image/')) {
                return { success: false, error: 'Le fichier doit être une image' };
            }

            try {
                // Upload vers Cloudinary (compression et optimisation automatiques)
                const uploadResult = await uploadShopLogo(logoFile, shop.id);
                logoUrl = uploadResult.secure_url;

                // Supprimer l'ancien logo Cloudinary si il existe
                if (currentLogoUrl) {
                    const oldPublicId = extractPublicIdFromUrl(currentLogoUrl);
                    if (oldPublicId) {
                        await deleteImage(oldPublicId);
                    }
                }
            } catch (err) {
                console.error('❌ [Shop Update] Erreur Cloudinary logo:', err);
                return { success: false, error: 'Erreur lors de l\'upload du logo' };
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
            // Validation basique : taille max 5MB
            if (background_image.size > 5 * 1024 * 1024) {
                form.message = 'L\'image de fond ne doit pas dépasser 5MB';
                return { form };
            }

            // Vérifier que c'est bien une image
            if (!background_image.type.startsWith('image/')) {
                form.message = 'Le fichier doit être une image';
                return { form };
            }

            try {
                // Upload vers Cloudinary (compression et optimisation automatiques)
                const uploadResult = await uploadBackgroundImage(background_image, shop.id);
                finalBackgroundImageUrl = uploadResult.secure_url;

                // Supprimer l'ancienne image de fond Cloudinary si elle existe
                if (background_image_url) {
                    const oldPublicId = extractPublicIdFromUrl(background_image_url);
                    if (oldPublicId) {
                        await deleteImage(oldPublicId);
                    }
                }

                console.log('🎨 [Dashboard Shop] Background image uploaded:', finalBackgroundImageUrl);
            } catch (err) {
                console.error('🎨 [Dashboard Shop] Background image processing error:', err);
                form.message = 'Erreur lors de l\'upload de l\'image de fond';
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
                // Supprimer l'image Cloudinary
                const publicId = extractPublicIdFromUrl(customizations.background_image_url);
                if (publicId) {
                    await deleteImage(publicId);
                    console.log('🎨 [Dashboard Shop] Background image deleted from Cloudinary');
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
    },

    updateDirectory: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return { form: await superValidate(zod(directorySchema)) };
        }

        const userId = session.user.id;
        const form = await superValidate(request, zod(directorySchema));

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

        // Mettre à jour les champs annuaire
        const { error: updateError } = await locals.supabase
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
            console.error('📋 [Directory] Update error:', updateError);
            form.message = 'Erreur lors de la mise à jour des informations annuaire';
            return { form };
        }

        // Revalidate shop cache
        try {
            await forceRevalidateShop(shop.slug);
        } catch (error) {
            console.error('📋 [Directory] Cache revalidation failed:', error);
        }

        // Retourner le formulaire mis à jour
        const updatedForm = await superValidate(zod(directorySchema), {
            defaults: {
                directory_city: form.data.directory_city,
                directory_actual_city: form.data.directory_actual_city,
                directory_postal_code: form.data.directory_postal_code,
                directory_cake_types: form.data.directory_cake_types,
                directory_enabled: form.data.directory_enabled
            }
        });

        updatedForm.message = 'Informations annuaire sauvegardées avec succès !';
        return { form: updatedForm };
    }
};

