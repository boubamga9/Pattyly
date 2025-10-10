// src/routes/api/create-paypal-order/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { paypalClient } from '$lib/paypal/client';

interface CustomizationField {
    id: string;
    label: string;
    type: 'single-select' | 'multi-select' | 'text';
    options?: { label: string; price?: number }[];
}

interface OrderData {
    productId: string;
    shopId: string;
    customerName: string;
    customerEmail: string;
    selectedDate: string;
    selectedOptions?: Record<string, any>;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const orderData: OrderData = await request.json();

        // Validation minimale
        const requiredFields = ['productId', 'shopId', 'customerName', 'customerEmail', 'selectedDate'];
        for (const field of requiredFields) {
            if (!orderData[field as keyof OrderData]) {
                return json({ error: `Champ manquant : ${field}` }, { status: 400 });
            }
        }

        // 1️⃣ Récupérer boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, slug, profile_id')
            .eq('id', orderData.shopId)
            .single();
        if (shopError || !shop) return json({ error: 'Boutique non trouvée ou invalide' }, { status: 400 });

        // 2️⃣ Récupérer produit et formulaire
        const { data: product, error: productError } = await locals.supabase
            .from('products')
            .select('id, name, base_price, form_id')
            .eq('id', orderData.productId)
            .single();
        if (productError || !product) return json({ error: 'Produit non trouvé' }, { status: 404 });

        // 3️⃣ Récupérer champs de personnalisation
        let customizationFields: CustomizationField[] = [];
        if (product.form_id) {
            const { data: fieldsData, error: fieldsError } = await locals.supabase
                .from('form_fields')
                .select('id, label, type, options')
                .eq('form_id', product.form_id)
                .order('order');
            if (!fieldsError && fieldsData) customizationFields = fieldsData;
        }

        // 4️⃣ Calcul prix total et transformation options
        let totalPrice = product.base_price;
        const transformedCustomizationData: Record<string, any> = {};

        if (orderData.selectedOptions && customizationFields.length > 0) {
            Object.entries(orderData.selectedOptions).forEach(([fieldId, fieldData]) => {
                const field = customizationFields.find(f => f.id === fieldId);
                if (!field || !fieldData) return;

                transformedCustomizationData[field.label] = {
                    ...fieldData,
                    fieldId,
                    fieldType: field.type
                };

                if (field.type === 'single-select' && Array.isArray(field.options)) {
                    const option = field.options.find(opt => opt.label === fieldData.value);
                    if (option) totalPrice += option.price || 0;
                } else if (field.type === 'multi-select' && Array.isArray(field.options) && Array.isArray(fieldData.values)) {
                    fieldData.values.forEach((v: any) => {
                        const option = field.options.find(o => o.label === v.label);
                        if (option) totalPrice += option.price || 0;
                    });
                }
            });
        }

        const depositAmount = +(totalPrice * 0.5).toFixed(2); // 50% pour PayPal

        // 🔍 LOG: Date dans orderData
        console.log('📅 [PayPal API] orderData.selectedDate:', {
            value: orderData.selectedDate,
            type: typeof orderData.selectedDate
        });

        // 5️⃣ Récupérer compte PayPal
        const { data: paypalAccountData, error: paypalError } = await (locals.supabase as any)
            .rpc('get_paypal_account_for_shop', { shop_uuid: orderData.shopId });

        if (paypalError || !paypalAccountData || !Array.isArray(paypalAccountData) || paypalAccountData.length === 0) {
            return json({ error: 'Boutique non configurée pour les paiements PayPal' }, { status: 400 });
        }

        const paypalMerchantId = paypalAccountData[0]?.paypal_merchant_id;
        if (!paypalMerchantId) return json({ error: 'Compte PayPal incomplet (merchant_id manquant)' }, { status: 400 });

        // 6️⃣ Sauvegarder commande en pending_orders
        const { data: pendingOrder, error: pendingOrderError } = await locals.supabase
            .from('pending_orders')
            .insert({
                order_data: {
                    ...orderData,
                    productName: product.name,
                    selectedOptions: transformedCustomizationData,
                    serverCalculatedPrice: totalPrice,
                    depositAmount
                }
            })
            .select('id, order_data')
            .single();
        if (pendingOrderError || !pendingOrder) return json({ error: 'Erreur sauvegarde commande' }, { status: 500 });

        // 7️⃣ Créer l'ordre PayPal
        const origin = process.env.PUBLIC_SITE_URL || request.headers.get('origin') || '';
        const paypalOrder = await paypalClient.createOrder({
            intent: 'CAPTURE',
            purchase_units: [{
                reference_id: pendingOrder.id,
                amount: {
                    currency_code: 'EUR',
                    value: depositAmount.toFixed(2)
                },
                payee: { merchant_id: paypalMerchantId }
            }],
            application_context: {
                return_url: `${origin}/${shop.slug}/order/paypal-return?pendingId=${pendingOrder.id}`,
                cancel_url: `${origin}/${shop.slug}/product/${orderData.productId}`,
                user_action: 'PAY_NOW'
            }
        });

        const approvalLink = paypalOrder.links?.find(link => link.rel.toLowerCase() === 'approve');
        if (!approvalLink) return json({ error: 'Lien d\'approbation PayPal introuvable' }, { status: 500 });

        // 8️⃣ Mettre à jour pending_orders avec l'ID PayPal
        await locals.supabaseServiceRole
            .from('pending_orders')
            .update({ order_data: { ...pendingOrder.order_data, paypal_order_id: paypalOrder.id } })
            .eq('id', pendingOrder.id);

        return json({ approvalUrl: approvalLink.href, orderId: paypalOrder.id });

    } catch (err) {
        console.error('❌ [PayPal Payment] Fatal error:', err);
        return json({ error: 'Erreur lors de la création de l\'ordre PayPal', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
};
