import { z } from 'zod';
import { createFaqSchema, updateFaqSchema } from '$lib/validations';

// Schéma pour le formulaire (peut inclure l'ID pour l'édition)
export const formSchema = createFaqSchema.extend({
    id: z.string().optional()
});

export type FormSchema = typeof formSchema;

// Schémas pour les actions
export { createFaqSchema, updateFaqSchema };
