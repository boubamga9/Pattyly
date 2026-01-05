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

// Validation de l'identifiant Revolut
export const revolutMeSchema = z
    .string()
    .min(1, 'L\'identifiant Revolut est requis')
    .max(100, 'L\'identifiant Revolut ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-Z0-9_@.-]+$/, 'L\'identifiant Revolut contient des caractères invalides')
    .transform((val) => val.trim());

// Validation de l'identifiant Wero (email ou numéro de téléphone)
export const weroMeSchema = z
    .string()
    .min(1, 'L\'identifiant Wero est requis')
    .max(100, 'L\'identifiant Wero ne peut pas dépasser 100 caractères')
    .refine(
        (val) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^\+?[0-9]{10,15}$/;
            return emailRegex.test(val) || phoneRegex.test(val);
        },
        {
            message: 'L\'identifiant Wero doit être un email valide ou un numéro de téléphone'
        }
    )
    .transform((val) => val.trim());

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

// ===== SCHÉMAS OPTIONNELS POUR paymentConfigSchema =====
// Ces schémas gèrent les chaînes vides en les transformant en undefined
// pour être utilisés dans paymentConfigSchema où les champs sont optionnels

export const paypalMeOptionalSchema = z
    .string()
    .optional()
    .transform((val) => {
        if (!val || val.trim() === '') return undefined;
        return val.toLowerCase().trim();
    })
    .refine(
        (val) => {
            if (val === undefined) return true; // Optionnel
            return /^[a-zA-Z0-9_-]+$/.test(val) && val.length >= 1 && val.length <= 50;
        },
        {
            message: 'Le nom PayPal.me ne peut contenir que des lettres, chiffres, tirets et underscores (max 50 caractères)'
        }
    );

export const revolutMeOptionalSchema = z
    .string()
    .optional()
    .transform((val) => {
        if (!val || val.trim() === '') return undefined;
        return val.trim();
    })
    .refine(
        (val) => {
            if (val === undefined) return true; // Optionnel
            return /^[a-zA-Z0-9_@.-]+$/.test(val) && val.length >= 1 && val.length <= 100;
        },
        {
            message: 'L\'identifiant Revolut contient des caractères invalides (max 100 caractères)'
        }
    );

export const weroMeOptionalSchema = z
    .string()
    .optional()
    .transform((val) => {
        if (!val || val.trim() === '') return undefined;
        return val.trim();
    })
    .refine(
        (val) => {
            if (val === undefined) return true; // Optionnel
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^\+?[0-9]{10,15}$/;
            return (emailRegex.test(val) || phoneRegex.test(val)) && val.length <= 100;
        },
        {
            message: 'L\'identifiant Wero doit être un email valide ou un numéro de téléphone (max 100 caractères)'
        }
    );

// ===== TYPES EXPORTÉS =====

export type PaymentLink = z.infer<typeof paymentLinkSchema>;
export type CreatePaymentLink = z.infer<typeof createPaymentLinkSchema>;
export type UpdatePaymentLink = z.infer<typeof updatePaymentLinkSchema>;
