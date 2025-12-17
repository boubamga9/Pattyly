import { z } from 'zod';
import { createShopSchema } from '$lib/validations';
import { paypalMeSchema } from '$lib/validations/schemas/payment';

// Schéma spécifique pour l'onboarding qui étend createShopSchema
// et ajoute le champ logo pour l'upload de fichier et paypal_me
export const onboardingSchema = createShopSchema.extend({
    logo: z.instanceof(File).optional(),
    paypal_me: paypalMeSchema.optional()
});

// Schéma pour l'étape 1 (création de boutique sans paypal_me)
export const shopCreationSchema = createShopSchema.extend({
    logo: z.instanceof(File).optional()
});

// Schéma pour l'étape 2 (configuration PayPal.me) - gardé pour rétrocompatibilité
export const paypalConfigSchema = z.object({
    paypal_me: paypalMeSchema
});

// Schéma pour l'étape 2 (configuration des méthodes de paiement - PayPal et/ou Revolut)
// Note: Utilise .transform() pour convertir les chaînes vides en undefined, car Superforms
// ne supporte pas les unions dans FormData. On valide seulement si la valeur existe.
export const paymentConfigSchema = z.object({
    // PayPal optionnel - les chaînes vides seront transformées en undefined
    paypal_me: z.string()
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
        ),
    // Revolut optionnel - les chaînes vides seront transformées en undefined
    revolut_me: z.string()
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
        )
}).refine(
    (data) => {
        const hasPaypal = data.paypal_me && data.paypal_me.trim() !== '';
        const hasRevolut = data.revolut_me && data.revolut_me.trim() !== '';
        return hasPaypal || hasRevolut;
    },
    {
        message: 'Vous devez configurer au moins une méthode de paiement',
        path: ['paypal_me'] // Erreur sur le premier champ si aucun n'est rempli
    }
);

export const formSchema = onboardingSchema;
export type FormSchema = typeof formSchema;
