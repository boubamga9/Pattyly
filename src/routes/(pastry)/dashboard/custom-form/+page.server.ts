import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getShopId } from '$lib/permissions';

export const load: PageServerLoad = async ({ locals, parent }) => {
    const { userId, permissions } = await parent();

    // Debug: Afficher les permissions pour comprendre le problème
    console.log('🔧 Debug permissions:', {
        userId,
        plan: permissions.plan,
        canManageCustomForms: permissions.canManageCustomForms,
        canHandleCustomRequests: permissions.canHandleCustomRequests,
        allPermissions: permissions
    });

    // Vérifier si l'utilisateur peut gérer les formulaires personnalisés
    if (!permissions.canManageCustomForms) {
        console.log('❌ Accès refusé - canManageCustomForms:', permissions.canManageCustomForms);
        console.log('🔍 Plan actuel:', permissions.plan);
        console.log('🔍 Permissions complètes:', permissions);
        // Au lieu d'une erreur 403, on retourne les données pour afficher la page d'upgrade
        return {
            shop: null,
            customForm: null,
            customFields: [],
            permissions,
            needsUpgrade: true
        };
    }

    // Get shop_id for this user
    const shopId = await getShopId(userId, locals.supabase);

    if (!shopId) {
        throw error(500, 'Erreur lors du chargement de la boutique');
    }

    // Récupérer les informations de la boutique
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('id, is_custom_accepted')
        .eq('id', shopId)
        .single();

    if (shopError) {
        console.error('Error fetching shop:', shopError);
        throw error(500, 'Erreur lors du chargement des informations de la boutique');
    }

    // Récupérer le formulaire personnalisé existant s'il y en a un
    const { data: customForm, error: formError } = await locals.supabase
        .from('forms')
        .select('id, is_custom_form, title, description')
        .eq('shop_id', shopId)
        .eq('is_custom_form', true)
        .single();

    if (formError && formError.code !== 'PGRST116') {
        console.error('Error fetching custom form:', formError);
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
            console.error('Error fetching form fields:', fieldsError);
            throw error(500, 'Erreur lors du chargement des champs du formulaire');
        }

        customFields = formFields || [];
    }

    return {
        shop,
        customForm,
        customFields,
        permissions,
        needsUpgrade: false
    };
};

export const actions: Actions = {
    toggleCustomRequests: async ({ request, locals }) => {
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
        const isCustomAccepted = formData.get('isCustomAccepted') === 'true';

        try {
            const { error: updateError } = await locals.supabase
                .from('shops')
                .update({ is_custom_accepted: isCustomAccepted })
                .eq('id', shopId);

            if (updateError) {
                console.error('Error updating shop:', updateError);
                return fail(500, {
                    error: 'Erreur lors de la mise à jour des paramètres'
                });
            }

            return {
                message: isCustomAccepted
                    ? 'Demandes personnalisées activées'
                    : 'Demandes personnalisées désactivées'
            };
        } catch (err) {
            console.error('Unexpected error:', err);
            return fail(500, {
                error: 'Erreur inattendue lors de la mise à jour'
            });
        }
    },

    updateCustomForm: async ({ request, locals }) => {
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
        const customFieldsJson = formData.get('customFields') as string;
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;

        if (!customFieldsJson) {
            return fail(400, { error: 'Données du formulaire manquantes' });
        }

        try {
            const customFields = JSON.parse(customFieldsJson);

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
                    console.error('Error creating form:', createError);
                    return fail(500, {
                        error: 'Erreur lors de la création du formulaire'
                    });
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
                    console.error('Error updating form title/description:', updateFormError);
                    return fail(500, { error: 'Erreur lors de la mise à jour du formulaire' });
                }
            } else {
                return fail(500, { error: 'Erreur lors de la récupération du formulaire' });
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
                    console.error('Error updating form fields:', fieldsError);
                    return fail(500, {
                        error: 'Erreur lors de la mise à jour des champs'
                    });
                }
            }

            return { message: 'Formulaire personnalisé mis à jour avec succès' };
        } catch (parseError) {
            console.error('Error parsing custom fields:', parseError);
            return fail(400, {
                error: 'Erreur lors du traitement des données du formulaire'
            });
        }
    }
};
