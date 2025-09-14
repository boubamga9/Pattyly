import { error, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { getUserPermissions } from '$lib/auth';
import { addUnavailabilityFormSchema } from './schema';

export const load: PageServerLoad = async ({ locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();

    if (!user) {
        throw redirect(302, '/login');
    }

    // Vérifier les permissions
    const permissions = await getUserPermissions(user.id, locals.supabase);


    // Récupérer l'ID de la boutique
    if (!permissions.shopId) {
        throw error(400, 'Boutique non trouvée');
    }

    // Load availabilities
    let { data: availabilities, error: availabilitiesError } = await locals.supabase
        .from('availabilities')
        .select('id, day, is_open')
        .eq('shop_id', permissions.shopId)
        .order('day');

    if (availabilitiesError) {
        throw error(500, 'Erreur lors du chargement des disponibilités');
    }

    // Load unavailabilities
    const { data: unavailabilities, error: unavailabilitiesError } = await locals.supabase
        .from('unavailabilities')
        .select('id, start_date, end_date')
        .eq('shop_id', permissions.shopId)
        .gte('end_date', new Date().toISOString().split('T')[0]) // Only future dates
        .order('start_date');

    if (unavailabilitiesError) {
        throw error(500, 'Erreur lors du chargement des indisponibilités');
    }

    return {
        availabilities: availabilities || [],
        unavailabilities: unavailabilities || [],
        shopId: permissions.shopId,
        form: await superValidate(zod(addUnavailabilityFormSchema), {
            defaults: {
                startDate: '',
                endDate: ''
            }
        })
    };
};

export const actions: Actions = {
    updateAvailability: async ({ request, locals }) => {
        const { data: { user } } = await locals.supabase.auth.getUser();

        if (!user) {
            throw error(401, 'Non autorisé');
        }

        const permissions = await getUserPermissions(user.id, locals.supabase);



        if (!permissions.shopId) {
            throw error(400, 'Boutique non trouvée');
        }

        const formData = await request.formData();
        const availabilityId = formData.get('availabilityId') as string;
        const isAvailableRaw = formData.get('isAvailable') as string;
        const isAvailable = isAvailableRaw === 'true';


        if (!availabilityId) {
            throw error(400, 'ID de disponibilité requis');
        }

        // Verify the availability belongs to this shop
        const { data: availability } = await locals.supabase
            .from('availabilities')
            .select('shop_id, is_open')
            .eq('id', availabilityId)
            .single();

        if (!availability || availability.shop_id !== permissions.shopId) {
            throw error(404, 'Disponibilité non trouvée');
        }


        // Update availability
        const { error: updateError } = await locals.supabase
            .from('availabilities')
            .update({
                is_open: isAvailable
            })
            .eq('id', availabilityId);

        if (updateError) {
            throw error(500, 'Erreur lors de la mise à jour');
        }


        // Retourner le formulaire pour Superforms
        const form = await superValidate(zod(addUnavailabilityFormSchema));
        form.message = 'Disponibilité mise à jour avec succès !';
        return { form };
    },

    addUnavailability: async ({ request, locals }) => {
        const { data: { user } } = await locals.supabase.auth.getUser();

        if (!user) {
            throw error(401, 'Non autorisé');
        }

        const permissions = await getUserPermissions(user.id, locals.supabase);



        if (!permissions.shopId) {
            throw error(400, 'Boutique non trouvée');
        }

        // Valider le formulaire avec Superforms
        const form = await superValidate(request, zod(addUnavailabilityFormSchema));

        if (!form.valid) {
            return { form };
        }

        // Récupérer les périodes existantes pour la validation des chevauchements
        const { data: existingUnavailabilities } = await locals.supabase
            .from('unavailabilities')
            .select('start_date, end_date')
            .eq('shop_id', permissions.shopId);

        // Valider avec le schéma étendu (incluant les chevauchements)
        const validationForm = await superValidate(
            { ...form.data, existingUnavailabilities: existingUnavailabilities || [] },
            zod(addUnavailabilityFormSchema)
        );

        if (!validationForm.valid) {
            return { form: validationForm };
        }

        // Add unavailability
        const { error: insertError } = await locals.supabase
            .from('unavailabilities')
            .insert({
                shop_id: permissions.shopId,
                start_date: form.data.startDate,
                end_date: form.data.endDate
            });

        if (insertError) {
            throw error(500, 'Erreur lors de l\'ajout de l\'indisponibilité');
        }

        // Retourner le formulaire pour Superforms
        form.message = 'Indisponibilité ajoutée avec succès !';
        return { form };
    },

    deleteUnavailability: async ({ request, locals }) => {
        const { data: { user } } = await locals.supabase.auth.getUser();

        if (!user) {
            throw error(401, 'Non autorisé');
        }

        const permissions = await getUserPermissions(user.id, locals.supabase);

        if (!permissions.shopId) {
            throw error(400, 'Boutique non trouvée');
        }

        const formData = await request.formData();
        const unavailabilityId = formData.get('unavailabilityId') as string;

        if (!unavailabilityId) {
            throw error(400, 'ID d\'indisponibilité requis');
        }

        // Verify the unavailability belongs to this shop
        const { data: unavailability } = await locals.supabase
            .from('unavailabilities')
            .select('shop_id')
            .eq('id', unavailabilityId)
            .single();

        if (!unavailability || unavailability.shop_id !== permissions.shopId) {
            throw error(404, 'Indisponibilité non trouvée');
        }

        // Delete unavailability
        const { error: deleteError } = await locals.supabase
            .from('unavailabilities')
            .delete()
            .eq('id', unavailabilityId);

        if (deleteError) {
            throw error(500, 'Erreur lors de la suppression');
        }

        // Retourner le formulaire pour Superforms
        const form = await superValidate(zod(addUnavailabilityFormSchema));
        form.message = 'Indisponibilité supprimée avec succès !';
        return { form };
    }
};
