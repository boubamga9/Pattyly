import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug, id: orderId } = params;

        // Get shop
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, logo_url, slug')
            .eq('slug', slug)
            .single();

        if (shopError) {
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!shop) {
            throw error(404, 'Boutique non trouvée');
        }

        // Try multiple ways to find the order:
        // 1. By stripe_session_id (Stripe product orders)
        // 2. By paypal_order_id (PayPal product orders)  
        // 3. By order id (custom orders)

        let { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .select('*, shops(slug, name, logo_url)')
            .eq('stripe_session_id', orderId)
            .eq('shop_id', shop.id)
            .single();

        // If not found by stripe_session_id, try by paypal_order_id
        if (orderError && orderError.code === 'PGRST116') {
            const { data: orderByPayPal, error: paypalError } = await locals.supabase
                .from('orders')
                .select('*, shops(slug, name, logo_url)')
                .eq('paypal_order_id', orderId)
                .eq('shop_id', shop.id)
                .single();

            if (!paypalError && orderByPayPal) {
                order = orderByPayPal;
                orderError = null;
            }
        }

        // If still not found, try by order_id (custom orders)
        if (orderError && orderError.code === 'PGRST116') {
            const { data: orderById, error: orderByIdError } = await locals.supabase
                .from('orders')
                .select('*, shops(slug, name, logo_url)')
                .eq('id', orderId)
                .eq('shop_id', shop.id)
                .single();

            if (orderByIdError) {
                throw error(404, 'Commande non trouvée');
            }

            order = orderById;
        } else if (orderError) {
            throw error(500, 'Erreur lors de la récupération de la commande');
        }

        // Check that order is not null after all attempts
        if (!order) {
            throw error(404, 'Commande non trouvée');
        }

        // Determine the type of order
        const orderType = order.product_id ? 'product_order' : 'custom_order';

        return {
            order,
            orderType,
            session: null // No session for this approach
        };

    } catch (err) {
        throw error(500, 'Erreur inattendue lors du chargement de la commande');
    }
};
