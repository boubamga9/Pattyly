import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getUserPermissions, verifyShopOwnership } from '$lib/auth';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import Stripe from 'stripe';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { makeQuoteFormSchema, rejectOrderFormSchema, personalNoteFormSchema } from './schema.js';
import { EmailService } from '$lib/services/email-service';
import { ErrorLogger } from '$lib/services/error-logging';
import { getShopColorFromShopId } from '$lib/emails/helpers';


const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

export const load: PageServerLoad = async ({ params, locals, parent }) => {
    try {
        // ✅ OPTIMISÉ : Utiliser user et permissions du parent (déjà chargés)
        const { user, permissions } = await parent();

        if (!user) {
            throw error(401, 'Non autorisé');
        }

        // Vérifier d'abord si c'est une pending_order
        const { data: pendingOrder, error: pendingError } = await locals.supabase
            .from('pending_orders')
            .select('*')
            .eq('id', params.id)
            .maybeSingle();

        if (pendingOrder && !pendingError) {
            // C'est une pending_order
            const orderData = pendingOrder.order_data as any;

            // Vérifier que cette pending_order appartient à cette boutique
            if (orderData?.shop_id !== permissions.shopId) {
                throw error(403, 'Accès non autorisé');
            }

            // Récupérer les informations de la boutique
            const { data: shop } = await locals.supabase
                .from('shops')
                .select('id, name, slug, logo_url')
                .eq('id', permissions.shopId)
                .single();

            if (!shop) {
                throw error(404, 'Boutique non trouvée');
            }

            // Récupérer le produit si disponible
            let product = null;
            if (orderData.product_id) {
                const { data: productData } = await locals.supabase
                    .from('products')
                    .select('base_price, deposit_percentage, image_url')
                    .eq('id', orderData.product_id)
                    .single();
                product = productData;
            }

            // Transformer en format similaire à order pour l'affichage
            const order = {
                id: pendingOrder.id,
                customer_name: orderData.customer_name || 'Client inconnu',
                customer_email: orderData.customer_email || '',
                customer_phone: orderData.customer_phone || null,
                customer_instagram: orderData.customer_instagram || null,
                pickup_date: orderData.pickup_date,
                pickup_time: orderData.pickup_time || null,
                status: 'non_finalisee',
                total_amount: orderData.total_amount || null,
                paid_amount: null,
                product_name: orderData.product_name || null,
                product_base_price: product?.base_price || null,
                additional_information: orderData.additional_information || null,
                customization_data: orderData.customization_data || null,
                chef_message: null,
                chef_pickup_date: null,
                chef_pickup_time: null,
                order_ref: pendingOrder.order_ref || null,
                created_at: pendingOrder.created_at,
                is_pending: true
            };

            // Initialiser les formulaires Superforms
            const makeQuoteForm = await superValidate(zod(makeQuoteFormSchema));
            const rejectOrderForm = await superValidate(zod(rejectOrderFormSchema));
            const personalNoteForm = await superValidate(zod(personalNoteFormSchema));

            return {
                order,
                shop,
                paidAmount: null,
                personalNote: null,
                makeQuoteForm,
                rejectOrderForm,
                personalNoteForm,
                isPending: true,
                product
            };
        }

        // Sinon, c'est une commande normale
        // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données de commande
        const { data: orderDetailData, error: rpcError } = await locals.supabase.rpc('get_order_detail_data', {
            p_order_id: params.id,
            p_profile_id: user.id
        });

        if (rpcError) {
            console.error('Error fetching order detail data:', rpcError);
            throw error(404, 'Commande non trouvée');
        }

        const { order, personalNote, shop } = orderDetailData;

        if (!order || !shop) {
            throw error(404, 'Commande non trouvée');
        }

        // ✅ AJOUTER shopId au shop (le RPC ne le retourne pas, mais on l'a depuis permissions)
        const shopWithId = {
            ...shop,
            id: permissions.shopId
        };

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
            shop: shopWithId,
            paidAmount,
            personalNote: personalNote || null,
            makeQuoteForm,
            rejectOrderForm,
            personalNoteForm,
            isPending: false
        };
    } catch (err) {
        throw err;
    }
};

