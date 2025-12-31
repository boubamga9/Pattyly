import { error, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { verifyShopOwnership } from '$lib/auth';
import { STRIPE_PRICES, STRIPE_PRODUCTS } from '$lib/config/server';
import { forceRevalidateShop } from '$lib/utils/catalog';
import { toggleCustomRequestsFormSchema, updateCustomFormFormSchema } from './schema';

export const load: PageServerLoad = async ({ locals, parent }) => {
    // ✅ OPTIMISÉ : Réutiliser les permissions du layout
    const { permissions, user } = await parent();

    if (!user) {
        throw error(401, 'Non autorisé');
    }

    // Préparer un formulaire de toggle par défaut (toujours présent)
    const toggleForm = await superValidate(zod(toggleCustomRequestsFormSchema));

    // Si l'utilisateur ne peut pas gérer, on retourne la page d'upgrade avec le toggleForm
    if (!permissions.canManageCustomForms) {
        return {
            shop: null,
            customForm: null,
            customFields: [],
            permissions,
            needsUpgrade: true,
            toggleForm,
            premiumPriceId: STRIPE_PRICES.PREMIUM,
            // Compat temporaire
            form: toggleForm
        };
    }

    // Get shop_id for this user
    if (!permissions.shopId) {
        throw error(400, 'Boutique non trouvée');
    }

    // ✅ OPTIMISÉ : Utiliser le shop du parent (déjà chargé)
    const { shop: layoutShop } = await parent();
    
    if (!layoutShop) {
        throw error(404, 'Boutique non trouvée');
    }

    // Construire l'objet shop à partir du parent
    const shop = {
        id: permissions.shopId,
        slug: permissions.shopSlug || layoutShop.slug,
        is_custom_accepted: layoutShop.is_custom_accepted || false
    };

    // ✅ OPTIMISÉ : 1 seule requête avec relation Supabase pour récupérer form + form_fields
    const { data: customFormData, error: formError } = await locals.supabase
        .from('forms')
        .select(`
            id,
            is_custom_form,
            title,
            description,
            form_fields (
                id,
                label,
                type,
                options,
                required,
                order
            )
        `)
        .eq('shop_id', permissions.shopId)
        .eq('is_custom_form', true)
        .single();

    // Gérer le cas où le formulaire n'existe pas encore (code PGRST116 = no rows returned)
    if (formError && formError.code !== 'PGRST116') {
        throw error(500, 'Erreur lors du chargement du formulaire personnalisé');
    }

    // Extraire les données
    const customForm = customFormData ? {
        id: customFormData.id,
        is_custom_form: customFormData.is_custom_form,
        title: customFormData.title,
        description: customFormData.description
    } : null;

    // Extraire les champs (form_fields est un array via la relation Supabase)
    const customFields = customFormData?.form_fields 
        ? (customFormData.form_fields as any[]).sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];

    // Formulaire de mise à jour: pré-remplir avec title/description et champs
    const updateForm = await superValidate(zod(updateCustomFormFormSchema), {
        defaults: {
            title: customForm?.title ?? '',
            description: customForm?.description ?? '',
            // Defaults doivent correspondre au type de sortie (array)
            customFields: customFields ?? []
        }
    });

    return {
        shop,
        customForm,
        customFields,
        permissions,
        needsUpgrade: false,
        toggleForm,
        updateForm,
        // Compat temporaire pour l'UI actuelle (utilise encore `form`)
        form: toggleForm
    };
};

