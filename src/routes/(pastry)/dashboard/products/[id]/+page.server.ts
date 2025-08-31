import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getShopId } from '$lib/auth';
import { deleteImageIfUnused } from '$lib/storage';
import { validateImageServer, validateAndRecompressImage, logValidationInfo } from '$lib/utils/images/server';
import { incrementCatalogVersion } from '$lib/utils/catalog';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { updateProductFormSchema, createCategoryFormSchema } from './schema.js';

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
            // Normaliser les champs pour s'assurer qu'ils ont la bonne structure
            customizationFields = (formFields || []).map(field => {
                const normalizedField: any = {
                    id: field.id,
                    label: field.label,
                    type: field.type,
                    required: field.required,
                    order: field.order
                };

                // Pour les champs de sélection, s'assurer qu'ils ont des options
                if (field.type === 'single-select' || field.type === 'multi-select') {
                    normalizedField.options = (field as any).options || [
                        { label: '', price: 0 },
                        { label: '', price: 0 }
                    ];
                } else {
                    // Pour les champs texte/nombre, s'assurer qu'ils ont options: []
                    normalizedField.options = [];
                }

                return normalizedField;
            });
        }
    }

    // Initialiser Superforms pour l'édition
    const updateProductForm = await superValidate(
        zod(updateProductFormSchema),
        {
            defaults: {
                name: product.name,
                description: product.description || '',
                base_price: product.base_price,
                category_id: product.category_id || '',
                min_days_notice: product.min_days_notice,
                customizationFields: customizationFields
            }
        }
    );

    // Initialiser Superforms pour les catégories
    const createCategoryForm = await superValidate(zod(createCategoryFormSchema));

    return {
        product,
        categories: categories || [],
        customizationFields,
        updateProductForm,
        createCategoryForm
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

        // Valider avec Superforms
        const form = await superValidate(formData, zod(updateProductFormSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        // Extraire les données validées
        const { name, description, base_price, category_id, min_days_notice, customizationFields } = form.data;
        const imageFile = formData.get('image') as File;

        // Vérifier s'il y a une nouvelle catégorie à créer
        const newCategoryName = formData.get('newCategoryName') as string;
        let finalCategoryId = category_id;

        // Créer la nouvelle catégorie si nécessaire
        if (newCategoryName && newCategoryName.trim()) {
            try {
                const { data: newCategory, error: categoryError } = await locals.supabase
                    .from('categories')
                    .insert({
                        name: newCategoryName.trim(),
                        shop_id: shopId
                    })
                    .select()
                    .single();

                if (categoryError) {
                    console.error('Error creating category:', categoryError);
                    return fail(500, { form, error: 'Erreur lors de la création de la catégorie' });
                }

                finalCategoryId = newCategory.id;
            } catch (err) {
                console.error('Error creating category:', err);
                return fail(500, { form, error: 'Erreur lors de la création de la catégorie' });
            }
        }

        // Gérer le cas de la catégorie temporaire
        if (finalCategoryId === 'temp-new-category') {
            if (!newCategoryName || !newCategoryName.trim()) {
                return fail(400, { form, error: 'Nom de catégorie requis pour la nouvelle catégorie' });
            }
            // La catégorie a déjà été créée ci-dessus
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
            let oldImageUrl = null; // Stocker l'ancienne image pour suppression

            if (imageFile && imageFile.size > 0) {
                // Stocker l'ancienne image avant de la remplacer
                oldImageUrl = currentProduct?.image_url || null;
                // 🔍 Validation serveur stricte + re-compression automatique si nécessaire
                const validationResult = await validateAndRecompressImage(imageFile, 'PRODUCT');

                // Log de validation pour le debugging
                logValidationInfo(imageFile, 'PRODUCT', validationResult);

                if (!validationResult.isValid) {
                    return fail(400, { error: validationResult.error || 'Validation de l\'image échouée' });
                }

                try {
                    // 🔄 Utiliser l'image re-compressée si disponible
                    const imageToUpload = validationResult.compressedFile || imageFile;

                    // Upload to Supabase Storage
                    const fileName = `${shopId}/${Date.now()}-${imageToUpload.name}`;
                    const { error: uploadError } = await locals.supabase.storage
                        .from('product-images')
                        .upload(fileName, imageToUpload, {
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
                category_id: finalCategoryId || null,
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
            if (oldImageUrl && oldImageUrl !== imageUrl) {
                await deleteImageIfUnused(locals.supabase, oldImageUrl, productId);
            }

            // Mettre à jour les champs de personnalisation si fournis
            if (customizationFields !== undefined) { // Vérifier si le champ est présent (même vide)
                try {
                    console.log('🔄 Updating customization fields:', customizationFields);

                    if (updatedProduct.form_id) {
                        // Récupérer les champs existants pour comparer
                        const { data: existingFields, error: fetchError } = await locals.supabase
                            .from('form_fields')
                            .select('id, label, type, options, required, order')
                            .eq('form_id', updatedProduct.form_id)
                            .order('order');

                        if (fetchError) {
                            console.error('Error fetching existing fields:', fetchError);
                            return fail(500, {
                                error: 'Erreur lors de la récupération des champs existants'
                            });
                        }

                        console.log('📋 Existing fields:', existingFields);
                        console.log('🆕 New fields:', customizationFields);

                        // Identifier les champs à supprimer (ceux qui existent mais ne sont plus dans la nouvelle liste)
                        const fieldsToDelete = existingFields.filter(existingField =>
                            !customizationFields.some(newField => newField.id === existingField.id)
                        );

                        // Identifier les champs à mettre à jour ou ajouter
                        const fieldsToUpsert = customizationFields.map((field: any, index: number) => ({
                            id: field.id || undefined, // Garder l'ID si il existe
                            form_id: updatedProduct.form_id!,
                            label: field.label,
                            type: field.type,
                            options: field.options && field.options.length > 0 ? field.options : null,
                            required: field.required,
                            order: index + 1
                        }));

                        console.log('🗑️ Fields to delete:', fieldsToDelete);
                        console.log('💾 Fields to upsert:', fieldsToUpsert);

                        // Supprimer les champs supprimés
                        if (fieldsToDelete.length > 0) {
                            const { error: deleteError } = await locals.supabase
                                .from('form_fields')
                                .delete()
                                .in('id', fieldsToDelete.map(f => f.id));

                            if (deleteError) {
                                console.error('Error deleting fields:', deleteError);
                                return fail(500, {
                                    error: 'Erreur lors de la suppression des champs'
                                });
                            }
                        }

                        // Mettre à jour ou ajouter les champs
                        if (fieldsToUpsert.length > 0) {
                            const { error: upsertError } = await locals.supabase
                                .from('form_fields')
                                .upsert(fieldsToUpsert, {
                                    onConflict: 'id',
                                    ignoreDuplicates: false
                                });

                            if (upsertError) {
                                console.error('Error upserting fields:', upsertError);
                                return fail(500, {
                                    error: 'Erreur lors de la mise à jour des champs de personnalisation'
                                });
                            }
                        } else {
                            // Tous les champs ont été supprimés, supprimer tous les champs existants
                            console.log('🗑️ All fields removed, deleting all existing fields');
                            if (existingFields.length > 0) {
                                const { error: deleteAllError } = await locals.supabase
                                    .from('form_fields')
                                    .delete()
                                    .eq('form_id', updatedProduct.form_id);

                                if (deleteAllError) {
                                    console.error('Error deleting all fields:', deleteAllError);
                                    return fail(500, {
                                        error: 'Erreur lors de la suppression de tous les champs'
                                    });
                                }
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

        // Increment catalog version to invalidate public cache
        try {
            await incrementCatalogVersion(locals.supabase, shopId);
        } catch (error) {
            console.error('Warning: Failed to increment catalog version:', error);
            // Don't fail the entire operation, just log the warning
        }

        // Retourner un succès avec le formulaire Superforms
        form.message = 'Produit modifié avec succès';
        return { form };
    },

    createCategory: async ({ request, locals }) => {
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

        const formData = await request.formData();

        // Valider avec Superforms
        const form = await superValidate(formData, zod(createCategoryFormSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        // Extraire les données validées
        const { name: categoryName } = form.data;
        const trimmedName = categoryName.trim();

        try {
            const { data: newCategory, error: categoryError } = await locals.supabase
                .from('categories')
                .insert({
                    name: trimmedName,
                    shop_id: shopId
                })
                .select()
                .single();

            if (categoryError) {
                console.error('Error creating category:', categoryError);
                return fail(500, { form, error: 'Erreur lors de la création de la catégorie' });
            }

            // Retourner le succès avec le formulaire et la nouvelle catégorie
            form.message = 'Catégorie créée avec succès';
            return { form, category: newCategory };
        } catch (err) {
            console.error('Error creating category:', err);
            return fail(500, { form, error: 'Erreur lors de la création de la catégorie' });
        }
    }
}; 