import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { verifyShopOwnership } from '$lib/auth';
import { uploadProductImage, deleteImage, extractPublicIdFromUrl } from '$lib/cloudinary';
import { forceRevalidateShop } from '$lib/utils/catalog';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { updateProductFormSchema, createCategoryFormSchema } from './schema.js';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
    // ✅ OPTIMISÉ : Utiliser shopId et shop du parent (déjà chargé)
    const { permissions, shop } = await parent();
    const productId = params.id;

    if (!productId) {
        throw error(404, 'Produit non trouvé');
    }

    if (!permissions.shopId || !shop) {
        throw error(500, 'Erreur lors du chargement de la boutique');
    }

    const shopId = permissions.shopId;

    // ✅ OPTIMISÉ : 1 requête pour récupérer le produit avec sa catégorie
    const { data: product, error: productError } = await locals.supabase
        .from('products')
        .select(`*,categories(name)`)
        .eq('id', productId)
        .eq('shop_id', shopId)
        .single();

    if (productError || !product) {
        throw error(404, 'Produit non trouvé');
    }

    // ✅ OPTIMISÉ : Récupérer catégories et form_fields en parallèle (2 requêtes simultanées)
    const [categoriesResult, formFieldsResult] = await Promise.all([
        // Récupérer les catégories disponibles (nécessaire pour le dropdown)
        locals.supabase
            .from('categories')
            .select('id, name')
            .eq('shop_id', shopId)
            .order('name'),
        // Récupérer le formulaire de personnalisation s'il existe
        product.form_id
            ? locals.supabase
                .from('form_fields')
                .select('*')
                .eq('form_id', product.form_id)
                .order('order')
            : Promise.resolve({ data: null, error: null })
    ]);

    const categories = categoriesResult.data || [];
    if (categoriesResult.error) {
        console.error('Error fetching categories:', categoriesResult.error);
    }

    // Extraire et normaliser les form_fields
    let customizationFields: any[] = [];
    if (formFieldsResult.data && Array.isArray(formFieldsResult.data)) {
        // Normaliser les champs pour s'assurer qu'ils ont la bonne structure
        customizationFields = formFieldsResult.data.map(field => {
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
                cake_type: product.cake_type || null,
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
        createCategoryForm,
        shopId: permissions.shopId,
        shopSlug: permissions.shopSlug || shop.slug
    };
};

export const actions: Actions = {
    updateProduct: async ({ request, locals, params }) => {
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;
        const shopSlug = formData.get('shopSlug') as string;

        if (!shopId || !shopSlug) {
            return fail(400, { error: 'Données de boutique manquantes' });
        }

        // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite getShopIdAndSlug + requête shop)
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            return fail(403, { error: 'Accès non autorisé à cette boutique' });
        }

        const productId = params.id;

        if (!productId) {
            return fail(404, {
                error: 'Produit non trouvé'
            });
        }

        // Valider avec Superforms
        const form = await superValidate(formData, zod(updateProductFormSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        // Extraire les données validées
        const { name, description, base_price, category_id, min_days_notice, cake_type, customizationFields } = form.data;
        const imageFile = formData.get('image') as File;

        // Vérifier s'il y a une nouvelle catégorie à créer
        const newCategoryName = formData.get('newCategoryName') as string;
        let finalCategoryId = category_id;

        // ✅ OPTIMISÉ : Créer la nouvelle catégorie avec ON CONFLICT (évite la vérification préalable)
        if (newCategoryName && newCategoryName.trim()) {
            try {
                const { data: newCategory, error: categoryError } = await locals.supabase
                    .from('categories')
                    .insert({
                        name: newCategoryName.trim(),
                        shop_id: shopId
                    })
                    .select()
                    .single()
                    .onConflict('name,shop_id')
                    .merge(); // Si existe déjà, on récupère l'existant

                if (categoryError) {
                    return fail(500, { form, error: 'Erreur lors de la création de la catégorie' });
                }

                finalCategoryId = newCategory.id;
            } catch (err) {
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
            // ✅ OPTIMISÉ : Récupérer le produit avec form_id en une seule requête (au lieu de 2)
            const { data: currentProduct } = await locals.supabase
                .from('products')
                .select('image_url, form_id')
                .eq('id', productId)
                .eq('shop_id', shopId)
                .single();

            // Handle image upload if provided
            let imageUrl = null;
            const oldImageUrl = currentProduct?.image_url || null;
            const currentFormId = currentProduct?.form_id || null;

            if (imageFile && imageFile.size > 0) {
                // Vérifier que c'est bien une image
                if (!imageFile.type.startsWith('image/')) {
                    return fail(400, { form, error: 'Le fichier doit être une image valide (JPG, PNG, etc.)' });
                }

                // Validation : taille max 4MB (limite Vercel: 4.5MB)
                if (imageFile.size > 4 * 1024 * 1024) {
                    const fileSizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
                    return fail(400, { 
                        form, 
                        error: `L'image est trop lourde (${fileSizeMB} MB). La taille maximale autorisée est de 4 MB. Veuillez compresser ou choisir une autre image.` 
                    });
                }

                try {
                    // Upload vers Cloudinary (compression et optimisation automatiques)
                    const uploadResult = await uploadProductImage(imageFile, shopId);
                    imageUrl = uploadResult.secure_url;

                    // Supprimer l'ancienne image Cloudinary si elle existe
                    if (oldImageUrl) {
                        const oldPublicId = extractPublicIdFromUrl(oldImageUrl);
                        if (oldPublicId) {
                            await deleteImage(oldPublicId);
                        }
                    }
                } catch (err) {
                    console.error('❌ [Product Update] Erreur Cloudinary:', err);
                    return fail(500, { form, error: 'Erreur lors de l\'upload de l\'image' });
                }
            }

            // Mettre à jour le produit
            const updateData: any = {
                name,
                description,
                base_price,
                category_id: finalCategoryId || null,
                min_days_notice,
                cake_type: cake_type || null
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
                return fail(500, {
                    form,
                    error: 'Erreur lors de la modification du produit'
                });
            }

            // Supprimer l'ancienne image Cloudinary si elle existe et a été remplacée
            if (oldImageUrl && oldImageUrl !== imageUrl) {
                const oldPublicId = extractPublicIdFromUrl(oldImageUrl);
                if (oldPublicId) {
                    // Vérifier que l'image n'est pas utilisée par d'autres produits
                    const { data: otherProducts } = await locals.supabase
                        .from('products')
                        .select('id')
                        .eq('image_url', oldImageUrl)
                        .neq('id', productId);

                    if (!otherProducts || otherProducts.length === 0) {
                        await deleteImage(oldPublicId);
                    }
                }
            }

            // Mettre à jour les champs de personnalisation si fournis
            if (customizationFields !== undefined) { // Vérifier si le champ est présent (même vide)
                try {

                    if (updatedProduct.form_id) {
                        // Récupérer les champs existants pour comparer
                        const { data: existingFields, error: fetchError } = await locals.supabase
                            .from('form_fields')
                            .select('id, label, type, options, required, order')
                            .eq('form_id', updatedProduct.form_id)
                            .order('order');

                        if (fetchError) {
                            return fail(500, {
                                form,
                                error: 'Erreur lors de la récupération des champs existants'
                            });
                        }


                        // Identifier les champs à supprimer (ceux qui existent mais ne sont plus dans la nouvelle liste)
                        const fieldsToDelete = existingFields.filter(existingField =>
                            !customizationFields.some(newField => newField.id === existingField.id)
                        );

                        // Identifier les champs à mettre à jour ou ajouter
                        const fieldsToUpsert = customizationFields.map((field: any, index: number) => ({
                            id: field.id || undefined, // Garder l'ID si il existe
                            form_id: updatedProduct.form_id,
                            label: field.label,
                            type: field.type,
                            options: field.options && field.options.length > 0 ? field.options : null,
                            required: field.required,
                            order: index + 1
                        }));


                        // ✅ OPTIMISÉ : Regrouper toutes les suppressions en une seule requête
                        // Identifier tous les IDs à supprimer (champs supprimés + cas où tous les champs sont supprimés)
                        const idsToDelete: string[] = [];

                        if (fieldsToUpsert.length === 0 && existingFields.length > 0) {
                            // Tous les champs ont été supprimés
                            idsToDelete.push(...existingFields.map(f => f.id));
                        } else if (fieldsToDelete.length > 0) {
                            // Seulement les champs spécifiques à supprimer
                            idsToDelete.push(...fieldsToDelete.map(f => f.id));
                        }

                        // Supprimer tous les champs en une seule requête
                        if (idsToDelete.length > 0) {
                            const { error: deleteError } = await locals.supabase
                                .from('form_fields')
                                .delete()
                                .in('id', idsToDelete);

                            if (deleteError) {
                                return fail(500, {
                                    form,
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
                                return fail(500, {
                                    form,
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
                            return fail(500, {
                                form,
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
                            return fail(500, {
                                form,
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
                    return fail(400, {
                        form,
                        error: 'Erreur lors du traitement des champs de personnalisation'
                    });
                }
            }
        } catch (err) {
            return fail(500, {
                form,
                error: 'Erreur inattendue lors de la modification du produit'
            });
        }

        // Increment catalog version to invalidate public cache
        try {
            await forceRevalidateShop(shopSlug);
        } catch (error) {
            // Don't fail the entire operation, just log the warning
        }

        // Retourner un succès avec le formulaire Superforms
        form.message = 'Produit modifié avec succès';
        return { form };
    },

    createCategory: async ({ request, locals }) => {
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;

        if (!shopId) {
            return fail(400, { error: 'Données de boutique manquantes' });
        }

        // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite getShopIdAndSlug + requête shop)
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            return fail(403, { error: 'Accès non autorisé à cette boutique' });
        }

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
                return fail(500, { form, error: 'Erreur lors de la création de la catégorie' });
            }

            // Retourner le succès avec le formulaire et la nouvelle catégorie
            form.message = 'Catégorie créée avec succès';
            return { form, category: newCategory };
        } catch (err) {
            return fail(500, { form, error: 'Erreur lors de la création de la catégorie' });
        }
    }
};