import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const orderData = await request.json();

        // Validation des données
        if (!orderData.shopId || !orderData.customerName || !orderData.customerEmail || !orderData.selectedDate) {
            return json({ error: 'Données manquantes' }, { status: 400 });
        }

        // Vérifier si une commande similaire existe déjà (protection contre les doublons)
        const { data: existingOrder, error: checkError } = await locals.supabase
            .from('orders')
            .select('id')
            .eq('shop_id', orderData.shopId)
            .eq('customer_email', orderData.customerEmail)
            .eq('pickup_date', orderData.selectedDate)
            .eq('status', 'pending')
            .is('product_id', null) // Commandes custom uniquement
            .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Dans les 5 dernières minutes
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Erreur vérification commande custom existante:', checkError);
            return json({ error: 'Erreur lors de la vérification' }, { status: 500 });
        }

        // Si une commande similaire existe déjà, retourner l'ID existant
        if (existingOrder) {
            console.log('✅ Commande custom existante trouvée, pas de recréation');
            return json({ success: true, orderId: existingOrder.id });
        }

        // Transformer les données de personnalisation (IDs → Labels)
        const transformedCustomizationData: Record<string, string | string[]> = {};
        if (orderData.selectedOptions && Object.keys(orderData.selectedOptions).length > 0) {
            // Récupérer le formulaire custom de la boutique
            const { data: customForm } = await locals.supabase
                .from('forms')
                .select('id')
                .eq('shop_id', orderData.shopId)
                .eq('is_custom_form', true)
                .single();

            if (customForm?.id) {
                // Récupérer les champs du formulaire custom pour mapper les IDs vers les labels
                const { data: customFields } = await locals.supabase
                    .from('form_fields')
                    .select('id, label, type')
                    .eq('form_id', customForm.id)
                    .order('order');

                if (customFields) {
                    customFields.forEach((field: { id: string; label: string; type: string }) => {
                        const fieldValue = orderData.selectedOptions[field.id];
                        if (fieldValue) {
                            // Stocker directement avec le libellé au lieu de l'ID
                            transformedCustomizationData[field.label] = fieldValue;
                        }
                    });
                }
            }
        }

        console.log('📝 Données de personnalisation transformées:', transformedCustomizationData);

        // Créer la commande dans la base de données
        const { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .insert({
                shop_id: orderData.shopId,
                product_id: null, // Pas de produit pour les commandes custom
                customer_name: orderData.customerName,
                customer_email: orderData.customerEmail,
                customer_phone: orderData.customerPhone || null,
                customer_instagram: orderData.customerInstagram || null,
                pickup_date: orderData.selectedDate,
                additional_information: orderData.additionalInfo || null,
                customization_data: transformedCustomizationData,
                status: 'pending',
                total_amount: orderData.estimatedPrice || 0,
                product_name: 'Demande personnalisée'
            })
            .select()
            .single();

        if (orderError) {
            console.error('Erreur création commande custom:', orderError);
            return json({ error: 'Erreur lors de la création de la commande' }, { status: 500 });
        }

        return json({ success: true, orderId: order.id, redirectUrl: `/${orderData.shopSlug}/order/${order.id}` });
    } catch (error) {
        console.error('Erreur création commande custom:', error);
        return json({ error: 'Erreur lors de la création de la commande' }, { status: 500 });
    }
}; 