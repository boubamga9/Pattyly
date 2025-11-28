import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ params, locals }) => {
    const { slug, id, order_ref } = params;

    try {
        // Récupérer la pending_order
        const { data: pendingOrder, error: pendingOrderError } = await (locals.supabaseServiceRole as any)
            .from('pending_orders')
            .select('*')
            .eq('order_ref', order_ref)
            .single();

        if (pendingOrderError || !pendingOrder) {
            console.error('Error fetching pending order:', pendingOrderError);
            throw error(404, 'Commande non trouvée');
        }

        const orderData = pendingOrder.order_data as any;

        // Récupérer les informations de la boutique
        const { data: shop, error: shopError } = await (locals.supabaseServiceRole as any)
            .from('shops')
            .select('id, name, slug, logo_url, profile_id')
            .eq('id', orderData.shop_id)
            .eq('slug', slug)
            .single();

        if (shopError || !shop) {
            console.error('Error fetching shop:', shopError);
            throw error(404, 'Boutique non trouvée');
        }

        // Récupérer les informations du produit
        const { data: product, error: productError } = await (locals.supabaseServiceRole as any)
            .from('products')
            .select('id, name, description, image_url, base_price')
            .eq('id', orderData.product_id)
            .single();

        if (productError || !product) {
            console.error('Error fetching product:', productError);
            throw error(404, 'Produit non trouvé');
        }


        // Récupérer le payment_link pour avoir le paypal_me
        const { data: paymentLink, error: paymentLinkError } = await (locals.supabaseServiceRole as any)
            .from('payment_links')
            .select('paypal_me')
            .eq('profile_id', shop.profile_id)
            .single();

        if (paymentLinkError || !paymentLink) {
            console.error('Error fetching payment link:', paymentLinkError);
            throw error(500, 'Erreur lors du chargement des informations de paiement');
        }

        // Les customizations sont chargées dans le layout parent

        return {
            orderData,
            paypalMe: paymentLink.paypal_me,
            shop,
            product,
        };

    } catch (err) {
        console.error('Error in checkout load:', err);
        if (err instanceof Error && 'status' in err) {
            throw err;
        }
        throw error(500, 'Erreur lors du chargement de la commande');
    }
};

