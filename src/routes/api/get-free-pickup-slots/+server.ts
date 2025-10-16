import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { shop_id, pickup_date, start_time, end_time, interval_time } = await request.json();

        // Validation des paramètres
        if (!shop_id || !pickup_date || !start_time || !end_time || !interval_time) {
            return error(400, 'Paramètres manquants');
        }

        // Appeler le RPC pour récupérer les créneaux libres
        const { data: timeSlots, error: rpcError } = await locals.supabase.rpc('get_free_pickup_slot', {
            p_shop_id: shop_id,
            p_pickup_date: pickup_date,
            p_start_time: start_time,
            p_end_time: end_time,
            p_interval_time: interval_time
        });

        if (rpcError) {
            console.error('Erreur RPC get_free_pickup_slot:', rpcError);
            return error(500, 'Erreur lors de la récupération des créneaux');
        }

        return json({
            timeSlots: timeSlots || []
        });

    } catch (err) {
        console.error('Erreur dans get-free-pickup-slots:', err);
        return error(500, 'Erreur serveur');
    }
};
