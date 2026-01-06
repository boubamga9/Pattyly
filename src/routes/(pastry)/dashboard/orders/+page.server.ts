import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { error as svelteError } from '@sveltejs/kit';
import { checkOrderLimit } from '$lib/utils/order-limits';

// Types
interface Order {
    id: string;
    customer_name: string;
    customer_email: string;
    pickup_date: string;
    pickup_time: string | null;
    status: string | null; // ✅ Permettre null pour correspondre à Supabase
    total_amount: number | null;
    product_name: string | null;
    additional_information: string | null;
    chef_message: string | null;
    created_at: string | null; // ✅ Permettre null pour correspondre à Supabase
    products?: { name: string; image_url: string | null } | null;
    chef_pickup_date: string | null;
    chef_pickup_time: string | null;
    is_pending?: boolean; // Flag pour identifier les pending_orders
    order_ref?: string | null; // Référence de commande
}

export const load: PageServerLoad = async ({ locals, parent }) => {
    try {
        // ✅ OPTIMISÉ : Utiliser user du parent (déjà chargé)
        const { user } = await parent();

        if (!user) {
            throw redirect(302, '/login');
        }

        // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données commandes
        const { data: ordersData, error } = await locals.supabase.rpc('get_orders_data', {
            p_profile_id: user.id
        });

        if (error) {
            console.error('Error fetching orders data:', error);
            throw svelteError(500, 'Erreur lors de la récupération des données');
        }

        const { orders, shop } = ordersData;

        if (!shop || !shop.id) {
            throw svelteError(404, 'Boutique non trouvée');
        }

        // Récupérer les pending_orders pour cette boutique
        const { data: pendingOrdersData, error: pendingError } = await locals.supabase
            .from('pending_orders')
            .select('*')
            .order('created_at', { ascending: false });

        // Transformer les pending_orders en format similaire aux commandes
        const pendingOrders: Order[] = [];
        if (pendingOrdersData) {
            // Récupérer tous les product_ids uniques pour optimiser les requêtes
            const productIds = new Set<string>();
            const pendingOrdersByShop: typeof pendingOrdersData = [];
            
            for (const pending of pendingOrdersData) {
                const orderData = pending.order_data as any;
                // Vérifier que cette pending_order appartient à cette boutique
                if (orderData?.shop_id === shop.id) {
                    pendingOrdersByShop.push(pending);
                    if (orderData.product_id) {
                        productIds.add(orderData.product_id);
                    }
                }
            }

            // Récupérer toutes les images de produits en une seule requête
            const productImagesMap = new Map<string, string | null>();
            if (productIds.size > 0) {
                const { data: products } = await locals.supabase
                    .from('products')
                    .select('id, image_url')
                    .in('id', Array.from(productIds));
                
                if (products) {
                    products.forEach(product => {
                        productImagesMap.set(product.id, product.image_url);
                    });
                }
            }

            // Transformer les pending_orders
            for (const pending of pendingOrdersByShop) {
                const orderData = pending.order_data as any;
                const productImage = orderData.product_id ? productImagesMap.get(orderData.product_id) || null : null;

                pendingOrders.push({
                    id: pending.id, // Utiliser l'id de pending_order
                    customer_name: orderData.customer_name || 'Client inconnu',
                    customer_email: orderData.customer_email || '',
                    pickup_date: orderData.pickup_date || new Date().toISOString(),
                    pickup_time: orderData.pickup_time || null,
                    status: 'non_finalisee', // Nouveau statut
                    total_amount: orderData.total_amount || null,
                    product_name: orderData.product_name || null,
                    additional_information: orderData.additional_information || null,
                    chef_message: null,
                    created_at: pending.created_at || new Date().toISOString(),
                    products: orderData.product_id ? {
                        name: orderData.product_name || null,
                        image_url: productImage
                    } : null,
                    chef_pickup_date: null,
                    chef_pickup_time: null,
                    is_pending: true, // Flag pour identifier les pending_orders
                    order_ref: pending.order_ref || null
                });
            }
        }

        // Séparer les commandes normales et les pending_orders
        // Les pending_orders ne doivent apparaître que dans le filtre "Non finalisée"
        const normalOrders = orders || [];

        // Grouper les commandes normales par date (pour l'affichage "Tout")
        const groupedOrders = groupOrdersByDate(normalOrders);

        // Compter les commandes normales par statut (sans les pending_orders)
        const statusCounts = getStatusCounts(normalOrders);
        
        // Ajouter le compte des pending_orders au statut "non_finalisee"
        statusCounts.non_finalisee = pendingOrders.length;

        // Récupérer les statistiques de limite de commandes
        let orderLimitStats = null;
        if (shop?.id) {
            orderLimitStats = await checkOrderLimit(shop.id, user.id, locals.supabaseServiceRole);
        }

        return {
            orders: normalOrders, // Commandes normales uniquement
            pendingOrders: pendingOrders, // Pending orders séparées
            groupedOrders,
            statusCounts,
            shop,
            orderLimitStats
        };
    } catch (err) {
        throw err;
    }
};

