import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/auth';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import Stripe from 'stripe';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { makeQuoteFormSchema, rejectOrderFormSchema, personalNoteFormSchema } from './schema.js';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        // Récupérer l'utilisateur connecté
        const {
            data: { user },
        } = await locals.supabase.auth.getUser();

        if (!user) {
            throw error(401, 'Non autorisé');
        }

        // Récupérer les permissions et l'ID de la boutique
        const permissions = await getUserPermissions(user.id, locals.supabase);
        const shopId = permissions.shopId;

        if (!shopId) {
            throw error(404, 'Boutique non trouvée');
        }

        // Récupérer la commande
        const { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .select(`
				*,
				products(name, description, image_url, base_price),
				shops(name, slug)
			`)
            .eq('id', params.id)
            .eq('shop_id', shopId)
            .single();

        if (orderError || !order) {
            throw error(404, 'Commande non trouvée');
        }

        // Récupérer le montant payé (priorité à la DB, fallback Stripe)
        let paidAmount = order.paid_amount;
        if (!paidAmount && order.stripe_payment_intent_id) {
            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
                paidAmount = paymentIntent.amount / 100; // Stripe stocke en centimes
            } catch (stripeError) {
                console.error('Erreur récupération Stripe:', stripeError);
                // On continue sans le montant Stripe
            }
        }

        // Récupérer la note personnelle
        const { data: personalNote, error: noteError } = await locals.supabase
            .from('personal_order_notes')
            .select('note, updated_at')
            .eq('order_id', params.id)
            .eq('shop_id', shopId)
            .single();

        if (noteError && noteError.code !== 'PGRST116') {
            console.error('Erreur récupération note:', noteError);
        }

        // Récupérer les informations de la boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, slug')
            .eq('id', shopId)
            .single();

        if (shopError || !shop) {
            throw error(404, 'Boutique non trouvée');
        }

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
            shop,
            paidAmount,
            personalNote: personalNote || null,
            makeQuoteForm,
            rejectOrderForm,
            personalNoteForm
        };
    } catch (err) {
        console.error('Erreur load order detail page:', err);
        throw err;
    }
};

