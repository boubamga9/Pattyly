import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getShopId } from '$lib/permissions';
import { deleteImageIfUnused } from '$lib/storage-utils';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createCategoryFormSchema, updateCategoryFormSchema, deleteCategoryFormSchema } from './schema';

export const load: PageServerLoad = async ({ locals, parent }) => {
    const { userId, permissions } = await parent();
    const currentProductCount = permissions.productCount;
    const canAddProducts = permissions.canAddMoreProducts;

    // Get shop_id for this user
    const shopId = await getShopId(userId, locals.supabase);

    if (!shopId) {
        throw error(500, 'Erreur lors du chargement de la boutique');
    }

    // Then get products for this shop
    const { data: products, error: productsError } = await locals.supabase
        .from('products')
        .select(`*,categories(name)`)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

    if (productsError) {
        console.error('Error fetching products:', productsError);
        throw error(500, 'Erreur lors du chargement des produits');
    }

    // Get categories for this shop
    const { data: categories, error: categoriesError } = await locals.supabase
        .from('categories')
        .select('id, name')
        .eq('shop_id', shopId)
        .order('name', { ascending: true });

    if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        throw error(500, 'Erreur lors du chargement des catégories');
    }

    // Get shop slug for public URLs
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('slug')
        .eq('id', shopId)
        .single();

    if (shopError) {
        console.error('Error fetching shop slug:', shopError);
        throw error(500, 'Erreur lors du chargement des informations de la boutique');
    }

    // Initialiser les formulaires Superforms
    const createCategoryForm = await superValidate(zod(createCategoryFormSchema));
    const updateCategoryForm = await superValidate(zod(updateCategoryFormSchema));
    const deleteCategoryForm = await superValidate(zod(deleteCategoryFormSchema));

    return {
        products,
        categories,
        currentProductCount,
        canAddProducts,
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
        const shopId = await getShopId(userId, locals.supabase);

        if (!shopId) {
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
                    console.error('Error deleting form fields:', fieldsDeleteError);
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
                    console.error('Error deleting form:', formDeleteError);
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
                console.error('Error deleting product:', deleteError);
                return fail(500, {
                    error: 'Erreur lors de la suppression du produit'
                });
            }

            // Supprimer l'image si elle n'est plus utilisée par d'autres produits
            if (product.image_url) {
                await deleteImageIfUnused(locals.supabase, product.image_url);
            }

            return { message: 'Produit et formulaire supprimés avec succès' };
        } catch (err) {
            console.error('Unexpected error:', err);
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
        const shopId = await getShopId(userId, locals.supabase);

        if (!shopId) {
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
                console.error('Error duplicating product:', insertError);
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
                    console.error('Error fetching original form:', formError);
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
                        console.error('Error creating new form:', newFormError);
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
                            console.error('Error duplicating form fields:', fieldsError);
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
                        console.error('Error associating form with duplicated product:', updateError);
                        return fail(500, {
                            error: 'Erreur lors de l\'association du formulaire au produit dupliqué'
                        });
                    }
                }
            }

            return { message: 'Produit et formulaire dupliqués avec succès' };
        } catch (err) {
            console.error('Unexpected error:', err);
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
        const shopId = await getShopId(userId, locals.supabase);

        if (!shopId) {
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
            // Vérifier si la catégorie existe déjà
            const { data: existingCategory, error: checkError } = await locals.supabase
                .from('categories')
                .select('id')
                .eq('shop_id', shopId)
                .eq('name', trimmedName)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error checking existing category:', checkError);
                return fail(500, {
                    error: 'Erreur lors de la vérification de la catégorie'
                });
            }

            if (existingCategory) {
                return fail(400, {
                    error: 'Cette catégorie existe déjà'
                });
            }

            // Créer la nouvelle catégorie
            const { error: insertError } = await locals.supabase
                .from('categories')
                .insert({
                    name: trimmedName,
                    shop_id: shopId
                });

            if (insertError) {
                console.error('Error creating category:', insertError);
                return fail(500, {
                    error: 'Erreur lors de la création de la catégorie'
                });
            }

            // Retourner le formulaire mis à jour pour Superforms
            const updatedForm = await superValidate(zod(createCategoryFormSchema));
            updatedForm.message = 'Catégorie créée avec succès';
            return { form: updatedForm };
        } catch (err) {
            console.error('Unexpected error:', err);
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
        const shopId = await getShopId(userId, locals.supabase);

        if (!shopId) {
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
                console.error('Error checking duplicate category:', duplicateError);
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
                console.error('Error updating category:', updateError);
                return fail(500, { error: 'Erreur lors de la modification de la catégorie' });
            }

            // Retourner le formulaire mis à jour pour Superforms
            const updatedForm = await superValidate(zod(updateCategoryFormSchema));
            updatedForm.message = 'Catégorie modifiée avec succès';
            return { form: updatedForm };
        } catch (err) {
            console.error('Unexpected error:', err);
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
        const shopId = await getShopId(userId, locals.supabase);

        if (!shopId) {
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
                console.error('Error checking products:', productsError);
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
                console.error('Error deleting category:', deleteError);
                return fail(500, { error: 'Erreur lors de la suppression de la catégorie' });
            }

            // Retourner le formulaire mis à jour pour Superforms
            const deleteForm = await superValidate(zod(deleteCategoryFormSchema));
            deleteForm.message = 'Catégorie supprimée avec succès';
            return { form: deleteForm };
        } catch (err) {
            console.error('Unexpected error:', err);
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
        const shopId = await getShopId(userId, locals.supabase);

        if (!shopId) {
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
                console.error('Error updating product active status:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour du produit' });
            }

            return {
                message: `Gâteau ${isActive ? 'activé' : 'désactivé'} avec succès`,
                isActive
            };
        } catch (err) {
            console.error('Unexpected error:', err);
            return fail(500, { error: 'Erreur inattendue lors de la mise à jour' });
        }
    }
};
