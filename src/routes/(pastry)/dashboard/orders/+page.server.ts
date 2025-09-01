import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/auth';

// Types
interface Order {
    id: string;
    customer_name: string;
    customer_email: string;
    pickup_date: string;
    status: string | null; // ✅ Permettre null pour correspondre à Supabase
    total_amount: number | null;
    product_name: string | null;
    additional_information: string | null;
    chef_message: string | null;
    created_at: string | null; // ✅ Permettre null pour correspondre à Supabase
    products?: { name: string; image_url: string | null } | null;
    chef_pickup_date: string | null;
}

export const load: PageServerLoad = async ({ locals }) => {
    try {
        // Récupérer l'utilisateur connecté
        const {
            data: { user },
        } = await locals.supabase.auth.getUser();

        if (!user) {
            throw redirect(302, '/login');
        }

        // Vérifier les permissions
        const permissions = await getUserPermissions(user.id, locals.supabase);

        if (!permissions.canAccessDashboard) {
            throw redirect(302, '/onboarding');
        }

        // Récupérer l'ID de la boutique
        if (!permissions.shopId) {
            throw error(400, 'Boutique non trouvée');
        }

        const shopId = permissions.shopId;

        // Récupérer les informations de la boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, slug')
            .eq('id', shopId)
            .single();

        if (shopError || !shop) {
            throw error(404, 'Boutique non trouvée');
        }

        // Récupérer toutes les commandes de la boutique
        const { data: orders, error: ordersError } = await locals.supabase
            .from('orders')
            .select(`
				id,
				customer_name,
				customer_email,
				pickup_date,
				status,
				total_amount,
				product_name,
				additional_information,
				chef_message,
				created_at,
				products(name, image_url),
				chef_pickup_date
			`)
            .eq('shop_id', shopId)
            .order('pickup_date', { ascending: true }); // ✅ Tri par date de récupération, de la plus proche à la plus lointaine

        if (ordersError) {
            throw error(500, 'Erreur lors de la récupération des commandes');
        }

        // Grouper les commandes par date
        const groupedOrders = groupOrdersByDate(orders || []);

        // Compter les commandes par statut
        const statusCounts = getStatusCounts(orders || []);

        return {
            orders: orders || [],
            groupedOrders,
            statusCounts,
            shop
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
        pending: 0,
        quoted: 0,
        confirmed: 0,
        ready: 0,
        completed: 0,
        refused: 0
    };

    orders.forEach((order) => {
        // ✅ Gérer le cas où status est null
        if (order.status && counts[order.status] !== undefined) {
            counts[order.status]++;
        }
    });

    return counts;
}