// Fonction pour grouper les commandes par date de livraison
function groupOrdersByDate(orders: Order[]) {
    const groups: Record<string, Order[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    orders.forEach((order) => {
        const pickupDate = new Date(order.pickup_date);
        pickupDate.setHours(0, 0, 0, 0);

        const dateKey = getDateKey(pickupDate, today);

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(order);
    });

    // Trier les groupes par ordre chronologique
    const sortedGroups: Record<string, Order[]> = {};
    const dateOrder = ['Aujourd\'hui', 'Demain', 'Dans 2 jours', 'Dans 3 jours', 'Dans 4 jours', 'Dans 5 jours', 'Dans 6 jours', 'Dans 1 semaine'];

    // Ajouter d'abord les groupes fixes dans l'ordre
    dateOrder.forEach(key => {
        if (groups[key]) {
            sortedGroups[key] = groups[key];
        }
    });

    // Ajouter les autres groupes (dates au-delà d'une semaine) dans l'ordre
    Object.keys(groups)
        .filter(key => !dateOrder.includes(key))
        .sort((a, b) => {
            // Trier les dates par ordre chronologique
            const aMatch = a.match(/Dans (\d+) semaine/);
            const bMatch = b.match(/Dans (\d+) semaine/);

            if (aMatch && bMatch) {
                return parseInt(aMatch[1]) - parseInt(bMatch[1]);
            }

            return 0;
        })
        .forEach(key => {
            sortedGroups[key] = groups[key];
        });

    return sortedGroups;
}

// Fonction pour obtenir la clé de date
function getDateKey(pickupDate: Date, today: Date): string {
    const diffTime = pickupDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Aujourd\'hui';
    } else if (diffDays === 1) {
        return 'Demain';
    } else if (diffDays === 2) {
        return 'Dans 2 jours';
    } else if (diffDays === 3) {
        return 'Dans 3 jours';
    } else if (diffDays === 4) {
        return 'Dans 4 jours';
    } else if (diffDays === 5) {
        return 'Dans 5 jours';
    } else if (diffDays === 6) {
        return 'Dans 6 jours';
    } else if (diffDays === 7) {
        return 'Dans 1 semaine';
    } else {
        // Au-delà d'une semaine, afficher la date complète
        return pickupDate.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

// Fonction pour compter les commandes par statut
function getStatusCounts(orders: Order[]) {
    const counts: Record<string, number> = {
        all: orders.length,
        to_verify: 0,
        pending: 0,
        quoted: 0,
        confirmed: 0,
        ready: 0,
        completed: 0,
        refused: 0,
        non_finalisee: 0 // Ajouter le nouveau statut
    };

    orders.forEach((order) => {
        // ✅ Gérer le cas où status est null
        if (order.status && counts[order.status] !== undefined) {
            counts[order.status]++;
        }
    });

    return counts;
}
