import { error as svelteError, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { getUserPermissions } from '$lib/auth';
import { addUnavailabilityFormSchema } from './schema';

export const load: PageServerLoad = async ({ locals, parent }) => {
    // ✅ OPTIMISÉ : Réutiliser user du layout
    const { user } = await parent();

    if (!user) {
        throw redirect(302, '/login');
    }

    // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données disponibilités
    const { data: availabilityData, error } = await locals.supabase.rpc('get_availability_data', {
        p_profile_id: user.id
    });

    if (error) {
        console.error('Error fetching availability data:', error);
        throw svelteError(500, 'Erreur lors du chargement des données');
    }

    const { availabilities, unavailabilities, shopId } = availabilityData;

    if (!shopId) {
        throw svelteError(400, 'Boutique non trouvée');
    }

    return {
        availabilities: availabilities || [],
        unavailabilities: unavailabilities || [],
        shopId: shopId,
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
        const dailyOrderLimitRaw = formData.get('dailyOrderLimit') as string;
        const dailyOrderLimit = dailyOrderLimitRaw ? parseInt(dailyOrderLimitRaw) : null;
        const startTime = formData.get('startTime') as string || null;
        const endTime = formData.get('endTime') as string || null;
        const intervalTime = formData.get('intervalTime') as string || null;


        if (!availabilityId) {
            throw error(400, 'ID de disponibilité requis');
        }

        // Verify the availability belongs to this shop
        const { data: availability } = await locals.supabase
            .from('availabilities')
            .select('shop_id, is_open, daily_order_limit')
            .eq('id', availabilityId)
            .single();

        if (!availability || availability.shop_id !== permissions.shopId) {
            throw error(404, 'Disponibilité non trouvée');
        }


        // Update availability
        const { error: updateError } = await locals.supabase
            .from('availabilities')
            .update({
                is_open: isAvailable,
                daily_order_limit: dailyOrderLimit,
                start_time: startTime,
                end_time: endTime,
                interval_time: intervalTime
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
