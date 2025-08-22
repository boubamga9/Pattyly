import { z } from 'zod';
import { uuidSchema, nameSchema, emailSchema, messageSchema, priceSchema, futureDateSchema } from './common';
import { customizationResponseSchema, createDynamicCustomizationSchema } from './form';

/**
 * Schémas de validation pour les commandes et devis
 * Gère la création, mise à jour et gestion des commandes de produits et demandes sur mesure
 */

// ===== STATUTS =====

// Statuts possibles d'une commande
export const orderStatusSchema = z.enum([
    'pending',      // En attente de devis
    'quoted',       // Devis envoyé
    'confirmed',    // Commande confirmée
    'ready',        // Prête à être récupérée
    'refused',      // Refusée
    'completed'     // Terminée
]);

// Qui a refusé la commande
export const refusedBySchema = z.enum([
    'pastry_chef',  // Refusé par le pâtissier
    'client'        // Refusé par le client
]);

// ===== SCHÉMAS DE BASE =====

// Commande de base (tous les champs)
export const orderBaseSchema = z.object({
    id: uuidSchema,
    shop_id: uuidSchema,                    // Lien vers la boutique
    product_id: uuidSchema.optional(),      // Lien vers le produit (null pour demande sur mesure)
    customer_name: nameSchema,              // Nom du client
    customer_email: emailSchema,            // Email du client
    customer_phone: z.string().optional(),  // Téléphone du client (optionnel)
    customer_instagram: z.string().optional(), // Instagram du client (optionnel)
    pickup_date: futureDateSchema,          // Date de retrait (future uniquement)
    additional_information: messageSchema.optional(), // Informations supplémentaires (optionnel)
    customization_data: customizationResponseSchema.optional(), // Réponses au formulaire
    status: orderStatusSchema,
    refused_by: refusedBySchema.optional(), // Qui a refusé (si applicable)
    total_amount: priceSchema.optional(),   // Prix final (null si pas encore devisé)
    chef_message: messageSchema,            // Message du chef (utilise messageSchema de common)
    stripe_payment_intent_id: z.string().optional() // ID de paiement Stripe
});

// ===== SCHÉMAS COMPOSÉS =====

// Création d'une commande (côté client)
export const createOrderSchema = orderBaseSchema.omit({
    id: true,
    shop_id: true,
    status: true,
    refused_by: true,
    total_amount: true,
    chef_message: true,
    stripe_payment_intent_id: true
});

// Création d'une demande personnalisée (côté client)
export const createCustomOrderSchema = orderBaseSchema.omit({
    id: true,
    shop_id: true,
    product_id: true,        // Pas de produit pour les demandes custom
    status: true,
    refused_by: true,
    total_amount: true,
    chef_message: true,
    stripe_payment_intent_id: true
});

// Fonction pour créer un schéma de commande personnalisée avec validation dynamique
export function createDynamicCustomOrderSchema(fields: Array<{
    id: string;
    label: string;
    type: 'short-text' | 'long-text' | 'number' | 'single-select' | 'multi-select';
    required: boolean;
    options?: Array<{ label: string; price?: number }>;
}>) {
    return z.object({
        customer_name: nameSchema,
        customer_email: emailSchema,
        customer_phone: z.string().optional(),
        customer_instagram: z.string().optional(),
        pickup_date: futureDateSchema,
        customization_data: createDynamicCustomizationSchema(fields),
        additional_information: messageSchema.optional()
    });
}

// Mise à jour du statut d'une commande
export const updateOrderStatusSchema = z.object({
    status: orderStatusSchema
});

// Envoi d'un devis (changer le statut en 'quoted')
export const sendQuoteSchema = z.object({
    total_amount: priceSchema,              // Prix du devis
    chef_message: messageSchema.optional()  // Message du chef
});

// Refus d'une commande (changer le statut en 'refused')
export const refuseOrderSchema = z.object({
    refused_by: z.literal('pastry_chef'),   // Toujours le pâtissier qui refuse
    chef_message: messageSchema.optional()  // Message du chef
});

// ===== TYPES EXPORTÉS =====

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type RefusedBy = z.infer<typeof refusedBySchema>;

export type OrderBase = z.infer<typeof orderBaseSchema>;
export type CreateOrder = z.infer<typeof createOrderSchema>;
export type CreateCustomOrder = z.infer<typeof createCustomOrderSchema>;
export type UpdateOrderStatus = z.infer<typeof updateOrderStatusSchema>;
export type SendQuote = z.infer<typeof sendQuoteSchema>;
export type RefuseOrder = z.infer<typeof refuseOrderSchema>;

