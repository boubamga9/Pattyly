import { error as svelteError, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getShopIdAndSlug, getUserPermissions } from '$lib/auth';
import { deleteImageIfUnused } from '$lib/storage';
import { forceRevalidateShop } from '$lib/utils/catalog';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createCategoryFormSchema, updateCategoryFormSchema, deleteCategoryFormSchema } from './schema';

export const load: PageServerLoad = async ({ locals, parent }) => {
    const { userId, permissions } = await parent();
    const currentProductCount = permissions.productCount;

    // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données produits
    const { data: productsData, error } = await locals.supabase.rpc('get_products_data', {
        p_profile_id: userId
    });

    if (error) {
        console.error('Error fetching products data:', error);
        throw svelteError(500, 'Erreur lors du chargement des données');
    }

    const { products, categories, shop } = productsData;

    // Initialiser les formulaires Superforms
    const createCategoryForm = await superValidate(zod(createCategoryFormSchema));
    const updateCategoryForm = await superValidate(zod(updateCategoryFormSchema));
    const deleteCategoryForm = await superValidate(zod(deleteCategoryFormSchema));

    return {
        products,
        categories,
        currentProductCount,
        userPlan: permissions.plan,
        permissions,
        shopSlug: shop.slug,
        createCategoryForm,
        updateCategoryForm,
        deleteCategoryForm
    };
};

