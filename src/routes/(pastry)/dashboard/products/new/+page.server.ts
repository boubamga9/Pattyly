import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { verifyShopOwnership } from '$lib/auth';
import { uploadProductImage } from '$lib/cloudinary';
import { forceRevalidateShop } from '$lib/utils/catalog';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createProductFormSchema, createCategoryFormSchema } from './schema';
import { checkProductLimit } from '$lib/utils/product-limits';

export const load: PageServerLoad = async ({ locals, parent }) => {
    // ✅ OPTIMISÉ : Utiliser shopId et shop du parent (déjà chargé)
    const { permissions, shop } = await parent();

    if (!permissions.shopId || !shop) {
        throw error(500, 'Erreur lors du chargement de la boutique');
    }

    // ✅ 1 seule requête pour les catégories
    const { data: categories, error: categoriesError } = await locals.supabase
        .from('categories')
        .select('id, name')
        .eq('shop_id', permissions.shopId)
        .order('name');


    // Initialiser les formulaires Superforms
    const createProductForm = await superValidate(zod(createProductFormSchema));
    const createCategoryForm = await superValidate(zod(createCategoryFormSchema));

    return {
        categories: categories || [],
        userPlan: permissions.plan,
        createProductForm,
        createCategoryForm,
        shopId: permissions.shopId,
        shopSlug: permissions.shopSlug || shop.slug
    };
};

export const actions: Actions = {
    createProduct: async ({ request, locals }) => {
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        let formData: FormData;
        try {
            formData = await request.formData();
        } catch (err: any) {
            // Gérer les erreurs 413 (Payload Too Large) de Vercel
            if (err?.status === 413 || err?.message?.includes('413') || err?.message?.includes('FUNCTION_PAYLOAD_TOO_LARGE')) {
                const form = await superValidate(zod(createProductFormSchema));
                setError(form, 'image', 'L\'image est trop lourde. La taille maximale autorisée est de 4 MB. Veuillez compresser ou choisir une autre image.');
                return fail(413, { form });
            }
            // Pour les autres erreurs, re-lancer
            throw err;
        }
        
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

        // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite getUserPermissions + getShopIdAndSlug)
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            return fail(403, { error: 'Accès non autorisé à cette boutique' });
        }

        // Vérifier la limite de produits
        console.log('🔍 [Product Creation] Checking product limit before creating product...');
        const productLimitStats = await checkProductLimit(shopId, userId, locals.supabase);
        if (productLimitStats.isLimitReached) {
            console.warn('🚫 [Product Creation] Product creation blocked - limit reached:', {
                shopId,
                productCount: productLimitStats.productCount,
                productLimit: productLimitStats.productLimit,
                plan: productLimitStats.plan
            });
            return fail(403, { 
                error: `Limite de gâteaux atteinte. Vous avez atteint la limite de ${productLimitStats.productLimit} gâteau${productLimitStats.productLimit > 1 ? 'x' : ''} pour votre plan ${productLimitStats.plan === 'free' ? 'gratuit' : productLimitStats.plan === 'basic' ? 'Starter' : 'Premium'}. Passez à un plan supérieur pour ajouter plus de gâteaux.`
            });
        }

        // ✅ formData a déjà été déclaré au début de l'action, pas besoin de le redéclarer
        // Valider avec Superforms
        const form = await superValidate(formData, zod(createProductFormSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        // Extraire les données validées
        const { name, description, base_price, category_id, min_days_notice, cake_type, customizationFields } = form.data;
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
            // Vérifier que c'est bien une image
            if (!imageFile.type.startsWith('image/')) {
                return fail(400, { error: 'Le fichier doit être une image valide (JPG, PNG, etc.)' });
            }

            // Validation : taille max 4MB (limite Vercel: 4.5MB)
            if (imageFile.size > 4 * 1024 * 1024) {
                const fileSizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
                return fail(400, { 
                    error: `L'image est trop lourde (${fileSizeMB} MB). La taille maximale autorisée est de 4 MB. Veuillez compresser ou choisir une autre image.` 
                });
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

        let product: { id: string } | null = null;

        try {
            // Start a transaction
            const { data: productData, error: insertError } = await locals.supabase
                .from('products')
                .insert({
                    name,
                    description,
                    base_price,
                    category_id: finalCategoryId || null,
                    shop_id: shopId,
                    min_days_notice,
                    cake_type: cake_type || null,
                    image_url: imageUrl
                })
                .select()
                .single();

            if (insertError) {
                return fail(500, { error: 'Erreur lors de l\'ajout du produit' });
            }

            product = productData;

            // Create form if customization fields are provided
            if (validatedCustomizationFields.length > 0) {
                // Create the form
                const { data: newForm, error: formError } = await locals.supabase
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
                    return fail(500, { form, error: 'Erreur lors de la création des champs du formulaire' });
                }

                // Update product with form_id
                const { error: updateError } = await locals.supabase
                    .from('products')
                    .update({ form_id: newForm.id })
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

        // ✅ Tracking: Product added (fire-and-forget pour ne pas bloquer)
        if (product) {
            const { logEventAsync, Events } = await import('$lib/utils/analytics');
            logEventAsync(
                locals.supabaseServiceRole,
                Events.PRODUCT_ADDED,
                { product_id: product.id, product_name: name, shop_id: shopId },
                userId,
                '/dashboard/products/new'
            );
        }

        // Retourner un succès pour Superforms
        form.message = 'Produit créé avec succès';
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

        const { name: trimmedName } = form.data;

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
