import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
    try {
        const { slug, id: orderId } = params;

        // Récupérer hasPolicies depuis le layout parent
        const { hasPolicies } = await parent();

        // Validation : vérifier que orderId est un UUID valide
        // Cela évite les erreurs si sw.js ou d'autres fichiers sont routés par erreur
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(orderId)) {
            console.error('❌ Invalid order ID format:', orderId);
            throw error(404, 'Commande non trouvée');
        }

        // ✅ OPTIMISÉ : Charger order avec relation shops (shop déjà inclus)
        // Chercher la commande par son ID avec vérification du slug
        const { data: order, error: orderError } = await (locals.supabaseServiceRole as any)
            .from('orders')
            .select('id, status, customer_name, customer_email, customer_phone, customer_instagram, pickup_date, pickup_time, chef_pickup_date, chef_pickup_time, chef_message, customization_data, product_name, product_base_price, additional_information, total_amount, paid_amount, order_ref, inspiration_photos, created_at, shops!inner(slug, name, logo_url, instagram, tiktok, website), product_id')
            .eq('id', orderId)
            .eq('shops.slug', slug)
            .single();

        if (orderError) {
            console.error('Error fetching order:', orderError);
            throw error(404, 'Commande non trouvée');
        }

        // Check that order is not null after all attempts
        if (!order) {
            throw error(404, 'Commande non trouvée');
        }

        // Les customizations sont chargées dans le layout parent

        // Determine the type of order
        const orderType = order.product_id ? 'product_order' : 'custom_order';

        // Récupérer le produit pour obtenir le pourcentage d'acompte (si c'est une commande produit)
        let product = null;
        if (order.product_id) {
            const { data: productData } = await (locals.supabaseServiceRole as any)
                .from('products')
                .select('deposit_percentage')
                .eq('id', order.product_id)
                .single();
            product = productData;
        }

        return {
            order,
            orderType,
            product,
            session: null, // No session for this approach
            hasPolicies: hasPolicies || false,
        };

    } catch (err) {
        // Si c'est déjà une erreur HTTP, la relancer
        if (err && typeof err === 'object' && 'status' in err) {
            throw err;
        }
        throw error(500, 'Erreur inattendue lors du chargement de la commande');
    }
};
