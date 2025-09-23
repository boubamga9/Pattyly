import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
});

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { orderId, shopSlug } = await request.json();

        if (!orderId || !shopSlug) {
            return json({ error: 'Données manquantes' }, { status: 400 });
        }

        // Récupérer la commande
        const { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .select('*, shops(name, slug)')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return json({ error: 'Commande non trouvée' }, { status: 404 });
        }

        // Vérifier que c'est une commande custom avec statut "quoted"
        if (order.product_id || order.status !== 'quoted') {
            return json({ error: 'Commande invalide' }, { status: 400 });
        }

        // Vérifier que le prix est défini
        if (!order.total_amount || order.total_amount <= 0) {
            return json({ error: 'Prix non défini' }, { status: 400 });
        }

        // Calculer l'acompte (50% du prix total)
        const depositAmount = Math.round(order.total_amount * 0.5 * 100); // Stripe utilise les centimes

        // Récupérer le compte Stripe Connect de la boutique
        const { data: stripeAccountData, error: stripeError } = await (locals.supabase as any)
            .rpc('get_stripe_connect_for_shop', { shop_uuid: order.shop_id });

        if (stripeError || !stripeAccountData || !Array.isArray(stripeAccountData) || stripeAccountData.length === 0) {
            return json({ error: 'Boutique non configurée pour les paiements' }, { status: 400 });
        }

        const stripeAccountId = stripeAccountData[0].stripe_account_id;

        // Créer la session Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Acompte - ${order.shops.name}`,
                            description: `Acompte de 50% pour la commande personnalisée`,
                        },
                        unit_amount: depositAmount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${request.headers.get('origin')}/${shopSlug}/order/{CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.headers.get('origin')}/${shopSlug}/order/${orderId}`,
            customer_email: order.customer_email,
            metadata: {
                type: 'custom_order_deposit',
                orderId: orderId,
                shopSlug: shopSlug,
                totalPrice: order.total_amount.toString(),
                depositAmount: depositAmount.toString(),
            },
            payment_intent_data: {
                //application_fee_amount: Math.round(depositAmount * 0.05), // 5% de frais pour Pattyly
                transfer_data: {
                    destination: stripeAccountId,
                },
            },
        });

        return json({ url: session.url });
    } catch (error) {
        return json({ error: 'Erreur interne' }, { status: 500 });
    }
}; 