export const actions: Actions = {
    deleteProduct: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // Get shop_id for this user
        const { id: shopId, slug: shopSlug } = await getShopIdAndSlug(userId, locals.supabase);

        if (!shopId || !shopSlug) {
            return fail(500, { error: 'Boutique non trouvée' });
        }

        const formData = await request.formData();
        const productId = formData.get('productId') as string;

        if (!productId) {
            return fail(400, {
                error: 'ID du produit manquant'
            });
        }

        try {
            // Vérifier que le produit appartient à l'utilisateur et récupérer ses infos
            const { data: product, error: checkError } = await locals.supabase
                .from('products')
                .select('id, name, form_id, image_url')
                .eq('id', productId)
                .eq('shop_id', shopId)
                .single();

            if (checkError || !product) {
                return fail(404, { error: 'Produit non trouvé' });
            }

            // Supprimer le formulaire associé s'il existe
            if (product.form_id) {
                // Supprimer d'abord les champs du formulaire
                const { error: fieldsDeleteError } = await locals.supabase
                    .from('form_fields')
                    .delete()
                    .eq('form_id', product.form_id);

                if (fieldsDeleteError) {
                    return fail(500, {
                        error: 'Erreur lors de la suppression des champs du formulaire'
                    });
                }

                // Puis supprimer le formulaire
                const { error: formDeleteError } = await locals.supabase
                    .from('forms')
                    .delete()
                    .eq('id', product.form_id);

                if (formDeleteError) {
                    return fail(500, {
                        error: 'Erreur lors de la suppression du formulaire'
                    });
                }
            }

            // Supprimer le produit
            const { error: deleteError } = await locals.supabase
                .from('products')
                .delete()
                .eq('id', productId)
                .eq('shop_id', shopId);

            if (deleteError) {
                return fail(500, {
                    error: 'Erreur lors de la suppression du produit'
                });
            }

            // Supprimer l'image si elle n'est plus utilisée par d'autres produits
            if (product.image_url) {
                await deleteImageIfUnused(locals.supabase, product.image_url);
            }

            // Increment catalog version to invalidate public cache
            try {
                await forceRevalidateShop(shopSlug);
            } catch (error) {
                // Don't fail the entire operation, just log the warning
            }

            return { message: 'Produit et formulaire supprimés avec succès' };
        } catch (err) {
            return fail(500, {
                error: 'Erreur inattendue lors de la suppression'
            });
        }
    },

    duplicateProduct: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // Get shop_id for this user
        const { id: shopId, slug: shopSlug } = await getShopIdAndSlug(userId, locals.supabase);

        if (!shopId || !shopSlug) {
            return fail(500, { error: 'Boutique non trouvée' });
        }

        // Récupérer les permissions
        const permissions = await getUserPermissions(userId, locals.supabase);

        const formData = await request.formData();
        const productId = formData.get('productId') as string;

        if (!productId) {
            return fail(400, {
                error: 'ID du produit manquant'
            });
        }

        try {
            // Récupérer le produit original
            const { data: originalProduct, error: fetchError } = await locals.supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .eq('shop_id', shopId)
                .single();

            if (fetchError || !originalProduct) {
                return fail(404, {
                    error: 'Produit non trouvé'
                });
            }

            // Créer une copie avec un nom modifié
            const duplicateName = `${originalProduct.name} (Copie)`;

            const { data: newProduct, error: insertError } = await locals.supabase
                .from('products')
                .insert({
                    name: duplicateName,
                    description: originalProduct.description,
                    base_price: originalProduct.base_price,
                    category_id: originalProduct.category_id,
                    shop_id: shopId,
                    min_days_notice: originalProduct.min_days_notice,
                    image_url: originalProduct.image_url
                })
                .select()
                .single();

            if (insertError) {
                return fail(500, {
                    error: 'Erreur lors de la duplication du produit'
                });
            }

            // Dupliquer le formulaire si le produit original en a un
            if (originalProduct.form_id) {
                // Récupérer le formulaire original et ses champs
                const { data: originalForm, error: formError } = await locals.supabase
                    .from('forms')
                    .select(`
                        *,
                        form_fields(*)
                    `)
                    .eq('id', originalProduct.form_id)
                    .single();

                if (formError) {
                    return fail(500, {
                        error: 'Erreur lors de la récupération du formulaire original'
                    });
                }

                if (originalForm) {
                    // Créer un nouveau formulaire
                    const { data: newForm, error: newFormError } = await locals.supabase
                        .from('forms')
                        .insert({
                            shop_id: shopId,
                            is_custom_form: false
                        })
                        .select()
                        .single();

                    if (newFormError) {
                        return fail(500, {
                            error: 'Erreur lors de la création du nouveau formulaire'
                        });
                    }

                    // Dupliquer les champs du formulaire
                    if (originalForm.form_fields && originalForm.form_fields.length > 0) {
                        const formFields = originalForm.form_fields.map((field: any) => ({
                            form_id: newForm.id,
                            label: field.label,
                            type: field.type,
                            options: field.options,
                            required: field.required,
                            order: field.order
                        }));

                        const { error: fieldsError } = await locals.supabase
                            .from('form_fields')
                            .insert(formFields);

                        if (fieldsError) {
                            return fail(500, {
                                error: 'Erreur lors de la duplication des champs du formulaire'
                            });
                        }
                    }

                    // Associer le nouveau formulaire au produit dupliqué
                    const { error: updateError } = await locals.supabase
                        .from('products')
                        .update({ form_id: newForm.id })
                        .eq('id', newProduct.id);

                    if (updateError) {
                        return fail(500, {
                            error: 'Erreur lors de l\'association du formulaire au produit dupliqué'
                        });
                    }
                }
            }

            // Increment catalog version to invalidate public cache
            try {
                await forceRevalidateShop(shopSlug);
            } catch (error) {
                // Don't fail the entire operation, just log the warning
            }

            return { message: 'Produit et formulaire dupliqués avec succès' };
        } catch (err) {
            return fail(500, {
                error: 'Erreur inattendue lors de la duplication'
            });
        }
    },

    createCategory: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // Get shop_id for this user
        const { id: shopId, slug: shopSlug } = await getShopIdAndSlug(userId, locals.supabase);

        if (!shopId || !shopSlug) {
            return fail(500, { error: 'Boutique non trouvée' });
        }

        // Validation avec Superforms
        const form = await superValidate(request, zod(createCategoryFormSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        const { name: categoryName } = form.data;
        const trimmedName = categoryName.trim();

        try {
            // ✅ OPTIMISÉ : Utiliser ON CONFLICT pour éviter la vérification préalable (2 requêtes → 1 requête)
            const { data: newCategory, error: insertError } = await locals.supabase
                .from('categories')
                .insert({
                    name: trimmedName,
                    shop_id: shopId
                })
                .select('id, name')
                .single()
                .onConflict('name,shop_id')
                .merge(); // Si existe déjà, on récupère l'existant

            if (insertError) {
                return fail(500, {
                    error: 'Erreur lors de la création de la catégorie'
                });
            }

            // Increment catalog version to invalidate public cache
            try {
                await forceRevalidateShop(shopSlug);
            } catch (error) {
                // Don't fail the entire operation, just log the warning
            }

            // Retourner le formulaire mis à jour pour Superforms
            const updatedForm = await superValidate(zod(createCategoryFormSchema));
            updatedForm.message = 'Catégorie créée avec succès';
            return { form: updatedForm };
        } catch (err) {
            return fail(500, { form });
        }
    },

    updateCategory: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // Get shop_id for this user
        const { id: shopId, slug: shopSlug } = await getShopIdAndSlug(userId, locals.supabase);

        if (!shopId || !shopSlug) {
            return fail(500, { error: 'Boutique non trouvée' });
        }

        // Récupérer categoryId AVANT superValidate (car le body ne peut être lu qu'une fois)
        const formData = await request.formData();
        const categoryId = formData.get('categoryId') as string;

        if (!categoryId) {
            return fail(400, { error: 'ID de la catégorie manquant' });
        }

        // Validation avec Superforms
        const form = await superValidate(formData, zod(updateCategoryFormSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        const { name: categoryName } = form.data;
        const trimmedName = categoryName.trim();

        try {
            // Vérifier que la catégorie appartient à l'utilisateur
            const { data: existingCategory, error: checkError } = await locals.supabase
                .from('categories')
                .select('id, name')
                .eq('id', categoryId)
                .eq('shop_id', shopId)
                .single();

            if (checkError || !existingCategory) {
                return fail(404, { error: 'Catégorie non trouvée' });
            }

            // Si le nom n'a pas changé, pas besoin de mettre à jour
            if (existingCategory.name === trimmedName) {
                return { message: 'Aucune modification nécessaire' };
            }

            // Vérifier si le nouveau nom existe déjà
            const { data: duplicateCategory, error: duplicateError } = await locals.supabase
                .from('categories')
                .select('id')
                .eq('shop_id', shopId)
                .eq('name', trimmedName)
                .neq('id', categoryId)
                .single();

            if (duplicateError && duplicateError.code !== 'PGRST116') {
                return fail(500, { error: 'Erreur lors de la vérification' });
            }

            if (duplicateCategory) {
                return fail(400, { error: 'Cette catégorie existe déjà' });
            }

            // Mettre à jour la catégorie
            const { error: updateError } = await locals.supabase
                .from('categories')
                .update({ name: trimmedName })
                .eq('id', categoryId)
                .eq('shop_id', shopId);

            if (updateError) {
                return fail(500, { error: 'Erreur lors de la modification de la catégorie' });
            }

            // Increment catalog version to invalidate public cache
            try {
                await forceRevalidateShop(shopSlug);
            } catch (error) {
                // Don't fail the entire operation, just log the warning
            }

            // Retourner le formulaire mis à jour pour Superforms
            const updatedForm = await superValidate(zod(updateCategoryFormSchema));
            updatedForm.message = 'Catégorie modifiée avec succès';
            return { form: updatedForm };
        } catch (err) {
            return fail(500, { form });
        }
    },

    deleteCategory: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // Get shop_id for this user
        const { id: shopId, slug: shopSlug } = await getShopIdAndSlug(userId, locals.supabase);

        if (!shopId || !shopSlug) {
            return fail(500, { error: 'Boutique non trouvée' });
        }

        const formData = await request.formData();
        const categoryId = formData.get('categoryId') as string;

        if (!categoryId) {
            return fail(400, { error: 'ID de la catégorie manquant' });
        }

        try {
            // Vérifier que la catégorie appartient à l'utilisateur
            const { data: category, error: checkError } = await locals.supabase
                .from('categories')
                .select('id, name')
                .eq('id', categoryId)
                .eq('shop_id', shopId)
                .single();

            if (checkError || !category) {
                return fail(404, { error: 'Catégorie non trouvée' });
            }

            // Vérifier si la catégorie a des produits
            const { data: products, error: productsError } = await locals.supabase
                .from('products')
                .select('id')
                .eq('category_id', categoryId)
                .eq('shop_id', shopId);

            if (productsError) {
                return fail(500, { error: 'Erreur lors de la vérification des produits' });
            }

            if (products && products.length > 0) {
                return fail(400, {
                    error: `Impossible de supprimer la catégorie "${category.name}" car elle contient ${products.length} gâteau${products.length > 1 ? 'x' : ''}. Veuillez d'abord déplacer ou supprimer ces gâteaux.`
                });
            }

            // Supprimer la catégorie
            const { error: deleteError } = await locals.supabase
                .from('categories')
                .delete()
                .eq('id', categoryId)
                .eq('shop_id', shopId);

            if (deleteError) {
                return fail(500, { error: 'Erreur lors de la suppression de la catégorie' });
            }

            // Increment catalog version to invalidate public cache
            try {
                await forceRevalidateShop(shopSlug);
            } catch (error) {
                // Don't fail the entire operation, just log the warning
            }

            // Retourner le formulaire mis à jour pour Superforms
            const deleteForm = await superValidate(zod(deleteCategoryFormSchema));
            deleteForm.message = 'Catégorie supprimée avec succès';
            return { form: deleteForm };
        } catch (err) {
            return fail(500, { error: 'Erreur inattendue lors de la suppression' });
        }
    },

    toggleProductActive: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // Get shop_id for this user
        const { id: shopId, slug: shopSlug } = await getShopIdAndSlug(userId, locals.supabase);

        if (!shopId || !shopSlug) {
            return fail(500, { error: 'Boutique non trouvée' });
        }

        const formData = await request.formData();
        const productId = formData.get('productId') as string;
        const isActive = formData.get('isActive') === 'true';

        if (!productId) {
            return fail(400, { error: 'ID du produit manquant' });
        }

        try {
            // Vérifier que le produit appartient à l'utilisateur
            const { data: product, error: checkError } = await locals.supabase
                .from('products')
                .select('id, name, is_active')
                .eq('id', productId)
                .eq('shop_id', shopId)
                .single();

            if (checkError || !product) {
                return fail(404, { error: 'Produit non trouvé' });
            }

            // Mettre à jour l'état actif du produit
            const { error: updateError } = await locals.supabase
                .from('products')
                .update({ is_active: isActive })
                .eq('id', productId)
                .eq('shop_id', shopId);

            if (updateError) {
                return fail(500, { error: 'Erreur lors de la mise à jour du produit' });
            }

            // Increment catalog version to invalidate public cache
            try {
                await forceRevalidateShop(shopSlug);
            } catch (error) {
                // Don't fail the entire operation, just log the warning
            }

            return {
                message: `Gâteau ${isActive ? 'activé' : 'désactivé'} avec succès`,
                isActive
            };
        } catch (err) {
            return fail(500, { error: 'Erreur inattendue lors de la mise à jour' });
        }
    }
};
