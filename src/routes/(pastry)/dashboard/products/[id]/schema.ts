import { z } from 'zod';
import { updateProductSchema } from '$lib/validations/schemas/product.js';
import { customizationFieldSchema } from '$lib/validations/schemas/form.js';

// Schéma pour la modification de produit avec champs de personnalisation
export const updateProductFormSchema = updateProductSchema.omit({
    form_id: true // On ne l'a pas dans le formulaire, il sera géré côté serveur
}).extend({
    customizationFields: z.array(customizationFieldSchema).optional(),
    // Accepter category_id vide ou temporaire pour la validation côté client
    category_id: z.union([
        z.string().uuid('ID de catégorie invalide'),
        z.string().length(0, 'Catégorie optionnelle'),
        z.literal('temp-new-category')
    ]).optional()
});

// Ré-exporter le schéma de catégorie depuis le schéma des produits
export { createCategoryFormSchema } from '../schema.js';
