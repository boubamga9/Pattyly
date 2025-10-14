import { z } from 'zod';

/**
 * Schémas de validation pour les méthodes de paiement
 */

// ===== SCHÉMAS DE BASE =====

// Validation du PayPal.me username
export const paypalMeSchema = z
    .string()
    .min(1, 'Le nom PayPal.me est requis')
    .max(50, 'Le nom PayPal.me ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Le nom PayPal.me ne peut contenir que des lettres, chiffres, tirets et underscores')
    .transform((val) => val.toLowerCase()); // Normaliser en minuscules

// Configuration d'un lien de paiement PayPal
export const paymentLinkSchema = z.object({
    id: z.string().uuid(),
    profile_id: z.string().uuid(),
    paypal_me: paypalMeSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
});

// Création d'un lien de paiement (onboarding)
export const createPaymentLinkSchema = z.object({
    paypal_me: paypalMeSchema
});

// Mise à jour d'un lien de paiement
export const updatePaymentLinkSchema = z.object({
    paypal_me: paypalMeSchema
});

// ===== TYPES EXPORTÉS =====

export type PaymentLink = z.infer<typeof paymentLinkSchema>;
export type CreatePaymentLink = z.infer<typeof createPaymentLinkSchema>;
export type UpdatePaymentLink = z.infer<typeof updatePaymentLinkSchema>;
