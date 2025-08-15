import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        console.log('=== LOAD ORDER PAGE ===');
        console.log('Slug:', params.slug);
        console.log('Order ID:', params.id);

        // Récupérer la boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, logo_url, slug')
            .eq('slug', params.slug)
            .single();

        if (shopError || !shop) {
            console.log('❌ Boutique non trouvée:', shopError);
            throw error(404, 'Boutique non trouvée');
        }

        console.log('✅ Boutique trouvée:', shop.name);

        // Essayer de récupérer la commande par session_id d'abord (commandes de produits)
        let { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .select('*, shops(slug, name, logo_url)')
            .eq('stripe_session_id', params.id)
            .eq('shop_id', shop.id)
            .single();

        // Si pas trouvé par session_id, essayer par order_id (commandes custom)
        if (orderError && orderError.code === 'PGRST116') {
            console.log('🔍 Commande non trouvée par session_id, essai par order_id...');

            const { data: orderById, error: orderByIdError } = await locals.supabase
                .from('orders')
                .select('*, shops(slug, name, logo_url)')
                .eq('id', params.id)
                .eq('shop_id', shop.id)
                .single();

            if (orderByIdError) {
                console.log('❌ Commande non trouvée par order_id:', orderByIdError);
                throw error(404, 'Commande non trouvée');
            }

            order = orderById;
        } else if (orderError) {
            console.log('❌ Erreur récupération commande:', orderError);
            throw error(500, 'Erreur lors de la récupération de la commande');
        }

        console.log('✅ Commande trouvée:', order.id);

        // Déterminer le type de commande
        const orderType = order.product_id ? 'product_order' : 'custom_order';

        return {
            order,
            orderType,
            session: null // Pas de session pour cette approche
        };
    } catch (err) {
        console.error('Erreur load order page:', err);
        throw err;
    }
};
