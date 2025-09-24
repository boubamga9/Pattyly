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

        // Validation des données
        if (!orderData.productId) {
            return json({ error: 'productId manquant' }, { status: 400 });
        }
        if (!orderData.shopId) {
            return json({ error: 'shopId manquant' }, { status: 400 });
        }
        if (!orderData.customerName) {
            return json({ error: 'customerName manquant' }, { status: 400 });
        }
        if (!orderData.customerEmail) {
            return json({ error: 'customerEmail manquant' }, { status: 400 });
        }
        if (!orderData.selectedDate) {
            return json({ error: 'selectedDate manquant' }, { status: 400 });
        }
        if (typeof orderData.totalPrice !== 'number' || orderData.totalPrice <= 0) {
            return json({ error: 'totalPrice invalide' }, { status: 400 });
        }


        // Récupérer les informations de la boutique et son compte Stripe Connect
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('profile_id')
            .eq('id', orderData.shopId)
            .single();

        if (shopError) {
            return json({ error: 'Erreur récupération boutique' }, { status: 400 });
        }


        if (!shop?.profile_id) {
            return json({ error: 'Boutique invalide' }, { status: 400 });
        }

        // Récupérer le compte Stripe Connect du profil via la fonction sécurisée
        const { data: stripeAccountData, error: stripeError } = await (locals.supabase as any)
            .rpc('get_stripe_connect_for_shop', { shop_uuid: orderData.shopId });

        if (stripeError) {
            console.error('Erreur lors de la récupération du compte Stripe:', stripeError);
            return json({ error: 'Compte Stripe non trouvé' }, { status: 400 });
        }

        if (!stripeAccountData || !Array.isArray(stripeAccountData) || stripeAccountData.length === 0) {
            return json({ error: 'Boutique non configurée pour les paiements' }, { status: 400 });
        }

        const stripeAccountId = stripeAccountData[0].stripe_account_id;

        // Log pour debug

        // Récupérer le prix du produit depuis la base de données pour la sécurité
        const { data: product, error: productError } = await locals.supabase
            .from('products')
            .select('base_price')
            .eq('id', orderData.productId)
            .single();

        if (productError || !product) {
            return json({ error: 'Produit non trouvé' }, { status: 404 });
        }

        // Calculer le prix total avec les options sélectionnées (DOUBLE CALCUL POUR LA SÉCURITÉ)
        let totalPrice = product.base_price;

        if (orderData.selectedOptions && Object.keys(orderData.selectedOptions).length > 0) {
            // Récupérer le formulaire de personnalisation du produit pour validation
            const { data: productForm } = await locals.supabase
                .from('products')
                .select('form_id')
                .eq('id', orderData.productId)
                .single();

            if (productForm?.form_id) {
                // Récupérer les champs de personnalisation pour validation
                const { data: customizationFields } = await locals.supabase
                    .from('form_fields')
                    .select('id, label, type, options')
                    .eq('form_id', productForm.form_id)
                    .order('order');

                if (customizationFields) {
                    // VALIDATION SÉCURISÉE : Vérifier que chaque option correspond à un champ valide
                    Object.entries(orderData.selectedOptions).forEach(([fieldId, fieldData]) => {
                        const field = customizationFields.find((f) => f.id === fieldId);
                        if (field && fieldData && typeof fieldData === 'object' && fieldData !== null) {
                            const fieldDataObj = fieldData as any;
                            // Vérifier que l'option sélectionnée existe dans la DB
                            if (field.type === 'single-select' && field.options && Array.isArray(field.options)) {
                                const validOption = field.options.find((opt: any) => opt.label === fieldDataObj.value);
                                if (validOption && typeof validOption === 'object' && validOption !== null) {
                                    const optionPrice = (validOption as any).price || 0;
                                    totalPrice += optionPrice;
                                }
                            } else if (field.type === 'multi-select' && fieldDataObj.values && Array.isArray(fieldDataObj.values) && field.options && Array.isArray(field.options)) {
                                // Multi-select : vérifier chaque valeur
                                fieldDataObj.values.forEach((optionData: any) => {
                                    const validOption = (field.options as any[]).find((opt: any) => opt.label === optionData.label);
                                    if (validOption && typeof validOption === 'object' && validOption !== null) {
                                        const optionPrice = (validOption as any).price || 0;
                                        totalPrice += optionPrice;
                                    }
                                });
                            }
                        }
                    });
                }
            }
        }


        // Calculer le montant de l'acompte (50%) avec le prix sécurisé
        const depositAmount = Math.round(totalPrice * 50); // Stripe utilise les centimes


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
        const origin = request.headers.get('origin');
        const successUrl = `${origin}/${shopData.slug}/order/{CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${origin}/${shopData.slug}/product/${orderData.productId}`;


        // Transformer les données de personnalisation (IDs → Labels avec métadonnées complètes)
        const transformedCustomizationData: Record<string, any> = {};
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
                    // Parcourir les options sélectionnées (qui ont maintenant des IDs comme clés)
                    Object.entries(orderData.selectedOptions).forEach(([fieldId, fieldData]) => {
                        const field = customizationFields.find((f) => f.id === fieldId);
                        if (field && fieldData) {
                            // Transformer en utilisant le label comme clé finale
                            transformedCustomizationData[field.label] = {
                                ...fieldData,           // Garder toutes les métadonnées existantes
                                fieldId: fieldId,       // Ajouter l'ID du champ pour la traçabilité
                                fieldType: field.type   // Ajouter le type du champ
                            };
                        }
                    });
                }
            }
        }


        // 🗄️ SAUVEGARDER LES DONNÉES COMPLÈTES DANS pending_orders
        const { data: pendingOrder, error: pendingOrderError } = await (locals.supabase as any)
            .from('pending_orders')
            .insert({
                order_data: {
                    ...orderData,
                    selectedOptions: transformedCustomizationData,
                    serverCalculatedPrice: totalPrice,
                    depositAmount: depositAmount
                }
            })
            .select('id')
            .single();

        if (pendingOrderError) {
            return json({ error: 'Erreur lors de la sauvegarde des données' }, { status: 500 });
        }


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
                orderId: (pendingOrder as any)?.id || 'unknown',
                cakeName: orderData.cakeName,
                depositAmount: depositAmount.toString(),
                type: 'product_order'
            },
            payment_intent_data: {
                //application_fee_amount: Math.round(depositAmount * 0.05), // 5% de frais pour Pattyly
                transfer_data: {
                    destination: stripeAccountId,
                },
            },
        });

        return json({ sessionUrl: session.url });
    } catch (error) {
        return json({ error: 'Erreur lors de la création de la session de paiement' }, { status: 500 });
    }
}; 