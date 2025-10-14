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

// Schéma pour l'étape 2 (configuration PayPal.me)
export const paypalConfigSchema = z.object({
    paypal_me: paypalMeSchema
});

export const formSchema = onboardingSchema;
export type FormSchema = typeof formSchema;
