import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();
    if (!session) {
        error(401, 'Non autorisé');
    }

    const userId = session.user.id;

    // Get shop ID
    const { data: shop } = await locals.supabase
        .from('shops')
        .select('id')
        .eq('profile_id', userId)
        .single();

    if (!shop) {
        error(404, 'Boutique non trouvée');
    }

    // Load availabilities
    let { data: availabilities, error: availabilitiesError } = await locals.supabase
        .from('availabilities')
        .select('*')
        .eq('shop_id', shop.id)
        .order('day');

    if (availabilitiesError) {
        console.error('Error loading availabilities:', availabilitiesError);
        error(500, 'Erreur lors du chargement des disponibilités');
    }

    // Load unavailabilities
    const { data: unavailabilities, error: unavailabilitiesError } = await locals.supabase
        .from('unavailabilities')
        .select('*')
        .eq('shop_id', shop.id)
        .gte('end_date', new Date().toISOString().split('T')[0]) // Only future dates
        .order('start_date');

    if (unavailabilitiesError) {
        console.error('Error loading unavailabilities:', unavailabilitiesError);
        error(500, 'Erreur lors du chargement des indisponibilités');
    }

    return {
        availabilities: availabilities || [],
        unavailabilities: unavailabilities || [],
        shopId: shop.id
    };
};

export const actions: Actions = {
    updateAvailability: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;

        const formData = await request.formData();
        const availabilityId = formData.get('availabilityId') as string;
        const isAvailable = formData.get('isAvailable') === 'true';

        // Get shop ID for security
        const { data: shop } = await locals.supabase
            .from('shops')
            .select('id')
            .eq('profile_id', userId)
            .single();

        if (!shop) {
            return { success: false, error: 'Boutique non trouvée' };
        }

        // Verify the availability belongs to this shop
        const { data: availability } = await locals.supabase
            .from('availabilities')
            .select('shop_id')
            .eq('id', availabilityId)
            .single();

        if (!availability || availability.shop_id !== shop.id) {
            return { success: false, error: 'Disponibilité non trouvée' };
        }

        // Update availability
        const { error: updateError } = await locals.supabase
            .from('availabilities')
            .update({
                is_open: isAvailable
            })
            .eq('id', availabilityId);

        if (updateError) {
            console.error('Error updating availability:', updateError);
            return { success: false, error: 'Erreur lors de la mise à jour' };
        }

        return { success: true };
    },

    addUnavailability: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;

        const formData = await request.formData();
        const startDate = formData.get('startDate') as string;
        const endDate = formData.get('endDate') as string;

        // Get shop ID
        const { data: shop } = await locals.supabase
            .from('shops')
            .select('id')
            .eq('profile_id', userId)
            .single();

        if (!shop) {
            return { success: false, error: 'Boutique non trouvée' };
        }

        // Validate dates
        if (!startDate || !endDate) {
            return { success: false, error: 'Dates requises' };
        }

        if (new Date(startDate) > new Date(endDate)) {
            return { success: false, error: 'La date de début doit être antérieure à la date de fin' };
        }

        // Check for overlapping dates
        const { data: existingUnavailabilities } = await locals.supabase
            .from('unavailabilities')
            .select('start_date, end_date')
            .eq('shop_id', shop.id);

        if (existingUnavailabilities) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            const hasOverlap = existingUnavailabilities.some(unavailability => {
                const existingStart = new Date(unavailability.start_date);
                const existingEnd = new Date(unavailability.end_date);

                return (start <= existingEnd && end >= existingStart);
            });

            if (hasOverlap) {
                return { success: false, error: 'Période non disponible' };
            }
        }

        // Add unavailability
        const { error: insertError } = await locals.supabase
            .from('unavailabilities')
            .insert({
                shop_id: shop.id,
                start_date: startDate,
                end_date: endDate
            });

        if (insertError) {
            console.error('Error adding unavailability:', insertError);
            return { success: false, error: 'Erreur lors de l\'ajout de l\'indisponibilité' };
        }

        return { success: true };
    },

    deleteUnavailability: async ({ request, locals }) => {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return { success: false, error: 'Non autorisé' };
        }

        const userId = session.user.id;

        const formData = await request.formData();
        const unavailabilityId = formData.get('unavailabilityId') as string;

        // Get shop ID for security
        const { data: shop } = await locals.supabase
            .from('shops')
            .select('id')
            .eq('profile_id', userId)
            .single();

        if (!shop) {
            return { success: false, error: 'Boutique non trouvée' };
        }

        // Verify the unavailability belongs to this shop
        const { data: unavailability } = await locals.supabase
            .from('unavailabilities')
            .select('shop_id')
            .eq('id', unavailabilityId)
            .single();

        if (!unavailability || unavailability.shop_id !== shop.id) {
            return { success: false, error: 'Indisponibilité non trouvée' };
        }

        // Delete unavailability
        const { error: deleteError } = await locals.supabase
            .from('unavailabilities')
            .delete()
            .eq('id', unavailabilityId);

        if (deleteError) {
            console.error('Error deleting unavailability:', deleteError);
            return { success: false, error: 'Erreur lors de la suppression' };
        }

        return { success: true };
    }
};
