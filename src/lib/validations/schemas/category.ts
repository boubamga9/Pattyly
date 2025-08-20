import { z } from 'zod';
import { uuidSchema } from './common';

/**
 * Schémas de validation pour les catégories de produits
 * Gère la création, mise à jour et gestion des catégories par boutique
 */

// ===== SCHÉMAS DE CATÉGORIES =====

// Catégorie de produits (créée par le chef)
export const categorySchema = z.object({
    id: uuidSchema,
    name: z
        .string()
        .min(2, 'Le nom de la catégorie doit faire au moins 2 caractères')
        .max(30, 'Le nom de la catégorie ne peut pas dépasser 30 caractères')
        .trim(),
    shop_id: uuidSchema
});

// Création d'une nouvelle catégorie
export const createCategorySchema = categorySchema.omit({
    id: true,
    shop_id: true
});

// Mise à jour d'une catégorie
export const updateCategorySchema = categorySchema.pick({
    name: true
});

// Suppression d'une catégorie
export const deleteCategorySchema = categorySchema.pick({
    id: true
});

// ===== TYPES EXPORTÉS =====

export type Category = z.infer<typeof categorySchema>;
export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type DeleteCategory = z.infer<typeof deleteCategorySchema>;
