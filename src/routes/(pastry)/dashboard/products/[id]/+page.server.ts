import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getShopId } from '$lib/permissions';
import { deleteImageIfUnused } from '$lib/storage-utils';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
    const { userId } = await parent();
    const productId = params.id;

    if (!productId) {
        throw error(404, 'Produit non trouvé');
    }

    // Get shop_id for this user
    const shopId = await getShopId(userId, locals.supabase);

    if (!shopId) {
        throw error(500, 'Erreur lors du chargement de la boutique');
    }

    // Récupérer le produit avec sa catégorie
    const { data: product, error: productError } = await locals.supabase
        .from('products')
        .select(`*,categories(name)`)
        .eq('id', productId)
        .eq('shop_id', shopId)
        .single();

    if (productError || !product) {
        throw error(404, 'Produit non trouvé');
    }

    // Récupérer les catégories disponibles
    const { data: categories, error: categoriesError } = await locals.supabase
        .from('categories')
        .select('id, name')
        .eq('shop_id', shopId)
        .order('name');

    if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
    }

    // Récupérer le formulaire de personnalisation s'il existe
    let customizationFields: any[] = [];
    if (product.form_id) {
        const { data: formFields, error: formFieldsError } = await locals.supabase
            .from('form_fields')
            .select('*')
            .eq('form_id', product.form_id)
            .order('order');

        if (formFieldsError) {
            console.error('Error fetching form fields:', formFieldsError);
        } else {
            customizationFields = formFields || [];
        }
    }

    return {
        product,
        categories: categories || [],
        customizationFields
    };
};

export const actions: Actions = {
    updateProduct: async ({ request, locals, params }) => {
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // Get shop_id for this user
        const shopId = await getShopId(userId, locals.supabase);

        if (!shopId) {
            return fail(500, { error: 'Boutique non trouvée' });
        }

        const productId = params.id;

        if (!productId) {
            return fail(404, {
                error: 'Produit non trouvé'
            });
        }

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const base_price = parseFloat(formData.get('price') as string);
        const category_id = formData.get('category_id') as string;
        const min_days_notice = parseInt(formData.get('min_days_notice') as string) || 0;
        const imageFile = formData.get('image') as File;
        const customizationFieldsJson = formData.get('customizationFields') as string;

        // Validation basique
        if (!name || !base_price || base_price <= 0) {
            return fail(400, {
                error: 'Veuillez remplir tous les champs obligatoires'
            });
        }

        try {
            // Récupérer l'ancienne image pour la supprimer si nécessaire
            const { data: currentProduct } = await locals.supabase
                .from('products')
                .select('image_url')
                .eq('id', productId)
                .eq('shop_id', shopId)
                .single();

            // Handle image upload if provided
            let imageUrl = null;
            if (imageFile && imageFile.size > 0) {
                // Check file type
                if (!imageFile.type.startsWith('image/')) {
                    return fail(400, { error: 'L\'image doit être une image valide' });
                }

                // Check file size (max 2MB)
                if (imageFile.size > 2 * 1024 * 1024) {
                    return fail(400, { error: 'L\'image ne doit pas dépasser 2MB' });
                }

                try {
                    // Upload to Supabase Storage
                    const fileName = `${shopId}/${Date.now()}-${imageFile.name}`;
                    const { error: uploadError } = await locals.supabase.storage
                        .from('product-images')
                        .upload(fileName, imageFile, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) {
                        console.error('Error uploading image:', uploadError);
                        return fail(500, { error: 'Erreur lors de l\'upload de l\'image' });
                    }

                    // Get public URL
                    const { data: urlData } = locals.supabase.storage
                        .from('product-images')
                        .getPublicUrl(fileName);

                    imageUrl = urlData.publicUrl;
                } catch (err) {
                    console.error('Error processing image upload:', err);
                    return fail(500, { error: 'Erreur lors du traitement de l\'image' });
                }
            }

            // Mettre à jour le produit
            const updateData: any = {
                name,
                description,
                base_price,
                category_id: category_id || null,
                min_days_notice
            };

            // Ajouter l'image URL seulement si une nouvelle image a été uploadée
            if (imageUrl) {
                updateData.image_url = imageUrl;
            }

            const { data: updatedProduct, error: updateError } = await locals.supabase
                .from('products')
                .update(updateData)
                .eq('id', productId)
                .eq('shop_id', shopId)
                .select()
                .single();

            if (updateError) {
                console.error('Error updating product:', updateError);
                return fail(500, {
                    error: 'Erreur lors de la modification du produit'
                });
            }

            // Supprimer l'ancienne image si elle n'est plus utilisée par d'autres produits
            if (imageUrl && currentProduct?.image_url && currentProduct.image_url !== imageUrl) {
                await deleteImageIfUnused(locals.supabase, currentProduct.image_url, productId);
            }

            // Mettre à jour les champs de personnalisation si fournis
            if (customizationFieldsJson) {
                try {
                    const customizationFields = JSON.parse(customizationFieldsJson);

                    if (updatedProduct.form_id) {
                        // Supprimer les anciens champs
                        await locals.supabase
                            .from('form_fields')
                            .delete()
                            .eq('form_id', updatedProduct.form_id);

                        // Ajouter les nouveaux champs
                        if (customizationFields.length > 0) {
                            const formFields = customizationFields.map((field: any, index: number) => ({
                                form_id: updatedProduct.form_id,
                                label: field.label,
                                type: field.type,
                                options: field.options && field.options.length > 0 ? field.options : null,
                                required: field.required,
                                order: index + 1
                            }));

                            const { error: fieldsError } = await locals.supabase
                                .from('form_fields')
                                .insert(formFields);

                            if (fieldsError) {
                                console.error('Error updating form fields:', fieldsError);
                                return fail(500, {
                                    error: 'Erreur lors de la mise à jour des champs de personnalisation'
                                });
                            }
                        }
                    } else if (customizationFields.length > 0) {
                        // Créer un nouveau formulaire si le produit n'en avait pas
                        const { data: newForm, error: formError } = await locals.supabase
                            .from('forms')
                            .insert({
                                shop_id: shopId,
                                is_custom_form: false
                            })
                            .select()
                            .single();

                        if (formError) {
                            console.error('Error creating form:', formError);
                            return fail(500, {
                                error: 'Erreur lors de la création du formulaire'
                            });
                        }

                        // Ajouter les champs
                        const formFields = customizationFields.map((field: any, index: number) => ({
                            form_id: newForm.id,
                            label: field.label,
                            type: field.type,
                            options: field.options && field.options.length > 0 ? field.options : null,
                            required: field.required,
                            order: index + 1
                        }));

                        const { error: fieldsError } = await locals.supabase
                            .from('form_fields')
                            .insert(formFields);

                        if (fieldsError) {
                            console.error('Error creating form fields:', fieldsError);
                            return fail(500, {
                                error: 'Erreur lors de la création des champs de personnalisation'
                            });
                        }

                        // Associer le formulaire au produit
                        await locals.supabase
                            .from('products')
                            .update({ form_id: newForm.id })
                            .eq('id', productId);
                    }
                } catch (parseError) {
                    console.error('Error parsing customization fields:', parseError);
                    return fail(400, {
                        error: 'Erreur lors du traitement des champs de personnalisation'
                    });
                }
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            return fail(500, {
                error: 'Erreur inattendue lors de la modification du produit'
            });
        }

        // Retourner un succès pour déclencher la redirection côté client
        return { success: true, message: 'Produit modifié avec succès' };
    }
}; 