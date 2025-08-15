import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/permissions';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import Stripe from 'stripe';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        // Récupérer l'utilisateur connecté
        const {
            data: { user },
        } = await locals.supabase.auth.getUser();

        if (!user) {
            throw error(401, 'Non autorisé');
        }

        // Récupérer les permissions et l'ID de la boutique
        const permissions = await getUserPermissions(user.id, locals.supabase);
        const shopId = permissions.shopId;

        if (!shopId) {
            throw error(404, 'Boutique non trouvée');
        }

        // Récupérer la commande
        const { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .select(`
				*,
				products(name, description, image_url, base_price),
				shops(name, slug)
			`)
            .eq('id', params.id)
            .eq('shop_id', shopId)
            .single();

        if (orderError || !order) {
            throw error(404, 'Commande non trouvée');
        }

        // Récupérer le montant payé (priorité à la DB, fallback Stripe)
        let paidAmount = order.paid_amount;
        if (!paidAmount && order.stripe_payment_intent_id) {
            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
                paidAmount = paymentIntent.amount / 100; // Stripe stocke en centimes
            } catch (stripeError) {
                console.error('Erreur récupération Stripe:', stripeError);
                // On continue sans le montant Stripe
            }
        }

        // Récupérer la note personnelle
        const { data: personalNote, error: noteError } = await locals.supabase
            .from('personal_order_notes')
            .select('note, updated_at')
            .eq('order_id', params.id)
            .eq('shop_id', shopId)
            .single();

        if (noteError && noteError.code !== 'PGRST116') {
            console.error('Erreur récupération note:', noteError);
        }

        // Récupérer les informations de la boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, slug')
            .eq('id', shopId)
            .single();

        if (shopError || !shop) {
            throw error(404, 'Boutique non trouvée');
        }

        return {
            order,
            shop,
            paidAmount,
            personalNote: personalNote || null
        };
    } catch (err) {
        console.error('Erreur load order detail page:', err);
        throw err;
    }
};

export const actions: Actions = {
    // Sauvegarder/modifier la note personnelle
    savePersonalNote: async ({ request, params, locals }) => {
        try {
            const formData = await request.formData();
            const note = formData.get('note') as string;

            if (!note.trim()) {
                return fail(400, { error: 'La note ne peut pas être vide' });
            }

            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Insérer ou mettre à jour la note
            const { error: upsertError } = await locals.supabase
                .from('personal_order_notes')
                .upsert({
                    order_id: params.id,
                    shop_id: shop.id,
                    note: note.trim()
                }, {
                    onConflict: 'order_id,shop_id'
                });

            if (upsertError) {
                console.error('Erreur sauvegarde note:', upsertError);
                return fail(500, { error: 'Erreur lors de la sauvegarde' });
            }

            return { success: true };
        } catch (err) {
            console.error('Erreur savePersonalNote:', err);
            return fail(500, { error: 'Erreur serveur' });
        }
    },

    // Faire un devis pour une commande en attente
    makeQuote: async ({ request, params, locals }) => {
        try {
            const formData = await request.formData();
            const price = formData.get('price');
            const chefMessage = formData.get('chef_message') as string;
            const chefPickupDate = formData.get('chef_pickup_date') as string;

            if (!price) {
                return fail(400, { error: 'Le prix est requis' });
            }

            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Mettre à jour la commande
            const updateData: {
                status: 'quoted';
                price: number;
                chef_message: string | null;
                chef_pickup_date?: string;
            } = {
                status: 'quoted',
                price: parseFloat(price as string),
                chef_message: chefMessage || null
            };

            // Ajouter la nouvelle date de récupération si fournie
            if (chefPickupDate) {
                updateData.chef_pickup_date = chefPickupDate;
            }

            const { error: updateError } = await locals.supabase
                .from('orders')
                .update(updateData)
                .eq('id', params.id)
                .eq('shop_id', shop.id);

            if (updateError) {
                console.error('Erreur mise à jour commande:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Devis envoyé avec succès' };
        } catch (err) {
            console.error('Erreur makeQuote:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Refuser une commande
    rejectOrder: async ({ request, params, locals }) => {
        try {
            const formData = await request.formData();
            const chefMessage = formData.get('chef_message') as string;

            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Mettre à jour la commande
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({
                    status: 'refused',
                    chef_message: chefMessage || null,
                    refused_by: 'pastry_chef'
                })
                .eq('id', params.id)
                .eq('shop_id', shop.id);

            if (updateError) {
                console.error('Erreur mise à jour commande:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande refusée avec succès' };
        } catch (err) {
            console.error('Erreur rejectOrder:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Marquer une commande comme prête
    makeOrderReady: async ({ params, locals }) => {
        try {
            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Mettre à jour la commande
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'ready' })
                .eq('id', params.id)
                .eq('shop_id', shop.id);

            if (updateError) {
                console.error('Erreur mise à jour commande:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande marquée comme prête' };
        } catch (err) {
            console.error('Erreur makeOrderReady:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Marquer une commande comme terminée
    makeOrderCompleted: async ({ params, locals }) => {
        try {
            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Mettre à jour la commande
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'completed' })
                .eq('id', params.id)
                .eq('shop_id', shop.id);

            if (updateError) {
                console.error('Erreur mise à jour commande:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande marquée comme terminée' };
        } catch (err) {
            console.error('Erreur makeOrderCompleted:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Annuler une commande avec devis
    cancelOrder: async ({ params, locals }) => {
        try {
            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Vérifier que la commande a le statut "quoted"
            const { data: order, error: orderError } = await locals.supabase
                .from('orders')
                .select('status')
                .eq('id', params.id)
                .eq('shop_id', shop.id)
                .single();

            if (orderError || !order) {
                return fail(404, { error: 'Commande non trouvée' });
            }

            if (order.status !== 'quoted') {
                return fail(400, { error: 'Seules les commandes avec devis peuvent être annulées' });
            }

            // Mettre à jour la commande
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'refused', refused_by: 'pastry_chef' })
                .eq('id', params.id)
                .eq('shop_id', shop.id);

            if (updateError) {
                console.error('Erreur mise à jour commande:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande annulée avec succès' };
        } catch (err) {
            console.error('Erreur cancelOrder:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    }
};