export const actions: Actions = {
    // Sauvegarder/modifier la note personnelle
    savePersonalNote: async ({ request, params, locals }) => {
        try {
            // Valider avec Superforms
            const form = await superValidate(request, zod(personalNoteFormSchema));

            if (!form.valid) {
                return fail(400, { form });
            }

            const { note } = form.data;

            if (!note || !note.trim()) {
                return fail(400, { form, error: 'La note ne peut pas être vide' });
            }

            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Insérer ou mettre à jour la note
            const { error: upsertError } = await locals.supabase
                .from('personal_order_notes')
                .upsert({
                    order_id: params.id,
                    shop_id: shop.id,
                    note: note.trim()
                }, {
                    onConflict: 'order_id,shop_id'
                });

            if (upsertError) {
                console.error('Erreur sauvegarde note:', upsertError);
                return fail(500, { error: 'Erreur lors de la sauvegarde' });
            }

            // Retourner le succès avec le formulaire Superforms
            form.message = 'Note sauvegardée avec succès';
            return { form };
        } catch (err) {
            console.error('Erreur savePersonalNote:', err);
            return fail(500, { error: 'Erreur serveur' });
        }
    },

    // Faire un devis pour une commande en attente
    makeQuote: async ({ request, params, locals }) => {
        console.log('🔍 Action makeQuote appelée !');
        try {
            // Valider avec Superforms
            const form = await superValidate(request, zod(makeQuoteFormSchema));

            if (!form.valid) {
                return fail(400, { form });
            }

            const { price, chef_message: chefMessage, chef_pickup_date: chefPickupDate } = form.data;

            if (!price) {
                return fail(400, { form, error: 'Le prix est requis' });
            }

            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Mettre à jour la commande
            const updateData: {
                status: 'quoted';
                total_amount: number;
                chef_message: string | null;
                chef_pickup_date?: string;
            } = {
                status: 'quoted',
                total_amount: price,
                chef_message: chefMessage || null
            };

            // Ajouter la nouvelle date de récupération si fournie
            if (chefPickupDate) {
                updateData.chef_pickup_date = chefPickupDate;
            }

            const { error: updateError } = await locals.supabase
                .from('orders')
                .update(updateData)
                .eq('id', params.id)
                .eq('shop_id', shop.id);

            if (updateError) {
                console.error('Erreur mise à jour commande:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            // Retourner le succès avec le formulaire Superforms
            form.message = 'Devis envoyé avec succès';
            return { form };
        } catch (err) {
            console.error('Erreur makeQuote:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Refuser une commande
    rejectOrder: async ({ request, params, locals }) => {
        try {
            // Valider avec Superforms
            const form = await superValidate(request, zod(rejectOrderFormSchema));

            if (!form.valid) {
                return fail(400, { form });
            }

            const { chef_message: chefMessage } = form.data;

            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Mettre à jour la commande
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
                console.error('Erreur mise à jour commande:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            // Retourner le succès avec le formulaire Superforms
            form.message = 'Commande refusée avec succès';
            return { form };
        } catch (err) {
            console.error('Erreur rejectOrder:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Marquer une commande comme prête
    makeOrderReady: async ({ params, locals }) => {
        try {
            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Mettre à jour la commande
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'ready' })
                .eq('id', params.id)
                .eq('shop_id', shop.id);

            if (updateError) {
                console.error('Erreur mise à jour commande:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande marquée comme prête' };
        } catch (err) {
            console.error('Erreur makeOrderReady:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Marquer une commande comme terminée
    makeOrderCompleted: async ({ params, locals }) => {
        try {
            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Mettre à jour la commande
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'completed' })
                .eq('id', params.id)
                .eq('shop_id', shop.id);

            if (updateError) {
                console.error('Erreur mise à jour commande:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande marquée comme terminée' };
        } catch (err) {
            console.error('Erreur makeOrderCompleted:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Annuler une commande avec devis
    cancelOrder: async ({ params, locals }) => {
        try {
            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Vérifier que la commande a le statut "quoted"
            const { data: order, error: orderError } = await locals.supabase
                .from('orders')
                .select('status')
                .eq('id', params.id)
                .eq('shop_id', shop.id)
                .single();

            if (orderError || !order) {
                return fail(404, { error: 'Commande non trouvée' });
            }

            if (order.status !== 'quoted') {
                return fail(400, { error: 'Seules les commandes avec devis peuvent être annulées' });
            }

            // Mettre à jour la commande
            const { error: updateError } = await locals.supabase
                .from('orders')
                .update({ status: 'refused', refused_by: 'pastry_chef' })
                .eq('id', params.id)
                .eq('shop_id', shop.id);

            if (updateError) {
                console.error('Erreur mise à jour commande:', updateError);
                return fail(500, { error: 'Erreur lors de la mise à jour de la commande' });
            }

            return { message: 'Commande annulée avec succès' };
        } catch (err) {
            console.error('Erreur cancelOrder:', err);
            return fail(500, { error: 'Erreur interne' });
        }
    },

    // Supprimer la note personnelle
    deletePersonalNote: async ({ params, locals }) => {
        try {
            // Récupérer l'utilisateur connecté
            const {
                data: { user },
            } = await locals.supabase.auth.getUser();

            if (!user) {
                return fail(401, { error: 'Non autorisé' });
            }

            // Récupérer la boutique de l'utilisateur via profile_id
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (shopError || !shop) {
                return fail(404, { error: 'Boutique non trouvée' });
            }

            // Supprimer la note
            const { error: deleteError } = await locals.supabase
                .from('personal_order_notes')
                .delete()
                .eq('order_id', params.id)
                .eq('shop_id', shop.id);

            if (deleteError) {
                console.error('Erreur suppression note:', deleteError);
                return fail(500, { error: 'Erreur lors de la suppression' });
            }

            return { success: true, message: 'Note supprimée avec succès' };
        } catch (err) {
            console.error('Error deletePersonalNote:', err);
            return fail(500, { error: 'Erreur serveur' });
        }
    }
};
