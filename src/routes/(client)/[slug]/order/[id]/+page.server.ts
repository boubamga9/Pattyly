import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug, id } = params;
        console.log('🔍 Loading order page:', { slug, id });

        // Récupérer la boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, logo_url, slug')
            .eq('slug', params.slug)
            .single();

        if (shopError) {
            console.error('❌ Database error fetching shop:', shopError);
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!shop) {
            console.log('⚠️ Shop not found:', slug);
            throw error(404, 'Boutique non trouvée');
        }

        console.log('✅ Shop found:', shop.id);

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

        // Vérifier que order n'est pas null après toutes les tentatives
        if (!order) {
            console.log('❌ Aucune commande trouvée après toutes les tentatives');
            throw error(404, 'Commande non trouvée');
        }

        console.log('✅ Commande trouvée:', order.id);

        // Déterminer le type de commande
        const orderType = order.product_id ? 'product_order' : 'custom_order';

        console.log('✅ Order page loaded successfully');

        return {
            order,
            orderType,
            session: null // Pas de session pour cette approche
        };

    } catch (err) {
        console.error('💥 Unexpected error in order load:', err);
        throw error(500, 'Erreur inattendue lors du chargement de la commande');
    }
};
