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
        console.log('💰 Prix de base du produit:', product.base_price);

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
                        if (field && fieldData && typeof fieldData === 'object') {
                            // Vérifier que l'option sélectionnée existe dans la DB
                            if (field.type === 'single-select' && field.options) {
                                const validOption = field.options.find((opt: any) => opt.label === fieldData.value);
                                if (validOption) {
                                    const optionPrice = validOption.price || 0;
                                    totalPrice += optionPrice;
                                    console.log(`💰 Option "${fieldData.label}" validée: +${optionPrice}€ (total: ${totalPrice}€)`);
                                } else {
                                    console.warn(`⚠️ Option invalide détectée: ${fieldData.value} pour le champ ${field.label}`);
                                }
                            } else if (field.type === 'multi-select' && fieldData.values && Array.isArray(fieldData.values)) {
                                // Multi-select : vérifier chaque valeur
                                fieldData.values.forEach((optionData: any) => {
                                    const validOption = field.options?.find((opt: any) => opt.label === optionData.label);
                                    if (validOption) {
                                        const optionPrice = validOption.price || 0;
                                        totalPrice += optionPrice;
                                        console.log(`💰 Option multi "${optionData.label}" validée: +${optionPrice}€ (total: ${totalPrice}€)`);
                                    }
                                });
                            }
                        }
                    });
                }
            }
        }

        console.log('💰 Prix total calculé côté serveur (VALIDÉ):', totalPrice);

        // Calculer le montant de l'acompte (50%) avec le prix sécurisé
        const depositAmount = Math.round(totalPrice * 50); // Stripe utilise les centimes

        // Vérifier la cohérence entre le prix front et le prix back (sécurité + UX)
        if (Math.abs(orderData.totalPrice - totalPrice) > 0.01) { // Tolérance de 1 centime
            console.warn('⚠️ Prix front/back différent:', {
                frontPrice: orderData.totalPrice,
                backPrice: totalPrice,
                difference: Math.abs(orderData.totalPrice - totalPrice)
            });

            // Option 1: Rejeter la commande (sécurisé mais UX dégradée)
            // return json({ error: 'Prix incorrect détecté' }, { status: 400 });

            // Option 2: Utiliser le prix back et continuer (sécurisé + UX préservée)
            console.log('✅ Utilisation du prix sécurisé côté serveur');
        }

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

        console.log('📝 Données de personnalisation transformées:', transformedCustomizationData);
        console.log('🔍 Structure des données originales:', JSON.stringify(orderData.selectedOptions, null, 2));

        // 🗄️ SAUVEGARDER LES DONNÉES COMPLÈTES DANS pending_orders
        console.log('💾 Sauvegarde des données complètes dans pending_orders...');
        const { data: pendingOrder, error: pendingOrderError } = await locals.supabase
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
            console.error('❌ Erreur sauvegarde pending_order:', pendingOrderError);
            return json({ error: 'Erreur lors de la sauvegarde des données' }, { status: 500 });
        }

        console.log('✅ Données sauvegardées avec ID:', pendingOrder.id);

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
                orderId: pendingOrder.id,
                cakeName: orderData.cakeName,
                depositAmount: depositAmount.toString(),
                type: 'product_order'
            },
            /*payment_intent_data: {
                application_fee_amount: Math.round(depositAmount * 0.05), // 5% de frais pour Pattyly
                transfer_data: {
                    destination: stripeAccountId,
                },
            },*/
        });

        return json({ sessionUrl: session.url });
    } catch (error) {
        console.error('Erreur création session Stripe:', error);
        return json({ error: 'Erreur lors de la création de la session de paiement' }, { status: 500 });
    }
}; 