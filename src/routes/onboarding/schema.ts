import { z } from 'zod';
import { createShopSchema } from '$lib/validations';
import { 
    paypalMeSchema,
    paypalMeOptionalSchema,
    revolutMeOptionalSchema,
    weroMeOptionalSchema
} from '$lib/validations/schemas/payment';

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

// Schéma pour l'étape 2 (configuration des méthodes de paiement - PayPal, Revolut et/ou Wero)
// Note: Utilise .transform() pour convertir les chaînes vides en undefined, car Superforms
// ne supporte pas les unions dans FormData. On valide seulement si la valeur existe.
export const paymentConfigSchema = z.object({
    // PayPal optionnel - les chaînes vides seront transformées en undefined
    paypal_me: paypalMeOptionalSchema,
    // Revolut optionnel - les chaînes vides seront transformées en undefined
    revolut_me: revolutMeOptionalSchema,
    // Wero optionnel - les chaînes vides seront transformées en undefined
    wero_me: weroMeOptionalSchema
}).refine(
    (data) => {
        const hasPaypal = data.paypal_me !== undefined && data.paypal_me !== null;
        const hasRevolut = data.revolut_me !== undefined && data.revolut_me !== null;
        const hasWero = data.wero_me !== undefined && data.wero_me !== null;
        return hasPaypal || hasRevolut || hasWero;
    },
    {
        message: 'Vous devez configurer au moins une méthode de paiement',
        path: ['paypal_me'] // Erreur sur le premier champ si aucun n'est rempli
    }
);

export const formSchema = onboardingSchema;
export type FormSchema = typeof formSchema;
