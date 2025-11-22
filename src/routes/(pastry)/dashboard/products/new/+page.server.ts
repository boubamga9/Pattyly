import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserPermissions, getShopIdAndSlug } from '$lib/auth';
import { uploadProductImage } from '$lib/cloudinary';
import { forceRevalidateShop } from '$lib/utils/catalog';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createProductFormSchema, createCategoryFormSchema } from './schema';

export const load: PageServerLoad = async ({ locals, parent }) => {
    const { userId, permissions } = await parent();

    // Get shop_id for this user
    const { id: shopId } = await getShopIdAndSlug(userId, locals.supabase);

    if (!shopId) {
        throw error(500, 'Erreur lors du chargement de la boutique');
    }

    const { data: categories, error: categoriesError } = await locals.supabase
        .from('categories')
        .select('id, name')
        .eq('shop_id', shopId)
        .order('name');


    // Initialiser les formulaires Superforms
    const createProductForm = await superValidate(zod(createProductFormSchema));
    const createCategoryForm = await superValidate(zod(createCategoryFormSchema));

    return {
        categories: categories || [],
        userPlan: permissions.plan,
        createProductForm,
        createCategoryForm
    };
};

export const actions: Actions = {
    createProduct: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // Récupérer les permissions
        const permissions = await getUserPermissions(userId, locals.supabase);

        // Get shop_id for this user
        const { id: shopId, slug: shopSlug } = await getShopIdAndSlug(userId, locals.supabase);

        if (!shopId || !shopSlug) {
            return fail(500, { error: 'Boutique non trouvée' });
        }

        const formData = await request.formData();

        // Valider avec Superforms
        const form = await superValidate(formData, zod(createProductFormSchema));

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
                    return fail(500, { form, error: 'Erreur lors de la création de la catégorie' });
                }

                // Utiliser l'ID de la nouvelle catégorie
                finalCategoryId = newCategory.id;
            } catch (err) {
                return fail(500, { form, error: 'Erreur lors de la création de la catégorie' });
            }
        } else if (category_id === 'temp-new-category') {
            // Si l'ID est temporaire mais qu'il n'y a pas de nouveau nom, erreur
            return fail(400, { form, error: 'Erreur: catégorie temporaire sans nom' });
        }

        // Les champs de personnalisation sont déjà validés et parsés par Superforms
        const validatedCustomizationFields = customizationFields || [];

        // Handle image upload if provided
        let imageUrl = null;

        if (imageFile && imageFile.size > 0) {
            // Validation basique : taille max 10MB
            if (imageFile.size > 10 * 1024 * 1024) {
                return fail(400, { error: 'L\'image ne doit pas dépasser 10MB' });
            }

            // Vérifier que c'est bien une image
            if (!imageFile.type.startsWith('image/')) {
                return fail(400, { error: 'Le fichier doit être une image' });
            }

            try {
                // Upload vers Cloudinary (compression et optimisation automatiques)
                const uploadResult = await uploadProductImage(imageFile, shopId);
                imageUrl = uploadResult.secure_url;
            } catch (err) {
                console.error('❌ [Product Upload] Erreur Cloudinary:', err);
                return fail(500, { error: 'Erreur lors de l\'upload de l\'image' });
            }
        }

        try {
            // Start a transaction
            const { data: product, error: insertError } = await locals.supabase
                .from('products')
                .insert({
                    name,
                    description,
                    base_price,
                    category_id: finalCategoryId || null,
                    shop_id: shopId,
                    min_days_notice,
                    image_url: imageUrl
                })
                .select()
                .single();

            if (insertError) {
                return fail(500, { error: 'Erreur lors de l\'ajout du produit' });
            }

            // Create form if customization fields are provided
            if (validatedCustomizationFields.length > 0) {
                // Create the form
                const { data: formData, error: formError } = await locals.supabase
                    .from('forms')
                    .insert({
                        shop_id: shopId,
                        is_custom_form: false
                    })
                    .select()
                    .single();

                if (formError) {
                    return fail(500, { form, error: 'Erreur lors de la création du formulaire' });
                }

                // Create form fields
                const formFields = validatedCustomizationFields.map((field, index) => ({
                    form_id: formData.id,
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
                    return fail(500, { form, error: 'Erreur lors de la création des champs du formulaire' });
                }

                // Update product with form_id
                const { error: updateError } = await locals.supabase
                    .from('products')
                    .update({ form_id: formData.id })
                    .eq('id', product.id);

                if (updateError) {
                    return fail(500, { form, error: 'Erreur lors de l\'association du formulaire au produit' });
                }
            }
        } catch (err) {
            return fail(500, { form, error: 'Erreur inattendue lors de l\'ajout du produit' });
        }

        // Increment catalog version to invalidate public cache
        try {
            await forceRevalidateShop(shopSlug);
        } catch (error) {
            // Don't fail the entire operation, just log the warning
        }

        // Retourner un succès pour Superforms
        form.message = 'Produit créé avec succès';
        return { form };
    },

    createCategory: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }

        // Get shop_id for this user
        const { id: shopId } = await getShopIdAndSlug(userId, locals.supabase);

        if (!shopId) {
            return fail(500, { error: 'Boutique non trouvée' });
        }

        const formData = await request.formData();

        // Valider avec Superforms
        const form = await superValidate(formData, zod(createCategoryFormSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        const { name: trimmedName } = form.data;

        try {
            // Vérifier si la catégorie existe déjà
            const { data: existingCategory, error: checkError } = await locals.supabase
                .from('categories')
                .select('id')
                .eq('shop_id', shopId)
                .eq('name', trimmedName)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                return fail(500, { form, error: 'Erreur lors de la vérification de la catégorie' });
            }

            if (existingCategory) {
                return fail(400, { form, error: 'Cette catégorie existe déjà' });
            }

            // Créer la nouvelle catégorie
            const { data: newCategory, error: insertError } = await locals.supabase
                .from('categories')
                .insert({
                    name: trimmedName,
                    shop_id: shopId
                })
                .select('id, name')
                .single();

            if (insertError) {
                return fail(500, { form, error: 'Erreur lors de la création de la catégorie' });
            }


            // Retourner un succès pour Superforms
            form.message = 'Catégorie créée avec succès';
            return { form, category: newCategory };
        } catch (err) {
            return fail(500, { form, error: 'Erreur inattendue lors de la création de la catégorie' });
        }
    }
};
