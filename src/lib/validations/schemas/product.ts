import { z } from 'zod';
import { uuidSchema, descriptionSchema, priceSchema, urlSchema, productNameSchema } from './common';

/**
 * Schémas de validation pour les produits
 * Gère la création, mise à jour et gestion des produits de pâtisserie
 */

// ===== SCHÉMAS D'IMAGES DE PRODUIT =====

// Schéma pour une image de produit
export const productImageSchema = z.object({
    id: uuidSchema.optional(),
    image_url: urlSchema,
    public_id: z.string().optional(),
    display_order: z.number().int().min(0).max(2).default(0)
});

// ===== SCHÉMAS DE PRODUITS =====

// Produit de base
export const productBaseSchema = z.object({
    id: uuidSchema,
    shop_id: uuidSchema,              // Lien vers la boutique
    name: productNameSchema,          // Nom du produit (sans chiffres)
    description: descriptionSchema,   // Description (optionnelle, max 1000 caractères)
    image_url: urlSchema,             // Image du produit (optionnelle) - DEPRECATED: utiliser product_images
    base_price: priceSchema,          // Prix de base (0 à 10 000€)
    category_id: uuidSchema,          // Lien vers la catégorie
    form_id: uuidSchema,              // Lien vers le formulaire de personnalisation
    cake_type: z.string().max(50, 'Le type de gâteau ne doit pas dépasser 50 caractères').optional().nullable(), // Type de gâteau (anniversaire, mariage, etc.)
    min_days_notice: z.preprocess(
        (val) => {
            // Convertir string → number avant validation
            if (typeof val === 'string') {
                const num = parseInt(val);
                return isNaN(num) ? val : num; // Retourner val si pas un nombre pour que Zod gère l'erreur
            }
            return val;
        },
        z.number({
            required_error: 'Le délai est requis',
            invalid_type_error: 'Le délai doit être un nombre'
        }).int().min(0, 'Le délai minimum doit être positif').max(365, 'Le délai maximum est de 365 jours')
    ),
    deposit_percentage: z.preprocess(
        (val) => {
            // Convertir string → number avant validation
            if (typeof val === 'string') {
                const num = parseInt(val);
                return isNaN(num) ? val : num;
            }
            return val;
        },
        z.number({
            required_error: 'Le pourcentage d\'acompte est requis',
            invalid_type_error: 'Le pourcentage d\'acompte doit être un nombre'
        }).int().min(0, 'Le pourcentage doit être entre 0 et 100').max(100, 'Le pourcentage doit être entre 0 et 100')
    ).default(50)
});

// Création d'un nouveau produit
export const createProductSchema = productBaseSchema.omit({
    id: true,
    shop_id: true,
    image_url: true // Retiré car on utilise maintenant product_images
});
// Note: images ne sont pas dans le schéma car elles sont gérées manuellement via FormData

// Mise à jour d'un produit
export const updateProductSchema = productBaseSchema.pick({
    name: true,
    description: true,
    base_price: true,
    category_id: true,
    form_id: true,
    cake_type: true,
    min_days_notice: true,
    deposit_percentage: true
});
// Note: images ne sont pas dans le schéma car elles sont gérées manuellement via FormData

// ===== TYPES EXPORTÉS =====

export type ProductBase = z.infer<typeof productBaseSchema>;
export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
