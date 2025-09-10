import { error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { getUserPermissions } from '$lib/auth';
import { incrementCatalogVersion } from '$lib/utils/catalog';
import { toggleCustomRequestsFormSchema, updateCustomFormFormSchema } from './schema';

export const load: PageServerLoad = async ({ locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();

    if (!user) {
        throw error(401, 'Non autorisé');
    }

    // Vérifier les permissions
    const permissions = await getUserPermissions(user.id, locals.supabase);





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
            // Compat temporaire
            form: toggleForm
        };
    }

    // Get shop_id for this user
    if (!permissions.shopId) {
        throw error(400, 'Boutique non trouvée');
    }

    // Récupérer les informations de la boutique
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('id, slug, is_custom_accepted')
        .eq('id', permissions.shopId)
        .single();

    if (shopError) {
        throw error(500, 'Erreur lors du chargement des informations de la boutique');
    }

    // Récupérer le formulaire personnalisé existant s'il y en a un
    const { data: customForm, error: formError } = await locals.supabase
        .from('forms')
        .select('id, is_custom_form, title, description')
        .eq('shop_id', permissions.shopId)
        .eq('is_custom_form', true)
        .single();

    if (formError && formError.code !== 'PGRST116') {
        throw error(500, 'Erreur lors du chargement du formulaire personnalisé');
    }

    // Récupérer les champs du formulaire s'il existe
    let customFields: any[] = [];
    if (customForm) {
        const { data: formFields, error: fieldsError } = await locals.supabase
            .from('form_fields')
            .select('*')
            .eq('form_id', customForm.id)
            .order('order');

        if (fieldsError) {
            throw error(500, 'Erreur lors du chargement des champs du formulaire');
        }

        customFields = formFields || [];
    }

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
        const { data: { user } } = await locals.supabase.auth.getUser();
        const userId = user?.id;

        if (!userId) {
            throw error(401, 'Non autorisé');
        }

        // Vérifier les permissions
        const permissions = await getUserPermissions(userId, locals.supabase);

        if (!permissions.canManageCustomForms) {
            throw error(403, 'Accès refusé');
        }

        // Get shop_id for this user
        if (!permissions.shopId) {
            throw error(400, 'Boutique non trouvée');
        }

        const toggleFormData = await superValidate(request, zod(toggleCustomRequestsFormSchema));

        if (!toggleFormData.valid) {
            return { toggleForm: toggleFormData, form: toggleFormData };
        }

        const isCustomAccepted = toggleFormData.data.isCustomAccepted;

        try {
            const { error: updateError } = await locals.supabase
                .from('shops')
                .update({ is_custom_accepted: isCustomAccepted })
                .eq('id', permissions.shopId);

            if (updateError) {
                const toggleForm = await superValidate(zod(toggleCustomRequestsFormSchema));
                toggleForm.message = 'Erreur lors de la mise à jour des paramètres';
                return { toggleForm, form: toggleForm };
            }

            // Increment catalog version to invalidate public cache
            try {
                await incrementCatalogVersion(locals.supabase, permissions.shopId);
            } catch (error) {
                // Don't fail the entire operation, just log the warning
            }

            // Retourner le formulaire pour Superforms
            const toggleForm = await superValidate(zod(toggleCustomRequestsFormSchema));
            toggleForm.message = isCustomAccepted
                ? 'Demandes personnalisées activées'
                : 'Demandes personnalisées désactivées';
            return { toggleForm, form: toggleForm };
        } catch (err) {
            const toggleForm = await superValidate(zod(toggleCustomRequestsFormSchema));
            toggleForm.message = 'Erreur inattendue lors de la mise à jour';
            return { toggleForm, form: toggleForm };
        }
    },

    updateCustomForm: async ({ request, locals }) => {
        const { data: { user } } = await locals.supabase.auth.getUser();
        const userId = user?.id;

        if (!userId) {
            throw error(401, 'Non autorisé');
        }

        // Vérifier les permissions
        const permissions = await getUserPermissions(userId, locals.supabase);


        if (!permissions.canManageCustomForms) {
            throw error(403, 'Accès refusé');
        }

        // Get shop_id for this user
        if (!permissions.shopId) {
            throw error(400, 'Boutique non trouvée');
        }

        const updateFormData = await superValidate(request, zod(updateCustomFormFormSchema));

        if (!updateFormData.valid) {
            return { updateForm: updateFormData, form: updateFormData };
        }

        const customFields = updateFormData.data.customFields;
        const title = updateFormData.data.title;
        const description = updateFormData.data.description;

        if (!customFields || !Array.isArray(customFields)) {
            const updateForm = await superValidate(zod(updateCustomFormFormSchema));
            updateForm.message = 'Données du formulaire manquantes';
            return { updateForm, form: updateForm };
        }

        try {
            // Récupérer le formulaire personnalisé existant ou en créer un nouveau
            const { data: existingForm, error: formCheckError } = await locals.supabase
                .from('forms')
                .select('id')
                .eq('shop_id', permissions.shopId)
                .eq('is_custom_form', true)
                .single();

            let formId: string;

            if (formCheckError && formCheckError.code === 'PGRST116') {
                // Créer un nouveau formulaire
                const { data: newForm, error: createError } = await locals.supabase
                    .from('forms')
                    .insert({
                        shop_id: permissions.shopId,
                        is_custom_form: true,
                        title: title || null,
                        description: description || null
                    })
                    .select('id')
                    .single();

                if (createError) {
                    const updateForm = await superValidate(zod(updateCustomFormFormSchema));
                    updateForm.message = 'Erreur lors de la création du formulaire';
                    return { updateForm, form: updateForm };
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
                    return { updateForm, form: updateForm };
                }
            } else {
                const updateForm = await superValidate(zod(updateCustomFormFormSchema));
                updateForm.message = 'Erreur lors de la récupération du formulaire';
                return { updateForm, form: updateForm };
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
                    return { updateForm, form: updateForm };
                }
            }

            // Increment catalog version to invalidate public cache
            try {
                await incrementCatalogVersion(locals.supabase, permissions.shopId);
            } catch (error) {
                // Don't fail the entire operation, just log the warning
            }

            // Retourner le formulaire pour Superforms
            const updateForm = await superValidate(zod(updateCustomFormFormSchema));
            updateForm.message = 'Formulaire personnalisé mis à jour avec succès';
            return { updateForm, form: updateForm };
        } catch (parseError) {
            const updateForm = await superValidate(zod(updateCustomFormFormSchema));
            updateForm.message = 'Erreur lors du traitement des données du formulaire';
            return { updateForm, form: updateForm };
        }
    }
};
