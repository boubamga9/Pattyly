import { z } from 'zod';
import { createCustomOrderSchema, createDynamicCustomOrderSchema } from '$lib/validations/schemas/order.js';

// Ré-export du schéma de base
export { createCustomOrderSchema };

// Type exporté pour TypeScript
export type CreateCustomOrderForm = z.infer<typeof createCustomOrderSchema>;

// Interface pour les champs personnalisés
export interface CustomField {
    id: string;
    label: string;
    type: 'short-text' | 'long-text' | 'number' | 'single-select' | 'multi-select';
    required: boolean;
    options?: Array<{ label: string; price?: number }>;
}

// Fonction pour créer le schéma dynamique
export function createLocalDynamicSchema(fields: CustomField[]) {
    return createDynamicCustomOrderSchema(fields);
}
