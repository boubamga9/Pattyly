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

        // Validation minimale
        if (!orderData.productId || !orderData.shopId || !orderData.customerName || !orderData.customerEmail || !orderData.selectedDate || typeof orderData.totalPrice !== 'number') {
            return json({ error: 'Données manquantes ou invalides' }, { status: 400 });
        }

        // 1️⃣ Récupérer boutique et infos nécessaires en une seule requête
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, slug, profile_id')
            .eq('id', orderData.shopId)
            .single();

        if (shopError || !shop) return json({ error: 'Boutique non trouvée ou invalide' }, { status: 400 });

        // 2️⃣ Récupérer le produit et son formulaire en une seule requête
        const { data: product, error: productError } = await locals.supabase
            .from('products')
            .select('id, base_price, form_id')
            .eq('id', orderData.productId)
            .single();

        if (productError || !product) return json({ error: 'Produit non trouvé' }, { status: 404 });

        // 3️⃣ Récupérer tous les champs de personnalisation d'un coup
        let customizationFields: any[] = [];
        if (product.form_id) {
            const { data: fieldsData, error: fieldsError } = await locals.supabase
                .from('form_fields')
                .select('id, label, type, options')
                .eq('form_id', product.form_id)
                .order('order');

            if (!fieldsError && fieldsData) customizationFields = fieldsData;
        }

        // Transformation des options sélectionnées pour avoir les labels et métadonnées
        const transformedCustomizationData: Record<string, any> = {};
        if (orderData.selectedOptions && customizationFields.length > 0) {
            Object.entries(orderData.selectedOptions).forEach(([fieldId, fieldData]) => {
                const field = customizationFields.find(f => f.id === fieldId);
                if (field && fieldData) {
                    transformedCustomizationData[field.label] = {
                        ...fieldData,
                        fieldId: fieldId,
                        fieldType: field.type
                    };
                }
            });
        }

        // Calcul du prix total basé sur le produit
        let totalPrice = product.base_price;

        if (customizationFields.length > 0 && orderData.selectedOptions) {
            Object.entries(orderData.selectedOptions).forEach(([fieldId, fieldData]) => {
                const field = customizationFields.find(f => f.id === fieldId);
                if (!field) return;

                const fieldDataObj = fieldData as any;
                if (field.type === 'single-select' && Array.isArray(field.options)) {
                    const validOption = field.options.find((opt: any) => opt.label === fieldDataObj.value);
                    if (validOption) totalPrice += validOption.price || 0;
                } else if (field.type === 'multi-select' && Array.isArray(field.options) && Array.isArray(fieldDataObj.values)) {
                    fieldDataObj.values.forEach((opt: any) => {
                        const validOption = field.options.find((o: any) => o.label === opt.label);
                        if (validOption) totalPrice += validOption.price || 0;
                    });
                }
            });
        }

        const depositAmount = Math.round(totalPrice * 50); // 50% pour Stripe (en centimes)

        // Sauvegarde de la commande dans pending_orders
        const { data: pendingOrder, error: pendingOrderError } = await locals.supabase
            .from('pending_orders')
            .insert({
                order_data: {
                    ...orderData,
                    selectedOptions: transformedCustomizationData,
                    serverCalculatedPrice: totalPrice,
                    depositAmount
                }
            })
            .select('id')
            .single();

        if (pendingOrderError) return json({ error: 'Erreur sauvegarde commande' }, { status: 500 });

        // Création session Stripe (inchangée)
        const origin = request.headers.get('origin');
        const successUrl = `${origin}/${shop.slug}/order/{CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${origin}/${shop.slug}/product/${orderData.productId}`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Acompte - ${orderData.cakeName}`,
                        description: `Acompte de 50% pour la commande de ${orderData.cakeName}`
                    },
                    unit_amount: depositAmount
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: orderData.customerEmail,
            metadata: {
                orderId: pendingOrder.id,
                cakeName: orderData.cakeName,
                depositAmount: depositAmount.toString(),
                type: 'product_order'
            }
        });

        return json({ sessionUrl: session.url });
    } catch (err) {
        console.error('Erreur POST create order:', err);
        return json({ error: 'Erreur lors de la création de la session de paiement' }, { status: 500 });
    }
};