export const actions: Actions = {
    confirmPayment: async ({ params, request, locals }) => {
        const { slug, order_ref } = params;

        try {
            console.log('🚀 [Confirm Payment] Starting for order_ref:', order_ref);

            const formData = await request.formData();

            // ✅ OPTIMISÉ : Récupérer shopId, productId et orderRef depuis formData (passés par le frontend)
            const shopId = formData.get('shopId') as string;
            const productId = formData.get('productId') as string;
            const orderRefFromForm = formData.get('orderRef') as string || order_ref; // Fallback sur order_ref

            // 1. Récupérer la pending_order
            const { data: pendingOrder, error: pendingOrderError } = await (locals.supabaseServiceRole as any)
                .from('pending_orders')
                .select('*')
                .eq('order_ref', orderRefFromForm)
                .single();

            if (pendingOrderError || !pendingOrder) {
                console.error('Error fetching pending order:', pendingOrderError);
                throw error(404, 'Commande non trouvée');
            }

            const orderData = pendingOrder.order_data;
            console.log('📦 [Confirm Payment] Order data:', orderData);

            // Vérifier que les IDs correspondent
            if (shopId && orderData.shop_id !== shopId) {
                throw error(403, 'Données de boutique invalides');
            }
            if (productId && orderData.product_id !== productId) {
                throw error(403, 'Données de produit invalides');
            }

            // 2. Récupérer les informations du produit et de la boutique
            // Utiliser shopId et productId depuis formData si disponibles, sinon depuis orderData
            const finalShopId = shopId || orderData.shop_id;
            const finalProductId = productId || orderData.product_id;

            const { data: product, error: productError } = await (locals.supabaseServiceRole as any)
                .from('products')
                .select('base_price, shops(slug, logo_url, name, profile_id, profiles(email))')
                .eq('id', finalProductId)
                .single();

            if (productError || !product) {
                console.error('Error fetching product:', productError);
                throw error(500, 'Produit non trouvé');
            }

            // 3. Calculer les montants
            const totalAmount = orderData.total_amount;
            const paidAmount = totalAmount / 2; // Acompte de 50%
            const remainingAmount = totalAmount - paidAmount;

            console.log('💰 [Confirm Payment] Amounts:', {
                totalAmount,
                paidAmount,
                remainingAmount
            });

            // 4. Créer l'order avec statut "to_verify"
            const { data: order, error: orderError } = await (locals.supabaseServiceRole as any)
                .from('orders')
                .insert({
                    shop_id: orderData.shop_id,
                    product_id: orderData.product_id,
                    customer_name: orderData.customer_name,
                    customer_email: orderData.customer_email,
                    customer_phone: orderData.customer_phone || null,
                    customer_instagram: orderData.customer_instagram || null,
                    pickup_date: orderData.pickup_date,
                    pickup_time: orderData.pickup_time || null,
                    additional_information: orderData.additional_information || null,
                    customization_data: orderData.customization_data || null,
                    status: 'to_verify',
                    total_amount: totalAmount,
                    paid_amount: paidAmount,
                    product_name: orderData.product_name,
                    product_base_price: product.base_price || 0,
                    order_ref: order_ref
                })
                .select()
                .single();

            if (orderError || !order) {
                console.error('Error creating order:', orderError);
                throw error(500, 'Erreur lors de la création de la commande');
            }

            console.log('✅ [Confirm Payment] Order created with ID:', order.id);

            // ✅ Tracking: Order received (fire-and-forget pour ne pas bloquer)
            const { logEventAsync, Events } = await import('$lib/utils/analytics');
            logEventAsync(
                locals.supabaseServiceRole,
                Events.ORDER_RECEIVED,
                {
                    order_id: order.id,
                    order_ref,
                    shop_id: orderData.shop_id,
                    product_id: orderData.product_id,
                    total_amount: totalAmount,
                    order_type: 'product_order'
                },
                null, // Client orders don't have userId
                `/${slug}/product/${id}/checkout/${order_ref}`
            );

            // 5. Envoyer les emails spécifiques pour PayPal.me (en attente de vérification)
            try {
                console.log('📧 [Confirm Payment] Sending emails...');

                // Email au client (en attente de vérification)
                await EmailService.sendOrderPendingVerificationClient({
                    customerEmail: orderData.customer_email,
                    customerName: orderData.customer_name,
                    shopName: product.shops.name,
                    shopLogo: product.shops.logo_url,
                    productName: orderData.product_name,
                    pickupDate: orderData.pickup_date,
                    pickupTime: orderData.pickup_time,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    remainingAmount: remainingAmount,
                    orderId: order.id,
                    orderUrl: `${PUBLIC_SITE_URL}/${product.shops.slug}/order/${order.id}`,
                    orderRef: order_ref,
                    date: new Date().toLocaleDateString('fr-FR')
                });

                // Email au pâtissier (vérification requise)
                await EmailService.sendOrderPendingVerificationPastry({
                    pastryEmail: product.shops.profiles.email,
                    customerName: orderData.customer_name,
                    customerEmail: orderData.customer_email,
                    customerInstagram: orderData.customer_instagram,
                    productName: orderData.product_name,
                    pickupDate: orderData.pickup_date,
                    pickupTime: orderData.pickup_time,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    remainingAmount: remainingAmount,
                    orderId: order.id,
                    orderRef: order_ref,
                    dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                    date: new Date().toLocaleDateString('fr-FR')
                });

                console.log('✅ [Confirm Payment] Emails sent successfully');
            } catch (emailError) {
                console.error('❌ [Confirm Payment] Email error:', emailError);
                // Ne pas bloquer la commande si les emails échouent
            }

            // 6. Supprimer la pending_order
            const { error: deleteError } = await (locals.supabaseServiceRole as any)
                .from('pending_orders')
                .delete()
                .eq('order_ref', order_ref);

            if (deleteError) {
                console.error('❌ [Confirm Payment] Failed to delete pending order:', deleteError);
                // Ne pas bloquer si la suppression échoue
            } else {
                console.log('✅ [Confirm Payment] Pending order deleted');
            }

            // 7. Rediriger vers la page de confirmation
            console.log('🔄 [Confirm Payment] Redirecting to order page:', order.id);
            throw redirect(303, `/${slug}/order/${order.id}`);

        } catch (err) {
            console.error('❌ [Confirm Payment] Error:', err);
            // Si c'est une redirection ou une erreur HTTP, la relancer
            if (err && typeof err === 'object' && 'status' in err) {
                throw err;
            }
            throw error(500, 'Erreur lors de la confirmation du paiement');
        }
    }
};

