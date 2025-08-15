import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return json({ error: 'ID de commande manquant' }, { status: 400 });
        }

        // Récupérer la commande
        const { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return json({ error: 'Commande non trouvée' }, { status: 404 });
        }

        // Vérifier que c'est une commande custom avec statut "quoted"
        if (order.product_id || order.status !== 'quoted') {
            return json({ error: 'Commande invalide' }, { status: 400 });
        }

        // Mettre à jour le statut de la commande
        const { error: updateError } = await locals.supabase
            .from('orders')
            .update({
                status: 'refused',
                refused_by: 'client',
            })
            .eq('id', orderId);

        if (updateError) {
            console.error('Erreur mise à jour commande:', updateError);
            return json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
        }

        return json({ success: true });
    } catch (error) {
        console.error('Erreur refus devis:', error);
        return json({ error: 'Erreur interne' }, { status: 500 });
    }
}; 