export const actions: Actions = {
    toggleCustomRequests: async ({ request, locals }) => {
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;
        const shopSlug = formData.get('shopSlug') as string;

        if (!shopId || !shopSlug) {
            const toggleForm = await superValidate(zod(toggleCustomRequestsFormSchema));
            toggleForm.message = 'Données de boutique manquantes';
            return fail(400, { toggleForm, form: toggleForm });
        }

        // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            throw error(401, 'Non autorisé');
        }

        // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite getUserPermissions + requête shop)
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            throw error(403, 'Accès non autorisé à cette boutique');
        }

        // ✅ OPTIMISÉ : Vérifier le plan directement avec get_user_plan RPC (plus léger que getUserPermissions)
        const { data: plan, error: planError } = await locals.supabase.rpc('get_user_plan', {
            p_profile_id: userId,
            premium_product_id: STRIPE_PRODUCTS.PREMIUM,
            basic_product_id: STRIPE_PRODUCTS.BASIC,
            lifetime_product_id: STRIPE_PRODUCTS.LIFETIME
        });

        if (planError || !plan || (plan !== 'premium' && plan !== 'exempt')) {
            throw error(403, 'Accès refusé : fonctionnalité réservée aux plans Premium');
        }

        const toggleFormData = await superValidate(formData, zod(toggleCustomRequestsFormSchema));

        if (!toggleFormData.valid) {
            return fail(400, { toggleForm: toggleFormData, form: toggleFormData });
        }

        const isCustomAccepted = toggleFormData.data.isCustomAccepted;

        try {
            const { error: updateError } = await locals.supabase
                .from('shops')
                .update({ is_custom_accepted: isCustomAccepted })
                .eq('id', shopId);

            if (updateError) {
                const toggleForm = await superValidate(zod(toggleCustomRequestsFormSchema));
                toggleForm.message = 'Erreur lors de la mise à jour des paramètres';
                return fail(400, { toggleForm, form: toggleForm });
            }
            await forceRevalidateShop(shopSlug);

            // Retourner le formulaire pour Superforms
            const toggleForm = await superValidate(zod(toggleCustomRequestsFormSchema));
            toggleForm.message = isCustomAccepted
                ? 'Demandes personnalisées activées'
                : 'Demandes personnalisées désactivées';
            return { toggleForm, form: toggleForm };
        } catch (err) {
            const toggleForm = await superValidate(zod(toggleCustomRequestsFormSchema));
            toggleForm.message = 'Erreur inattendue lors de la mise à jour';
            return fail(500, { toggleForm, form: toggleForm });
        }
    },

    updateCustomForm: async ({ request, locals }) => {
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;
        const shopSlug = formData.get('shopSlug') as string;

        if (!shopId || !shopSlug) {
            const updateForm = await superValidate(zod(updateCustomFormFormSchema));
            updateForm.message = 'Données de boutique manquantes';
            return fail(400, { updateForm, form: updateForm });
        }

        // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            throw error(401, 'Non autorisé');
        }

        // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite getUserPermissions + requête shop)
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            throw error(403, 'Accès non autorisé à cette boutique');
        }

        // ✅ OPTIMISÉ : Vérifier le plan directement avec get_user_plan RPC (plus léger que getUserPermissions)
        const { data: plan, error: planError } = await locals.supabase.rpc('get_user_plan', {
            p_profile_id: userId,
            premium_product_id: STRIPE_PRODUCTS.PREMIUM,
            basic_product_id: STRIPE_PRODUCTS.BASIC,
            lifetime_product_id: STRIPE_PRODUCTS.LIFETIME
        });

        if (planError || !plan || (plan !== 'premium' && plan !== 'exempt')) {
            throw error(403, 'Accès refusé : fonctionnalité réservée aux plans Premium');
        }

        const updateFormData = await superValidate(formData, zod(updateCustomFormFormSchema));

        if (!updateFormData.valid) {
            return fail(400, { updateForm: updateFormData, form: updateFormData });
        }

        const customFields = updateFormData.data.customFields;
        const title = updateFormData.data.title;
        const description = updateFormData.data.description;

        if (!customFields || !Array.isArray(customFields)) {
            const updateForm = await superValidate(zod(updateCustomFormFormSchema));
            updateForm.message = 'Données du formulaire manquantes';
            return fail(400, { updateForm, form: updateForm });
        }

        try {
            // Récupérer le formulaire personnalisé existant ou en créer un nouveau
            const { data: existingForm, error: formCheckError } = await locals.supabase
                .from('forms')
                .select('id')
                .eq('shop_id', shopId)
                .eq('is_custom_form', true)
                .single();

            let formId: string;

            if (formCheckError && formCheckError.code === 'PGRST116') {
                // Créer un nouveau formulaire
                const { data: newForm, error: createError } = await locals.supabase
                    .from('forms')
                    .insert({
                        shop_id: shopId,
                        is_custom_form: true,
                        title: title || null,
                        description: description || null
                    })
                    .select('id')
                    .single();

                if (createError) {
                    const updateForm = await superValidate(zod(updateCustomFormFormSchema));
                    updateForm.message = 'Erreur lors de la création du formulaire';
                    return fail(400, { updateForm, form: updateForm });
                }

                formId = newForm.id;
            } else if (existingForm) {
                formId = existingForm.id;

                // Mettre à jour le titre et la description du formulaire existant
                const { error: updateFormError } = await locals.supabase
                    .from('forms')
                    .update({
                        title: title || null,
                        description: description || null
                    })
                    .eq('id', formId);

                if (updateFormError) {
                    const updateForm = await superValidate(zod(updateCustomFormFormSchema));
                    updateForm.message = 'Erreur lors de la mise à jour du formulaire';
                    return fail(400, { updateForm, form: updateForm });
                }
            } else {
                const updateForm = await superValidate(zod(updateCustomFormFormSchema));
                updateForm.message = 'Erreur lors de la récupération du formulaire';
                return fail(400, { updateForm, form: updateForm });
            }

            // Supprimer les anciens champs
            await locals.supabase
                .from('form_fields')
                .delete()
                .eq('form_id', formId);

            // Ajouter les nouveaux champs
            if (customFields.length > 0) {
                const formFields = customFields.map((field: any, index: number) => ({
                    form_id: formId,
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
                    const updateForm = await superValidate(zod(updateCustomFormFormSchema));
                    updateForm.message = 'Erreur lors de la mise à jour des champs';
                    return fail(400, { updateForm, form: updateForm });
                }
            }

            await forceRevalidateShop(shopSlug);

            // Retourner le formulaire pour Superforms
            const updateForm = await superValidate(zod(updateCustomFormFormSchema));
            updateForm.message = 'Formulaire personnalisé mis à jour avec succès';
            return { updateForm, form: updateForm };
        } catch (parseError) {
            const updateForm = await superValidate(zod(updateCustomFormFormSchema));
            updateForm.message = 'Erreur lors du traitement des données du formulaire';
            return fail(500, { updateForm, form: updateForm });
        }
    }
};