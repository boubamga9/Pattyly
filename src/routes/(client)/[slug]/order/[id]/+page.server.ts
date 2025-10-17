import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug, id: orderId } = params;

        // Get shop
        const { data: shop, error: shopError } = await (locals.supabaseServiceRole as any)
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

        // Chercher la commande par son ID
        const { data: order, error: orderError } = await (locals.supabaseServiceRole as any)
            .from('orders')
            .select('id, status, customer_name, customer_email, customer_phone, customer_instagram, pickup_date, pickup_time, chef_pickup_date, chef_pickup_time, chef_message, customization_data, product_name, product_base_price, additional_information, total_amount, paid_amount, order_ref, inspiration_photos, created_at, shops(slug, name, logo_url), product_id')
            .eq('id', orderId)
            .eq('shop_id', shop.id)
            .single();

        if (orderError) {
            console.error('Error fetching order:', orderError);
            throw error(404, 'Commande non trouvée');
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
        // Si c'est déjà une erreur HTTP, la relancer
        if (err && typeof err === 'object' && 'status' in err) {
            throw err;
        }
        throw error(500, 'Erreur inattendue lors du chargement de la commande');
    }
};
