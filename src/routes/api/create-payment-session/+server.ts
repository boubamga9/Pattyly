import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const orderData = await request.json();
        console.log('=== API CREATE PAYMENT SESSION ===');
        console.log('Données reçues:', JSON.stringify(orderData, null, 2));

        // Validation des données
        if (!orderData.productId) {
            console.log('❌ productId manquant');
            return json({ error: 'productId manquant' }, { status: 400 });
        }
        if (!orderData.shopId) {
            console.log('❌ shopId manquant');
            return json({ error: 'shopId manquant' }, { status: 400 });
        }
        if (!orderData.customerName) {
            console.log('❌ customerName manquant');
            return json({ error: 'customerName manquant' }, { status: 400 });
        }
        if (!orderData.customerEmail) {
            console.log('❌ customerEmail manquant');
            return json({ error: 'customerEmail manquant' }, { status: 400 });
        }
        if (!orderData.selectedDate) {
            console.log('❌ selectedDate manquant');
            return json({ error: 'selectedDate manquant' }, { status: 400 });
        }
        if (typeof orderData.totalPrice !== 'number' || orderData.totalPrice <= 0) {
            console.log('❌ totalPrice invalide:', orderData.totalPrice);
            return json({ error: 'totalPrice invalide' }, { status: 400 });
        }

        console.log('✅ Validation des données OK');

        // Récupérer les informations de la boutique et son compte Stripe Connect
        console.log('🔍 Récupération des infos boutique...');
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('profile_id')
            .eq('id', orderData.shopId)
            .single();

        if (shopError) {
            console.log('❌ Erreur récupération boutique:', shopError);
            return json({ error: 'Erreur récupération boutique' }, { status: 400 });
        }

        console.log('📊 Données boutique:', shop);

        if (!shop?.profile_id) {
            return json({ error: 'Boutique invalide' }, { status: 400 });
        }

        // Récupérer le compte Stripe Connect du profil
        console.log('🔍 Récupération du compte Stripe Connect...');
        const { data: stripeAccount, error: stripeError } = await locals.supabase
            .from('stripe_connect_accounts')
            .select('stripe_account_id')
            .eq('profile_id', shop.profile_id)
            .eq('is_active', true)
            .single();

        if (stripeError) {
            console.log('❌ Erreur récupération compte Stripe:', stripeError);
            return json({ error: 'Compte Stripe non trouvé' }, { status: 400 });
        }

        console.log('📊 Compte Stripe:', stripeAccount);

        if (!stripeAccount?.stripe_account_id) {
            return json({ error: 'Boutique non configurée pour les paiements' }, { status: 400 });
        }

        const stripeAccountId = stripeAccount.stripe_account_id;

        // Log pour debug
        console.log('🔍 Compte principal Pattyly:', stripeAccountId);
        console.log('🔍 Comptes Connect connus:', ['acct_1RteYnAokGuma9up', 'acct_1RtdxQAGwWDDWxQc']);

        // Calculer le montant de l'acompte (50%)
        const depositAmount = Math.round(orderData.totalPrice * 50); // Stripe utilise les centimes (totalPrice est déjà en euros)

        // Récupérer le slug de la boutique
        const { data: shopData } = await locals.supabase
            .from('shops')
            .select('slug')
            .eq('id', orderData.shopId)
            .single();

        if (!shopData?.slug) {
            return json({ error: 'Slug de boutique non trouvé' }, { status: 400 });
        }

        // Log pour debug
        const origin = request.headers.get('origin') || 'http://localhost:5176';
        const successUrl = `${origin}/${shopData.slug}/order/{CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${origin}/${shopData.slug}/product/${orderData.productId}`;

        console.log('🔗 URLs de redirection:');
        console.log('  - Origin:', origin);
        console.log('  - Success URL:', successUrl);
        console.log('  - Cancel URL:', cancelUrl);

        // Transformer les données de personnalisation (IDs → Labels avec prix)
        const transformedCustomizationData: Record<string, string | number | { value: string; price: number } | Array<{ value: string; price: number }>> = {};
        if (orderData.selectedOptions && Object.keys(orderData.selectedOptions).length > 0) {
            // Récupérer d'abord le formulaire de personnalisation du produit
            const { data: product } = await locals.supabase
                .from('products')
                .select('form_id')
                .eq('id', orderData.productId)
                .single();

            if (product?.form_id) {
                // Récupérer les champs de personnalisation pour mapper les IDs vers les labels
                const { data: customizationFields } = await locals.supabase
                    .from('form_fields')
                    .select('id, label, type, options')
                    .eq('form_id', product.form_id)
                    .order('order');

                if (customizationFields) {
                    customizationFields.forEach((field: { id: string; label: string; type: string; options?: Array<{ label: string; price?: number }> }) => {
                        const fieldValue = orderData.selectedOptions[field.id];
                        if (fieldValue) {
                            if (field.type === 'single-select') {
                                // Single-select : {value, price}
                                const selectedOption = field.options?.find((opt: any) => opt.label === fieldValue);
                                transformedCustomizationData[field.label] = {
                                    value: fieldValue,
                                    price: selectedOption?.price || 0
                                };
                            } else if (field.type === 'multi-select') {
                                // Multi-select : [{value, price}, ...]
                                if (Array.isArray(fieldValue)) {
                                    transformedCustomizationData[field.label] = fieldValue.map((selectedLabel: string) => {
                                        const selectedOption = field.options?.find((opt: any) => opt.label === selectedLabel);
                                        return {
                                            value: selectedLabel,
                                            price: selectedOption?.price || 0
                                        };
                                    });
                                }
                            } else if (field.type === 'number') {
                                // Number : valeur brute
                                transformedCustomizationData[field.label] = fieldValue;
                            } else {
                                // Text fields (short-text, long-text) : valeur brute
                                transformedCustomizationData[field.label] = fieldValue;
                            }
                        }
                    });
                }
            }
        }

        console.log('📝 Données de personnalisation transformées:', transformedCustomizationData);

        // Créer la session de paiement
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Acompte - ${orderData.cakeName}`,
                            description: `Acompte de 50% pour la commande de ${orderData.cakeName}`,
                        },
                        unit_amount: depositAmount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: orderData.customerEmail,
            metadata: {
                orderData: JSON.stringify({
                    ...orderData,
                    selectedOptions: transformedCustomizationData
                }),
                type: 'product_order'
            },
            payment_intent_data: {
                application_fee_amount: Math.round(depositAmount * 0.05), // 5% de frais pour Pattyly
                transfer_data: {
                    destination: stripeAccountId,
                },
            },
        });

        return json({ sessionUrl: session.url });
    } catch (error) {
        console.error('Erreur création session Stripe:', error);
        return json({ error: 'Erreur lors de la création de la session de paiement' }, { status: 500 });
    }
}; 