import { z } from 'zod';
import { updateShopSchema } from '$lib/validations';

// Étendre le schéma pour inclure les champs manquants
export const shopFormSchema = updateShopSchema.extend({
    logo: z.instanceof(File).optional(),
    logo_url: z.string().optional()
});

export const formSchema = shopFormSchema;
export type FormSchema = typeof formSchema;
