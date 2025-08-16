import { z } from 'zod';
import { createShopSchema } from '$lib/validations';

// Schéma spécifique pour l'onboarding qui étend createShopSchema
// et ajoute le champ logo pour l'upload de fichier
export const onboardingSchema = createShopSchema.extend({
    logo: z.instanceof(File).optional()
});

export const formSchema = onboardingSchema;
export type FormSchema = typeof formSchema;
