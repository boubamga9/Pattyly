import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return json({ error: 'ID de commande manquant' }, { status: 400 });
        }

        // Récupérer la commande
        const { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .select('id, customer_email, customer_name, product_id, status, shops(profiles(email))')
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
            return json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
        }

        await EmailService.sendQuoteRejected({
            pastryEmail: order.shops.profiles.email,
            customerEmail: order.customer_email,
            customerName: order.customer_name,
            quoteId: order.id,
            orderUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
            date: new Date().toLocaleDateString("fr-FR"),
        });

        return json({ success: true });
    } catch (error) {
        return json({ error: 'Erreur interne' }, { status: 500 });
    }
}; 