import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserPermissions, getShopId } from '$lib/permissions';
import { validateImageServer, validateAndRecompressImage, logValidationInfo } from '$lib/utils/server-image-validation';

export const load: PageServerLoad = async ({ locals, parent }) => {
    const { userId, permissions } = await parent();

    if (!permissions.canAddMoreProducts) {
        throw redirect(303, '/dashboard/products');
    }

    // Get shop_id for this user
    const shopId = await getShopId(userId, locals.supabase);

    if (!shopId) {
        throw error(500, 'Erreur lors du chargement de la boutique');
    }

    const { data: categories, error: categoriesError } = await locals.supabase
        .from('categories')
        .select('id, name')
        .eq('shop_id', shopId)
        .order('name');

    if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
    }

    return {
        categories: categories || [],
        userPlan: permissions.plan
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

        if (!permissions.canAddMoreProducts) {
            return fail(403, { error: 'Limite de produits atteinte. Passez au plan Premium pour ajouter plus de produits !' });
        }

        // Get shop_id for this user
        const shopId = await getShopId(userId, locals.supabase);

        if (!shopId) {
            return fail(500, { error: 'Boutique non trouvée' });
        }

        const formData = await request.formData();

        // DEBUG: Log tous les champs du FormData
        console.log('=== ALL FORM DATA ===');
        for (const [key, value] of formData.entries()) {
            console.log(`${key}:`, value);
        }

        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const base_price = parseFloat(formData.get('price') as string);
        const category_id = formData.get('category_id') as string;
        const min_days_notice = parseInt(formData.get('min_days_notice') as string) || 0;
        const imageFile = formData.get('image') as File;
        const customizationFieldsJson = formData.get('customizationFields') as string;

        // DEBUG: Log des données reçues
        console.log('=== DEBUG CUSTOMIZATION FIELDS ===');
        console.log('customizationFieldsJson:', customizationFieldsJson);
        console.log('Type:', typeof customizationFieldsJson);

        if (!name || !base_price || base_price <= 0) {
            return fail(400, { error: 'Veuillez remplir tous les champs obligatoires' });
        }

        // Parse customization fields
        let customizationFields: Array<{
            label: string;
            type: 'short-text' | 'long-text' | 'number' | 'single-select' | 'multi-select';
            required: boolean;
            options: Array<{ label: string; price?: number }>;
        }> = [];

        if (customizationFieldsJson) {
            try {
                customizationFields = JSON.parse(customizationFieldsJson);
                console.log('Parsed customizationFields:', customizationFields);
                console.log('Number of fields:', customizationFields.length);
            } catch (error) {
                console.error('Error parsing customization fields:', error);
                return fail(400, { error: 'Erreur lors du traitement des champs de personnalisation' });
            }
        } else {
            console.log('No customization fields JSON received');
        }

        // Handle image upload if provided
        let imageUrl = null;
        let oldImageUrl = null; // Stocker l'ancienne image pour suppression

        if (imageFile && imageFile.size > 0) {
            // Stocker l'ancienne image avant de la remplacer
            oldImageUrl = null; // Pas d'ancienne image pour un nouveau produit
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

        try {
            // Start a transaction
            const { data: product, error: insertError } = await locals.supabase
                .from('products')
                .insert({
                    name,
                    description,
                    base_price,
                    category_id: category_id || null,
                    shop_id: shopId,
                    min_days_notice,
                    image_url: imageUrl
                })
                .select()
                .single();

            if (insertError) {
                console.error('Error adding product:', insertError);
                return fail(500, { error: 'Erreur lors de l\'ajout du produit' });
            }

            // Create form if customization fields are provided
            console.log('Checking if customization fields exist:', customizationFields.length > 0);

            if (customizationFields.length > 0) {
                console.log('Creating form for customization fields...');

                // Create the form
                const { data: form, error: formError } = await locals.supabase
                    .from('forms')
                    .insert({
                        shop_id: shopId,
                        is_custom_form: false
                    })
                    .select()
                    .single();

                if (formError) {
                    console.error('Error creating form:', formError);
                    return fail(500, { error: 'Erreur lors de la création du formulaire' });
                }

                console.log('Form created successfully:', form);

                // Create form fields
                const formFields = customizationFields.map((field, index) => ({
                    form_id: form.id,
                    label: field.label,
                    type: field.type,
                    options: field.options.length > 0 ? field.options : null,
                    required: field.required,
                    order: index + 1
                }));

                console.log('Form fields to insert:', formFields);

                const { error: fieldsError } = await locals.supabase
                    .from('form_fields')
                    .insert(formFields);

                if (fieldsError) {
                    console.error('Error creating form fields:', fieldsError);
                    return fail(500, { error: 'Erreur lors de la création des champs du formulaire' });
                }

                console.log('Form fields created successfully');

                // Update product with form_id
                console.log('Updating product with form_id:', form.id);

                const { error: updateError } = await locals.supabase
                    .from('products')
                    .update({ form_id: form.id })
                    .eq('id', product.id);

                if (updateError) {
                    console.error('Error updating product with form_id:', updateError);
                    return fail(500, { error: 'Erreur lors de l\'association du formulaire au produit' });
                }

                console.log('Product updated with form_id successfully');
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            return fail(500, { error: 'Erreur inattendue lors de l\'ajout du produit' });
        }

        // Retourner un succès pour déclencher la redirection côté client
        return { success: true, message: 'Produit créé avec succès' };
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
        const categoryName = formData.get('categoryName') as string;

        if (!categoryName || !categoryName.trim()) {
            return fail(400, {
                error: 'Le nom de la catégorie est obligatoire'
            });
        }

        const trimmedName = categoryName.trim();

        // Validation côté serveur
        if (trimmedName.length < 2) {
            return fail(400, {
                error: 'Le nom doit contenir au moins 2 caractères'
            });
        }

        if (trimmedName.length > 50) {
            return fail(400, {
                error: 'Le nom ne peut pas dépasser 50 caractères'
            });
        }

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
            const { data: newCategory, error: insertError } = await locals.supabase
                .from('categories')
                .insert({
                    name: trimmedName,
                    shop_id: shopId
                })
                .select('id, name')
                .single();

            if (insertError) {
                console.error('Error creating category:', insertError);
                return fail(500, {
                    error: 'Erreur lors de la création de la catégorie'
                });
            }

            return {
                message: 'Catégorie créée avec succès',
                category: newCategory
            };
        } catch (err) {
            console.error('Unexpected error:', err);
            return fail(500, {
                error: 'Erreur inattendue lors de la création de la catégorie'
            });
        }
    }
};
