import { z } from 'zod';
import { uuidSchema, descriptionSchema, priceSchema, urlSchema, productNameSchema } from './common';

/**
 * Schémas de validation pour les produits
 * Gère la création, mise à jour et gestion des produits de pâtisserie
 */

// ===== SCHÉMAS DE PRODUITS =====

// Produit de base
export const productBaseSchema = z.object({
    id: uuidSchema,
    shop_id: uuidSchema,              // Lien vers la boutique
    name: productNameSchema,          // Nom du produit (sans chiffres)
    description: descriptionSchema,   // Description (optionnelle, max 1000 caractères)
    image_url: urlSchema,             // Image du produit (optionnelle)
    base_price: priceSchema,          // Prix de base (0 à 10 000€)
    category_id: uuidSchema,          // Lien vers la catégorie
    form_id: uuidSchema,              // Lien vers le formulaire de personnalisation
    min_days_notice: z
        .number()
        .int()
        .min(0, 'Le délai minimum doit être positif')
        .max(365, 'Le délai maximum est de 365 jours')
});

// Création d'un nouveau produit
export const createProductSchema = productBaseSchema.omit({
    id: true,
    shop_id: true
});

// Mise à jour d'un produit
export const updateProductSchema = productBaseSchema.pick({
    name: true,
    description: true,
    image_url: true,
    base_price: true,
    category_id: true,
    form_id: true,
    min_days_notice: true
});

// ===== TYPES EXPORTÉS =====

export type ProductBase = z.infer<typeof productBaseSchema>;
export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