export const actions: Actions = {
    // Valider une pending_order (convertir en order)
    validatePendingOrder: async ({ params, request, locals }) => {
        try {
            // Récupérer l'utilisateur depuis la session
            const { session, user } = await locals.safeGetSession();

            if (!session || !user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer les permissions de l'utilisateur
            const permissions = await getUserPermissions(user.id, locals.supabase);

            if (!permissions.shopId) {
                return fail(403, { error: 'Boutique non trouvée' });
            }

            // Récupérer la pending_order
            const { data: pendingOrder, error: pendingOrderError } = await (locals.supabaseServiceRole as any)
                .from('pending_orders')
                .select('*')
                .eq('id', params.id)
                .single();

            if (pendingOrderError || !pendingOrder) {
                await ErrorLogger.logCritical(
                    pendingOrderError || new Error('Pending order not found'),
                    {
                        pendingOrderId: params.id,
                        userId: user.id,
                    },
                    {
                        action: 'validatePendingOrder',
                        step: 'fetch_pending_order',
                    }
                );
                return fail(404, { error: 'Commande non trouvée' });
            }

            const orderData = pendingOrder.order_data as any;

            // Vérifier que cette pending_order appartient à cette boutique
            const shopId = permissions.shopId;
            if (orderData?.shop_id !== shopId) {
                return fail(403, { error: 'Accès non autorisé à cette boutique' });
            }

            // Récupérer les informations du produit et de la boutique
            const { data: product, error: productError } = await (locals.supabaseServiceRole as any)
                .from('products')
                .select('base_price, deposit_percentage, shops(slug, logo_url, name, profile_id)')
                .eq('id', orderData.product_id)
                .single();

            if (productError || !product) {
                await ErrorLogger.logCritical(
                    productError || new Error('Product not found'),
                    {
                        pendingOrderId: params.id,
                        productId: orderData.product_id,
                        shopId: orderData.shop_id,
                    },
                    {
                        action: 'validatePendingOrder',
                        step: 'fetch_product',
                    }
                );
                return fail(500, { error: 'Produit non trouvé' });
            }

            // Calculer les montants
            const totalAmount = orderData.total_amount;
            const depositPercentage = product.deposit_percentage ?? 50; // Par défaut 50% si non défini
            const paidAmount = (totalAmount * depositPercentage) / 100;
            const remainingAmount = totalAmount - paidAmount;

            // Créer l'order avec statut "confirmed" (validé manuellement par le pâtissier)
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
                    status: 'confirmed',
                    total_amount: totalAmount,
                    paid_amount: paidAmount,
                    product_name: orderData.product_name,
                    product_base_price: product.base_price || 0,
                    order_ref: pendingOrder.order_ref,
                    payment_provider: null // Paiement manuel validé par le pâtissier
                })
                .select()
                .single();

            if (orderError || !order) {
                await ErrorLogger.logCritical(
                    orderError || new Error('Failed to create order'),
                    {
                        pendingOrderId: params.id,
                        shopId: orderData.shop_id,
                        productId: orderData.product_id,
                    },
                    {
                        action: 'validatePendingOrder',
                        step: 'create_order',
                    }
                );
                return fail(500, { error: 'Erreur lors de la création de la commande' });
            }

            // Tracking: Order received
            const { logEventAsync, Events } = await import('$lib/utils/analytics');
            logEventAsync(
                locals.supabaseServiceRole,
                Events.ORDER_RECEIVED,
                {
                    order_id: order.id,
                    order_ref: pendingOrder.order_ref,
                    shop_id: orderData.shop_id,
                    product_id: orderData.product_id,
                    total_amount: totalAmount,
                    order_type: 'product_order'
                },
                user.id,
                `/dashboard/orders/${params.id}`
            );

            // Envoyer l'email de confirmation uniquement au client
            try {
                // Récupérer la couleur de la boutique pour l'email
                const shopColor = await getShopColorFromShopId(
                    locals.supabaseServiceRole,
                    orderData.shop_id
                );

                await EmailService.sendOrderConfirmation({
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
                    date: new Date().toLocaleDateString('fr-FR'),
                    shopColor,
                });
            } catch (emailError) {
                console.error('❌ [Validate Pending Order] Email error:', emailError);
                // Ne pas bloquer la commande si l'email échoue
            }

            // Supprimer la pending_order
            const { error: deleteError } = await (locals.supabaseServiceRole as any)
                .from('pending_orders')
                .delete()
                .eq('id', params.id);

            if (deleteError) {
                console.error('❌ [Validate Pending Order] Failed to delete pending order:', deleteError);
                // Ne pas bloquer si la suppression échoue
            }

            // Rediriger vers la liste des commandes
            throw redirect(303, '/dashboard/orders');
        } catch (err) {
            // Si c'est une redirection, la relancer
            if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
                throw err;
            }
            console.error('❌ [Validate Pending Order] Error:', err);
            return fail(500, { error: 'Erreur lors de la validation de la commande' });
        }
    },
    // Sauvegarder/modifier la note personnelle
    savePersonalNote: async ({ request, params, locals }) => {
        try {
            // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
            const formData = await request.formData();
            const shopId = formData.get('shopId') as string;

            // ✅ CRÉER LE FORM DÈS LE DÉBUT (obligatoire pour Superforms)
            const form = await superValidate(formData, zod(personalNoteFormSchema));

            if (!shopId) {
                return fail(400, { form, error: 'Données de boutique manquantes' });
            }

            // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
            const { session } = await locals.safeGetSession();
            const userId = session?.user.id;

            if (!userId) {
                return fail(401, { form, error: 'Non autorisé' });
            }

            // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite getUserPermissions + requête shop)
            const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
            if (!isOwner) {
                return fail(403, { form, error: 'Accès non autorisé à cette boutique' });
            }

            if (!form.valid) {
                return fail(400, { form });
            }

            const { note } = form.data;

            if (!note || !note.trim()) {
                return fail(400, { form, error: 'La note ne peut pas être vide' });
            }

            // Insérer ou mettre à jour la note (utiliser shopId directement, pas besoin de requête shop)
            const { error: upsertError } = await locals.supabase
                .from('personal_order_notes')
                .upsert({
                    order_id: params.id,
                    shop_id: shopId,
                    note: note.trim()
                }, {
                    onConflict: 'order_id,shop_id'
                });

            if (upsertError) {
                return fail(500, { form, error: 'Erreur lors de la sauvegarde' });
            }

            // Retourner le succès avec le formulaire Superforms
            form.message = 'Note sauvegardée avec succès';
            return { form };
        } catch (err) {
            const errorForm = await superValidate(zod(personalNoteFormSchema));
            return fail(500, { form: errorForm, error: 'Erreur serveur' });
        }
    },

    // Faire un devis pour une commande en attente
    makeQuote: async ({ request, params, locals }) => {
        try {
            // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
            const formData = await request.formData();
            const shopId = formData.get('shopId') as string;
            const shopSlug = formData.get('shopSlug') as string;

            // ✅ CRÉER LE FORM DÈS LE DÉBUT (obligatoire pour Superforms)
            const form = await superValidate(formData, zod(makeQuoteFormSchema));

            if (!shopId || !shopSlug) {
                return fail(400, { form, error: 'Données de boutique manquantes' });
            }

            // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
            const { session } = await locals.safeGetSession();
            const userId = session?.user.id;

            if (!userId) {
                return fail(401, { form, error: 'Non autorisé' });
            }

            // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite requête shop)
            const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
            if (!isOwner) {
                return fail(403, { form, error: 'Accès non autorisé à cette boutique' });
            }

            if (!form.valid) {
                return fail(400, { form });
            }

            const { price, chef_message: chefMessage, chef_pickup_date: chefPickupDate, chef_pickup_time: chefPickupTime } = form.data;

            if (!price) {
                return fail(400, { form, error: 'Le prix est requis' });
            }

            // ✅ OPTIMISÉ : Récupérer uniquement les infos shop nécessaires (name, logo_url) en une requête
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id, name, logo_url')
                .eq('id', shopId)
                .single();

            if (shopError || !shop) {
                return fail(404, { form, error: 'Boutique non trouvée' });
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
                await ErrorLogger.logCritical(updateError, {
                    userId: userId,
                    shopId: shop.id,
                    orderId: params.id,
                }, {
                    action: 'makeQuote',
                    step: 'update_order_status',
                });
                return fail(500, { form, error: 'Erreur lors de la mise à jour de la commande' });
            }

            try {
                // Récupérer la couleur de la boutique pour l'email
                const shopColor = await getShopColorFromShopId(
                    locals.supabaseServiceRole,
                    shop.id
                );

                await Promise.all([
                    EmailService.sendQuote({
                        customerEmail: order.customer_email,
                        customerName: order.customer_name,
                        shopName: shop.name,
                        shopLogo: shop.logo_url || undefined,
                        quoteId: order.id.slice(0, 8),
                        orderUrl: `${PUBLIC_SITE_URL}/${shopSlug}/custom/checkout/${order_ref}`,
                        date: new Date().toLocaleDateString("fr-FR"),
                        shopColor,
                    })
                ]);
            } catch (e) {
                await ErrorLogger.logCritical(e, {
                    userId: userId,
                    shopId: shopId,
                    orderId: params.id,
                }, {
                    action: 'makeQuote',
                    step: 'send_emails',
                });
            }

            // Retourner le succès avec le formulaire Superforms
            form.message = 'Devis envoyé avec succès';
            return { form };
        } catch (err) {
            await ErrorLogger.logCritical(err, {
                userId: userId,
                shopId: shopId,
                orderId: params.id,
            }, {
                action: 'makeQuote',
                step: 'general_error',
            });
            // Créer un formulaire vide pour retourner l'erreur
            const errorForm = await superValidate(zod(makeQuoteFormSchema));
            return fail(500, { form: errorForm, error: 'Erreur interne' });
        }
    },

    // Refuser une commande (pending_order ou order normale)
    rejectOrder: async ({ request, params, locals }) => {
        try {
            // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
            const formData = await request.formData();
            const shopId = formData.get('shopId') as string;
            const shopSlug = formData.get('shopSlug') as string;
            const orderStatus = formData.get('orderStatus') as string | null;
            const isPendingOrderStr = formData.get('isPendingOrder') as string;
            const isPendingOrder = isPendingOrderStr === 'true';

            // ✅ CRÉER LE FORM DÈS LE DÉBUT (obligatoire pour Superforms)
            const form = await superValidate(formData, zod(rejectOrderFormSchema));

            if (!shopId || !shopSlug) {
                return fail(400, { form, error: 'Données de boutique manquantes' });
            }

            // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
            const { session } = await locals.safeGetSession();
            const userId = session?.user.id;

            if (!userId) {
                return fail(401, { form, error: 'Non autorisé' });
            }

            // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite requête shop)
            const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
            if (!isOwner) {
                return fail(403, { form, error: 'Accès non autorisé à cette boutique' });
            }

            if (!form.valid) {
                return fail(400, { form });
            }

            const { chef_message: chefMessage } = form.data;

            // ✅ OPTIMISÉ : Récupérer les infos shop nécessaires
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id, name, logo_url, slug')
                .eq('id', shopId)
                .single();

            if (shopError || !shop) {
                return fail(404, { form, error: 'Boutique non trouvée' });
            }

            // ✅ Détecter si c'est une pending_order
            if (isPendingOrder) {
                // Pour les pending_orders, le paiement a été fait → remboursement automatique
                const willRefund = true;
                const { data: pendingOrder, error: pendingError } = await locals.supabase
                    .from('pending_orders')
                    .select('*')
                    .eq('id', params.id)
                    .single();

                if (pendingError || !pendingOrder) {
                    return fail(404, { form, error: 'Commande non trouvée' });
                }

                const orderData = pendingOrder.order_data as any;

                if (orderData?.shop_id !== shopId) {
                    return fail(403, { form, error: 'Accès non autorisé' });
                }

                // Envoyer l'email d'annulation avec remboursement si activé
                try {
                    // Récupérer la couleur de la boutique pour l'email
                    const shopColor = await getShopColorFromShopId(
                        locals.supabaseServiceRole,
                        orderData.shop_id
                    );

                    await EmailService.sendOrderCancelled({
                        customerEmail: orderData.customer_email,
                        customerName: orderData.customer_name,
                        shopName: shop.name,
                        shopLogo: shop.logo_url || undefined,
                        orderId: pendingOrder.order_ref || pendingOrder.id.slice(0, 8),
                        orderUrl: `${PUBLIC_SITE_URL}/${shopSlug}`,
                        date: new Date().toLocaleDateString('fr-FR'),
                        chefMessage: chefMessage || undefined,
                        willRefund: willRefund,
                        shopColor,
                    });
                } catch (emailError) {
                    await ErrorLogger.logCritical(emailError, {
                        userId,
                        shopId,
                        pendingOrderId: params.id,
                    }, {
                        action: 'rejectOrder',
                        step: 'send_cancellation_email_pending',
                    });
                }

                // Supprimer la pending_order
                const { error: deleteError } = await locals.supabase
                    .from('pending_orders')
                    .delete()
                    .eq('id', params.id);

                if (deleteError) {
                    await ErrorLogger.logCritical(deleteError, {
                        userId,
                        shopId,
                        pendingOrderId: params.id,
                    }, {
                        action: 'rejectOrder',
                        step: 'delete_pending_order',
                    });
                    return fail(500, { form, error: 'Erreur lors de la suppression' });
                }

                form.message = 'Commande refusée et email envoyé au client';
                return { form };
            }

            // ✅ Sinon, c'est une order normale - récupérer la commande pour vérifier le statut
            const { data: order, error: orderError } = await locals.supabase
                .from('orders')
                .select('id, status, customer_email, customer_name')
                .eq('id', params.id)
                .eq('shop_id', shopId)
                .single();

            if (orderError || !order) {
                return fail(404, { form, error: 'Commande non trouvée' });
            }

            const currentStatus = orderStatus || order.status;

            // ✅ Mettre à jour la commande
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
                await ErrorLogger.logCritical(updateError, {
                    userId,
                    shopId,
                    orderId: params.id,
                }, {
                    action: 'rejectOrder',
                    step: 'update_order_status',
                });
                return fail(500, { form, error: 'Erreur lors de la mise à jour de la commande' });
            }

            // ✅ Envoyer l'email approprié selon le statut
            try {
                // Récupérer la couleur de la boutique pour l'email (une seule fois pour les deux cas)
                const shopColor = await getShopColorFromShopId(
                    locals.supabaseServiceRole,
                    shop.id
                );

                // Pour les commandes payées (to_verify) : email avec remboursement automatique
                // Note: non_finalisee est uniquement pour pending_orders, géré dans le bloc précédent
                if (currentStatus === 'to_verify') {
                    // Commande payée → remboursement automatique
                    await EmailService.sendOrderCancelled({
                        customerEmail: order.customer_email,
                        customerName: order.customer_name,
                        shopName: shop.name,
                        shopLogo: shop.logo_url || undefined,
                        orderId: order.id.slice(0, 8),
                        orderUrl: `${PUBLIC_SITE_URL}/${shopSlug}/order/${order.id}`,
                        date: new Date().toLocaleDateString('fr-FR'),
                        chefMessage: chefMessage || undefined,
                        willRefund: true, // Remboursement automatique pour les commandes payées
                        shopColor,
                    });
                } else {
                    // Pour les commandes non payées (pending) : email de refus de demande
                    await EmailService.sendRequestRejected({
                        customerEmail: order.customer_email,
                        customerName: order.customer_name,
                        shopName: shop.name,
                        shopLogo: shop.logo_url || undefined,
                        reason: chefMessage,
                        requestId: order.id.slice(0, 8),
                        catalogUrl: `${PUBLIC_SITE_URL}/${shopSlug}`,
                        date: new Date().toLocaleDateString("fr-FR"),
                        shopColor,
                    });
                }
            } catch (emailError) {
                await ErrorLogger.logCritical(emailError, {
                    userId,
                    shopId,
                    orderId: params.id,
                    customerEmail: order.customer_email,
                    orderStatus: currentStatus,
                }, {
                    action: 'rejectOrder',
                    step: 'send_rejection_email',
                });
            }

            // Retourner le succès avec le formulaire Superforms
            form.message = 'Commande refusée avec succès';
            return { form };
        } catch (err) {
            await ErrorLogger.logCritical(err, {
                userId: userId,
                shopId: shopId,
                orderId: params.id,
            }, {
                action: 'rejectOrder',
                step: 'general_error',
            });
            // Créer un formulaire vide pour retourner l'erreur
            const errorForm = await superValidate(zod(rejectOrderFormSchema));
            return fail(500, { form: errorForm, error: 'Erreur interne' });
        }
    },

    // Confirmer la réception du paiement PayPal.me
    confirmPayment: async ({ request, params, locals }) => {
        try {
            // ✅ OPTIMISÉ : Récupérer shopId depuis formData
            if (!request) {
                return fail(400, { error: 'Requête invalide' });
            }

            const formData = await request.formData();
            const shopId = formData.get('shopId') as string;

            if (!shopId) {
                return fail(400, { error: 'Données de boutique manquantes' });
            }

            // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
            const { session } = await locals.safeGetSession();
            const userId = session?.user.id;

            if (!userId) {
                return fail(401, { error: 'Non autorisé' });
            }

            // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite getUserPermissions)
            const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
            if (!isOwner) {
                return fail(403, { error: 'Accès non autorisé à cette boutique' });
            }

            // Récupérer les détails de la commande avant mise à jour
            const { data: order, error: orderError } = await locals.supabase
                .from('orders')
                .select('*, shops(name, logo_url, slug)')
                .eq('id', params.id)
                .eq('shop_id', shopId)
                .eq('status', 'to_verify')
                .single();

            if (orderError || !order) {
                await ErrorLogger.logCritical(
                    orderError || new Error('Commande non trouvée ou déjà confirmée'),
                    {
                        userId: userId,
                        shopId: shopId,
                        orderId: params.id,
                    },
                    {
                        action: 'confirmPayment',
                        step: 'fetch_order',
                    }
                );
                return fail(404, { error: 'Commande non trouvée ou déjà confirmée' });
            }

            // Mettre à jour la commande : passer de 'to_verify' à 'confirmed'
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'confirmed' })
                .eq('id', params.id)
                .eq('shop_id', shopId)
                .eq('status', 'to_verify');

            if (updateError) {
                await ErrorLogger.logCritical(updateError, {
                    userId: userId,
                    shopId: shopId,
                    orderId: params.id,
                }, {
                    action: 'confirmPayment',
                    step: 'update_order_status',
                    critical: true, // Paiement confirmé mais statut non mis à jour
                });
                return fail(500, { error: 'Erreur lors de la confirmation du paiement' });
            }

            console.log('✅ Payment confirmed for order:', params.id);

            // Envoyer un email de confirmation au client
            try {
                const totalAmount = order.total_amount || 0;
                const paidAmount = order.paid_amount || totalAmount / 2;
                const remainingAmount = totalAmount - paidAmount;

                // Récupérer la couleur de la boutique pour l'email
                const shopColor = await getShopColorFromShopId(
                    locals.supabaseServiceRole,
                    order.shops.id
                );

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
                    date: new Date().toLocaleDateString('fr-FR'),
                    shopColor,
                });

                console.log('✅ Confirmation email sent to client');
            } catch (emailError) {
                await ErrorLogger.logCritical(emailError, {
                    userId: userId,
                    shopId: shopId,
                    orderId: order.id,
                    customerEmail: order.customer_email,
                }, {
                    action: 'confirmPayment',
                    step: 'send_confirmation_email',
                });
            }

            return { message: 'Paiement confirmé avec succès' };
        } catch (err) {
            await ErrorLogger.logCritical(err, {
                userId: userId,
                shopId: shopId,
                orderId: params.id,
            }, {
                action: 'confirmPayment',
                step: 'general_error',
            });
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Marquer une commande comme prête
    makeOrderReady: async ({ request, params, locals }) => {
        try {
            // ✅ OPTIMISÉ : Récupérer shopId depuis formData
            if (!request) {
                return fail(400, { error: 'Requête invalide' });
            }

            const formData = await request.formData();
            const shopId = formData.get('shopId') as string;

            if (!shopId) {
                return fail(400, { error: 'Données de boutique manquantes' });
            }

            // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
            const { session } = await locals.safeGetSession();
            const userId = session?.user.id;

            if (!userId) {
                return fail(401, { error: 'Non autorisé' });
            }

            // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite requête shop)
            const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
            if (!isOwner) {
                return fail(403, { error: 'Accès non autorisé à cette boutique' });
            }

            // Mettre à jour la commande (utiliser shopId directement)
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'ready' })
                .eq('id', params.id)
                .eq('shop_id', shopId);

            if (updateError) {
                await ErrorLogger.logCritical(updateError, {
                    userId: userId,
                    shopId: shopId,
                    orderId: params.id,
                }, {
                    action: 'makeOrderReady',
                    step: 'update_order_status',
                });
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande marquée comme prête' };
        } catch (err) {
            await ErrorLogger.logCritical(err, {
                userId: userId,
                shopId: shopId,
                orderId: params.id,
            }, {
                action: 'makeOrderReady',
                step: 'general_error',
            });
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Marquer une commande comme terminée
    makeOrderCompleted: async ({ request, params, locals }) => {
        try {
            // ✅ OPTIMISÉ : Récupérer shopId depuis formData
            if (!request) {
                return fail(400, { error: 'Requête invalide' });
            }

            const formData = await request.formData();
            const shopId = formData.get('shopId') as string;

            if (!shopId) {
                return fail(400, { error: 'Données de boutique manquantes' });
            }

            // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
            const { session } = await locals.safeGetSession();
            const userId = session?.user.id;

            if (!userId) {
                return fail(401, { error: 'Non autorisé' });
            }

            // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite requête shop)
            const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
            if (!isOwner) {
                return fail(403, { error: 'Accès non autorisé à cette boutique' });
            }

            // Mettre à jour la commande (utiliser shopId directement)
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'completed' })
                .eq('id', params.id)
                .eq('shop_id', shopId);

            if (updateError) {
                await ErrorLogger.logCritical(updateError, {
                    userId: userId,
                    shopId: shopId,
                    orderId: params.id,
                }, {
                    action: 'makeOrderCompleted',
                    step: 'update_order_status',
                });
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande marquée comme terminée' };
        } catch (err) {
            await ErrorLogger.logCritical(err, {
                userId: userId,
                shopId: shopId,
                orderId: params.id,
            }, {
                action: 'makeOrderCompleted',
                step: 'general_error',
            });
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Annuler une commande avec devis
    cancelOrder: async ({ request, params, locals }) => {
        try {
            // ✅ OPTIMISÉ : Récupérer shopId et shopSlug depuis formData
            if (!request) {
                return fail(400, { error: 'Requête invalide' });
            }

            const formData = await request.formData();
            const shopId = formData.get('shopId') as string;
            const shopSlug = formData.get('shopSlug') as string;

            if (!shopId || !shopSlug) {
                return fail(400, { error: 'Données de boutique manquantes' });
            }

            // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
            const { session } = await locals.safeGetSession();
            const userId = session?.user.id;

            if (!userId) {
                return fail(401, { error: 'Non autorisé' });
            }

            // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite requête shop)
            const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
            if (!isOwner) {
                return fail(403, { error: 'Accès non autorisé à cette boutique' });
            }

            // ✅ OPTIMISÉ : Récupérer uniquement les infos shop nécessaires (name, logo_url) en une requête
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id, name, logo_url')
                .eq('id', shopId)
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
                // Récupérer la couleur de la boutique pour l'email
                const shopColor = await getShopColorFromShopId(
                    locals.supabaseServiceRole,
                    shop.id
                );

                await Promise.all([
                    EmailService.sendOrderCancelled({
                        customerEmail: order.customer_email,
                        customerName: order.customer_name,
                        shopName: shop.name,
                        shopLogo: shop.logo_url || undefined,
                        orderId: order.id.slice(0, 8),
                        orderUrl: `${PUBLIC_SITE_URL}/${shopSlug}/order/${order.id}`,
                        date: new Date().toLocaleDateString("fr-FR"),
                        shopColor,
                    })]);
            } catch (e) { }

            return { message: 'Commande annulée avec succès' };
        } catch (err) {
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Supprimer la note personnelle
    deletePersonalNote: async ({ request, params, locals }) => {
        try {
            // ✅ OPTIMISÉ : Récupérer shopId depuis formData
            if (!request) {
                return fail(400, { error: 'Requête invalide' });
            }

            const formData = await request.formData();
            const shopId = formData.get('shopId') as string;

            if (!shopId) {
                return fail(400, { error: 'Données de boutique manquantes' });
            }

            // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
            const { session } = await locals.safeGetSession();
            const userId = session?.user.id;

            if (!userId) {
                return fail(401, { error: 'Non autorisé' });
            }

            // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite requête shop)
            const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
            if (!isOwner) {
                return fail(403, { error: 'Accès non autorisé à cette boutique' });
            }

            // Supprimer la note (utiliser shopId directement)
            const { error: deleteError } = await locals.supabase
                .from('personal_order_notes')
                .delete()
                .eq('order_id', params.id)
                .eq('shop_id', shopId);

            if (deleteError) {
                return fail(500, { error: 'Erreur lors de la suppression' });
            }

            return { success: true, message: 'Note supprimée avec succès' };
        } catch (err) {
            return fail(500, { error: 'Erreur serveur' });
        }
    },

    // Supprimer une commande (uniquement si pas payée avec Stripe)
    deleteOrder: async ({ request, params, locals }) => {
        try {
            // ✅ OPTIMISÉ : Récupérer shopId depuis formData
            if (!request) {
                return fail(400, { error: 'Requête invalide' });
            }

            const formData = await request.formData();
            const shopId = formData.get('shopId') as string;

            if (!shopId) {
                return fail(400, { error: 'Données de boutique manquantes' });
            }

            // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
            const { session } = await locals.safeGetSession();
            const userId = session?.user.id;

            if (!userId) {
                return fail(401, { error: 'Non autorisé' });
            }

            // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership
            const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
            if (!isOwner) {
                return fail(403, { error: 'Accès non autorisé à cette boutique' });
            }

            // Récupérer la commande pour vérifier qu'elle n'est pas payée avec Stripe
            const { data: order, error: orderError } = await locals.supabase
                .from('orders')
                .select('id, stripe_payment_intent_id, stripe_session_id, status')
                .eq('id', params.id)
                .eq('shop_id', shopId)
                .single();

            if (orderError || !order) {
                return fail(404, { error: 'Commande non trouvée' });
            }

            // Vérifier que la commande n'a pas été payée avec Stripe
            if (order.stripe_payment_intent_id || order.stripe_session_id) {
                return fail(400, {
                    error: 'Impossible de supprimer une commande payée avec Stripe'
                });
            }

            // Supprimer la commande
            // Utiliser supabaseServiceRole pour contourner les RLS (comme pour d'autres opérations sensibles)
            const { error: deleteError } = await locals.supabaseServiceRole
                .from('orders')
                .delete()
                .eq('id', params.id)
                .eq('shop_id', shopId);

            if (deleteError) {
                console.error('Error deleting order:', deleteError);
                await ErrorLogger.logCritical(deleteError, {
                    userId: userId,
                    shopId: shopId,
                    orderId: params.id,
                }, {
                    action: 'deleteOrder',
                    step: 'delete_order',
                });
                return fail(500, { error: 'Erreur lors de la suppression de la commande' });
            }

            return { message: 'Commande supprimée avec succès' };
        } catch (err) {
            console.error('Error in deleteOrder:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    }
};