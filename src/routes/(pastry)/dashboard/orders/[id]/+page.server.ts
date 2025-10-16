import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/auth';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import Stripe from 'stripe';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { makeQuoteFormSchema, rejectOrderFormSchema, personalNoteFormSchema } from './schema.js';
import { EmailService } from '$lib/services/email-service';


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

        // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données de commande
        const { data: orderDetailData, error } = await locals.supabase.rpc('get_order_detail_data', {
            p_order_id: params.id,
            p_profile_id: user.id
        });

        if (error) {
            console.error('Error fetching order detail data:', error);
            throw error(404, 'Commande non trouvée');
        }

        const { order, personalNote, shop } = orderDetailData;

        if (!order || !shop) {
            throw error(404, 'Commande non trouvée');
        }

        // Récupérer le montant payé depuis la DB
        const paidAmount = order.paid_amount;

        // Initialiser les formulaires Superforms
        const makeQuoteForm = await superValidate(zod(makeQuoteFormSchema));
        const rejectOrderForm = await superValidate(zod(rejectOrderFormSchema));
        const personalNoteForm = await superValidate(
            zod(personalNoteFormSchema),
            {
                defaults: {
                    note: personalNote?.note || ''
                }
            }
        );

        return {
            order,
            shop,
            paidAmount,
            personalNote: personalNote || null,
            makeQuoteForm,
            rejectOrderForm,
            personalNoteForm
        };
    } catch (err) {
        throw err;
    }
};

