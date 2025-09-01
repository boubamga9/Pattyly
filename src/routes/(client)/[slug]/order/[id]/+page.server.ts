import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug, id } = params;


        // Récupérer la boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, logo_url, slug')
            .eq('slug', params.slug)
            .single();

        if (shopError) {
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!shop) {

            throw error(404, 'Boutique non trouvée');
        }



        // Essayer de récupérer la commande par session_id d'abord (commandes de produits)
        let { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .select('*, shops(slug, name, logo_url)')
            .eq('stripe_session_id', params.id)
            .eq('shop_id', shop.id)
            .single();

        // Si pas trouvé par session_id, essayer par order_id (commandes custom)
        if (orderError && orderError.code === 'PGRST116') {


            const { data: orderById, error: orderByIdError } = await locals.supabase
                .from('orders')
                .select('*, shops(slug, name, logo_url)')
                .eq('id', params.id)
                .eq('shop_id', shop.id)
                .single();

            if (orderByIdError) {

                throw error(404, 'Commande non trouvée');
            }

            order = orderById;
        } else if (orderError) {

            throw error(500, 'Erreur lors de la récupération de la commande');
        }

        // Vérifier que order n'est pas null après toutes les tentatives
        if (!order) {

            throw error(404, 'Commande non trouvée');
        }



        // Déterminer le type de commande
        const orderType = order.product_id ? 'product_order' : 'custom_order';



        return {
            order,
            orderType,
            session: null // Pas de session pour cette approche
        };

    } catch (err) {
        throw error(500, 'Erreur inattendue lors du chargement de la commande');
    }
};
