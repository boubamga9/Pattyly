import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { ErrorLogger } from '$lib/services/error-logging';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return json({ error: 'ID de commande manquant' }, { status: 400 });
        }

        // Récupérer la commande
        const { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .select('id, customer_email, customer_name, product_id, status, shops(profile_id)')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return json({ error: 'Commande non trouvée' }, { status: 404 });
        }

        // Récupérer l'email du profile séparément
        let pastryEmail: string | null = null;
        if (order.shops?.profile_id) {
            const { data: profile } = await locals.supabase
                .from('profiles')
                .select('email')
                .eq('id', order.shops.profile_id)
                .single();
            pastryEmail = profile?.email || null;
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
            await ErrorLogger.logCritical(updateError, {
                orderId: orderId,
            }, {
                action: 'rejectQuote',
                step: 'update_order_status',
            });
            return json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
        }

        if (pastryEmail) {
            try {
                await EmailService.sendQuoteRejected({
                    pastryEmail: pastryEmail,
                    customerEmail: order.customer_email,
                    customerName: order.customer_name,
                    quoteId: order.id,
                    orderUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                    date: new Date().toLocaleDateString("fr-FR"),
                });
            } catch (emailError) {
                await ErrorLogger.logCritical(emailError, {
                    orderId: orderId,
                    pastryEmail: pastryEmail,
                }, {
                    action: 'rejectQuote',
                    step: 'send_rejection_email',
                });
            }
        }

        return json({ success: true });
    } catch (error) {
        await ErrorLogger.logCritical(error, {
            orderId: orderId,
        }, {
            action: 'rejectQuote',
            step: 'general_error',
        });
        return json({ error: 'Erreur interne' }, { status: 500 });
    }
}; 