import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ params, locals }) => {
    const { slug, order_ref } = params;

    try {
		// ✅ OPTIMISÉ : Charger order d'abord, puis shop et payment_links en parallèle
		// Récupérer l'order avec order_ref et vérification du slug
		const { data: order, error: orderError } = await (locals.supabaseServiceRole as any)
			.from('orders')
			.select('*, shops!inner(slug, id, name, logo_url, profile_id, instagram, tiktok, website)')
			.eq('order_ref', order_ref)
			.eq('shops.slug', slug)
			.eq('status', 'quoted') // Seulement les devis en attente de paiement
			.single();

        if (orderError || !order) {
            console.error('Error fetching order:', orderError);
            throw error(404, 'Devis non trouvé');
        }

        // Extraire shop depuis la relation
        const shop = order.shops;

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

        // Retourner order sans la relation shops (déjà extraite)
        const { shops, ...orderWithoutShops } = order;

        // Les customizations sont chargées dans le layout parent

        return {
            order: orderWithoutShops,
            paypalMe: paymentLink.paypal_me,
            shop,
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
    openPayPal: async ({ params, request, locals }) => {
        // Just return success, the frontend will handle the redirect
        return { success: true };
    },
    confirmPayment: async ({ params, request, locals }) => {
        const { slug, order_ref } = params;

        try {
            console.log('🚀 [Confirm Custom Payment] Starting for order_ref:', order_ref);

            // ✅ OPTIMISÉ : Récupérer orderId depuis formData si disponible, sinon utiliser order_ref
            const formData = await request.formData();
            const orderId = formData.get('orderId') as string;

            // 1. Récupérer l'order (avec orderId si disponible, sinon avec order_ref)
            const orderQuery = (locals.supabaseServiceRole as any)
                .from('orders')
                .select('*, shops(slug, logo_url, name, profile_id, profiles(email))')
                .eq('status', 'quoted');

            if (orderId) {
                orderQuery.eq('id', orderId);
            } else {
                orderQuery.eq('order_ref', order_ref);
            }

            const { data: order, error: orderError } = await orderQuery.single();

            if (orderError || !order) {
                console.error('Error fetching order:', orderError);
                throw error(404, 'Devis non trouvé');
            }

            // 2. Calculer les montants
            const totalAmount = order.total_amount;
            const paidAmount = totalAmount / 2; // Acompte de 50%
            const remainingAmount = totalAmount - paidAmount;

            console.log('💰 [Confirm Custom Payment] Amounts:', {
                totalAmount,
                paidAmount,
                remainingAmount
            });

            // 3. Mettre à jour l'order avec statut "to_verify"
            const { data: updatedOrder, error: updateError } = await (locals.supabaseServiceRole as any)
                .from('orders')
                .update({
                    status: 'to_verify',
                    paid_amount: paidAmount
                })
                .eq('id', order.id)
                .select()
                .single();

            if (updateError || !updatedOrder) {
                console.error('Error updating order:', updateError);
                throw error(500, 'Erreur lors de la confirmation du paiement');
            }

            console.log('✅ [Confirm Custom Payment] Order updated to to_verify');

            // 4. Envoyer les emails spécifiques pour PayPal.me (en attente de vérification)
            try {
                console.log('📧 [Confirm Custom Payment] Sending emails...');

                // Email au client (en attente de vérification)
                await EmailService.sendOrderPendingVerificationClient({
                    customerEmail: order.customer_email,
                    customerName: order.customer_name,
                    shopName: order.shops.name,
                    shopLogo: order.shops.logo_url,
                    productName: 'Commande personnalisée',
                    pickupDate: order.pickup_date,
                    pickupTime: order.pickup_time,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    remainingAmount: remainingAmount,
                    orderId: order.id,
                    orderUrl: `${PUBLIC_SITE_URL}/${order.shops.slug}/order/${order.id}`,
                    orderRef: order_ref,
                    date: new Date().toLocaleDateString('fr-FR')
                });

                // Email au pâtissier (vérification requise)
                await EmailService.sendOrderPendingVerificationPastry({
                    pastryEmail: order.shops.profiles.email,
                    customerName: order.customer_name,
                    customerEmail: order.customer_email,
                    customerInstagram: order.customer_instagram,
                    productName: 'Commande personnalisée',
                    pickupDate: order.pickup_date,
                    pickupTime: order.pickup_time,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    remainingAmount: remainingAmount,
                    orderId: order.id,
                    orderRef: order_ref,
                    dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                    date: new Date().toLocaleDateString('fr-FR')
                });

                console.log('✅ [Confirm Custom Payment] Emails sent successfully');
            } catch (emailError) {
                console.error('❌ [Confirm Custom Payment] Email error:', emailError);
                // Ne pas bloquer la commande si les emails échouent
            }

            // 5. Rediriger vers la page de confirmation
            console.log('🔄 [Confirm Custom Payment] Redirecting to order page:', order.id);
            throw redirect(303, `/${slug}/order/${order.id}`);

        } catch (err) {
            console.error('❌ [Confirm Custom Payment] Error:', err);
            // Si c'est une redirection ou une erreur HTTP, la relancer
            if (err && typeof err === 'object' && 'status' in err) {
                throw err;
            }
            throw error(500, 'Erreur lors de la confirmation du paiement');
        }
    }
};