export const actions: Actions = {
    // Sauvegarder/modifier la note personnelle
    savePersonalNote: async ({ request, params, locals }) => {
        try {
            // Valider avec Superforms
            const form = await superValidate(request, zod(personalNoteFormSchema));

            if (!form.valid) {
                return fail(400, { form });
            }

            const { note } = form.data;

            if (!note || !note.trim()) {
                return fail(400, { form, error: 'La note ne peut pas être vide' });
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
                return fail(500, { error: 'Erreur lors de la sauvegarde' });
            }

            // Retourner le succès avec le formulaire Superforms
            form.message = 'Note sauvegardée avec succès';
            return { form };
        } catch (err) {
            return fail(500, { error: 'Erreur serveur' });
        }
    },

    // Faire un devis pour une commande en attente
    makeQuote: async ({ request, params, locals }) => {
        try {
            // Valider avec Superforms
            const form = await superValidate(request, zod(makeQuoteFormSchema));

            if (!form.valid) {
                return fail(400, { form });
            }

            const { price, chef_message: chefMessage, chef_pickup_date: chefPickupDate, chef_pickup_time: chefPickupTime } = form.data;

            if (!price) {
                return fail(400, { form, error: 'Le prix est requis' });
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
                .select('id, name, logo_url, slug')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Générer un order_ref unique pour le paiement du devis
            const { data: orderRefData, error: orderRefError } = await locals.supabase
                .rpc('generate_order_ref');

            if (orderRefError || !orderRefData) {
                console.error('Error generating order_ref:', orderRefError);
                return fail(500, { form, error: 'Erreur lors de la génération de la référence' });
            }

            const order_ref = orderRefData;
            console.log('🆔 [Make Quote] Generated order_ref:', order_ref);

            // Mettre à jour la commande
            const updateData: {
                status: 'quoted';
                total_amount: number;
                chef_message: string | null;
                chef_pickup_date?: string;
                chef_pickup_time?: string;
                order_ref: string;
            } = {
                status: 'quoted',
                total_amount: price,
                chef_message: chefMessage || null,
                order_ref: order_ref
            };

            // Ajouter la nouvelle date de récupération si fournie
            if (chefPickupDate) {
                updateData.chef_pickup_date = chefPickupDate;
            }

            // Ajouter la nouvelle heure de récupération si fournie
            if (chefPickupTime) {
                updateData.chef_pickup_time = chefPickupTime;
            }

            const { data: order, error: updateError } = await locals.supabase
                .from('orders')
                .update(updateData)
                .eq('id', params.id)
                .eq('shop_id', shop.id)
                .select()
                .single();

            if (updateError) {
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            try {
                await Promise.all([
                    EmailService.sendQuote({
                        customerEmail: order.customer_email,
                        customerName: order.customer_name,
                        shopName: shop.name,
                        shopLogo: shop.logo_url || undefined,
                        quoteId: order.id.slice(0, 8),
                        orderUrl: `${PUBLIC_SITE_URL}/${shop.slug}/custom/checkout/${order_ref}`,
                        date: new Date().toLocaleDateString("fr-FR")
                    })]);
            } catch (e) { }

            // Retourner le succès avec le formulaire Superforms
            form.message = 'Devis envoyé avec succès';
            return { form };
        } catch (err) {
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Refuser une commande
    rejectOrder: async ({ request, params, locals }) => {
        try {
            // Valider avec Superforms
            const form = await superValidate(request, zod(rejectOrderFormSchema));

            if (!form.valid) {
                return fail(400, { form });
            }

            const { chef_message: chefMessage } = form.data;

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
                .select('id, name, logo_url, slug')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Mettre à jour la commande
            const { data: order, error: updateError } = await locals.supabase
                .from('orders')
                .update({
                    status: 'refused',
                    chef_message: chefMessage || null,
                    refused_by: 'pastry_chef'
                })
                .eq('id', params.id)
                .eq('shop_id', shop.id)
                .select()
                .single();

            if (updateError) {
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            try {
                await Promise.all([
                    EmailService.sendRequestRejected({
                        customerEmail: order.customer_email,
                        customerName: order.customer_name,
                        shopName: shop.name,
                        shopLogo: shop.logo_url || undefined,
                        reason: chefMessage,
                        requestId: order.id.slice(0, 8),
                        catalogUrl: `${PUBLIC_SITE_URL}/${shop.slug}`,
                        date: new Date().toLocaleDateString("fr-FR")
                    })]);
            } catch (e) { }

            // Retourner le succès avec le formulaire Superforms
            form.message = 'Commande refusée avec succès';
            return { form };
        } catch (err) {
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Confirmer la réception du paiement PayPal.me
    confirmPayment: async ({ params, locals }) => {
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

            // Récupérer les détails de la commande avant mise à jour
            const { data: order, error: orderError } = await locals.supabase
                .from('orders')
                .select('*, shops(name, logo_url, slug)')
                .eq('id', params.id)
                .eq('shop_id', shop.id)
                .eq('status', 'to_verify')
                .single();

            if (orderError || !order) {
                console.error('Error fetching order:', orderError);
                return fail(404, { error: 'Commande non trouvée ou déjà confirmée' });
            }

            // Mettre à jour la commande : passer de 'to_verify' à 'confirmed'
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'confirmed' })
                .eq('id', params.id)
                .eq('shop_id', shop.id)
                .eq('status', 'to_verify');

            if (updateError) {
                console.error('Error confirming payment:', updateError);
                return fail(500, { error: 'Erreur lors de la confirmation du paiement' });
            }

            console.log('✅ Payment confirmed for order:', params.id);

            // Envoyer un email de confirmation au client
            try {
                const totalAmount = order.total_amount || 0;
                const paidAmount = order.paid_amount || totalAmount / 2;
                const remainingAmount = totalAmount - paidAmount;

                await EmailService.sendOrderConfirmation({
                    customerEmail: order.customer_email,
                    customerName: order.customer_name,
                    shopName: order.shops.name,
                    shopLogo: order.shops.logo_url,
                    productName: order.product_name || 'Commande personnalisée',
                    pickupDate: order.pickup_date,
                    pickupTime: order.pickup_time,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    remainingAmount: remainingAmount,
                    orderId: order.id,
                    orderUrl: `${PUBLIC_SITE_URL}/${order.shops.slug}/order/${order.id}`,
                    date: new Date().toLocaleDateString('fr-FR')
                });

                console.log('✅ Confirmation email sent to client');
            } catch (emailError) {
                console.error('❌ Email error:', emailError);
                // Ne pas bloquer si l'email échoue
            }

            return { message: 'Paiement confirmé avec succès' };
        } catch (err) {
            console.error('Error confirming payment:', err);
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
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande marquée comme prête' };
        } catch (err) {
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
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande marquée comme terminée' };
        } catch (err) {
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
                .select('id, name, logo_url, slug')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Vérifier que la commande a le statut "quoted"
            const { data: order, error: orderError } = await locals.supabase
                .from('orders')
                .select('id, status, customer_email, customer_name')
                .eq('id', params.id)
                .eq('shop_id', shop.id)
                .single();

            if (orderError || !order) {
                return fail(404, { error: 'Commande non trouvée' });
            }

            if (order.status !== 'quoted') {
                return fail(400, { error: 'Seules les commandes avec devis non payé peuvent être annulées' });
            }

            // Mettre à jour la commande
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'refused', refused_by: 'pastry_chef' })
                .eq('id', params.id)
                .eq('shop_id', shop.id);

            if (updateError) {
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            try {
                await Promise.all([
                    EmailService.sendOrderCancelled({
                        customerEmail: order.customer_email,
                        customerName: order.customer_name,
                        shopName: shop.name,
                        shopLogo: shop.logo_url || undefined,
                        orderId: order.id.slice(0, 8),
                        orderUrl: `${PUBLIC_SITE_URL}/${shop.slug}/order/${order.id}`,
                        date: new Date().toLocaleDateString("fr-FR")
                    })]);
            } catch (e) { }

            return { message: 'Commande annulée avec succès' };
        } catch (err) {
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Supprimer la note personnelle
    deletePersonalNote: async ({ params, locals }) => {
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

            // Supprimer la note
            const { error: deleteError } = await locals.supabase
                .from('personal_order_notes')
                .delete()
                .eq('order_id', params.id)
                .eq('shop_id', shop.id);

            if (deleteError) {
                return fail(500, { error: 'Erreur lors de la suppression' });
            }

            return { success: true, message: 'Note supprimée avec succès' };
        } catch (err) {
            return fail(500, { error: 'Erreur serveur' });
        }
    }
};
