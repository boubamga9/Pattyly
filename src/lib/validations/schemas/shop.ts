import { z } from 'zod';
import { uuidSchema, shopNameSchema, slugSchema, descriptionSchema, urlSchema, socialUsernameSchema } from './common';

/**
 * Schémas de validation pour la configuration des boutiques
 * Gère uniquement la création, mise à jour et configuration de base des boutiques
 */

// ===== SCHÉMAS DE BASE =====

// Configuration de base d'une boutique
export const shopBaseSchema = z.object({
    id: uuidSchema,
    profile_id: uuidSchema,           // Lien vers le profil utilisateur
    name: shopNameSchema,             // Nom de la boutique
    slug: slugSchema,                 // URL-friendly (ex: /ma-boutique)
    bio: descriptionSchema,           // Description courte (optionnelle)
    logo_url: urlSchema,              // Logo (optionnel)
    instagram: socialUsernameSchema,  // Username Instagram (optionnel)
    tiktok: socialUsernameSchema,     // Username TikTok (optionnel)
    website: urlSchema,               // Site web (optionnel)
    is_custom_accepted: z.boolean().default(false), // Accepte les demandes sur mesure
    is_active: z.boolean().default(true)            // Boutique visible publiquement
});

// ===== SCHÉMAS COMPOSÉS =====

// Création d'une nouvelle boutique (onboarding)
export const createShopSchema = shopBaseSchema.omit({
    id: true,
    profile_id: true,
    is_custom_accepted: true,
    is_active: true
});

// Mise à jour des informations de boutique
export const updateShopSchema = shopBaseSchema.pick({
    name: true,
    slug: true,
    bio: true,
    logo_url: true,
    instagram: true,
    tiktok: true,
    website: true
});

// Mise à jour du statut des demandes sur mesure
export const toggleCustomRequestsSchema = z.object({
    is_custom_accepted: z.boolean()
});

// Mise à jour de la visibilité de la boutique
export const toggleShopVisibilitySchema = z.object({
    is_active: z.boolean()
});

// ===== TYPES EXPORTÉS =====

export type ShopBase = z.infer<typeof shopBaseSchema>;
export type CreateShop = z.infer<typeof createShopSchema>;
export type UpdateShop = z.infer<typeof updateShopSchema>;
export type ToggleCustomRequests = z.infer<typeof toggleCustomRequestsSchema>;
export type ToggleShopVisibility = z.infer<typeof toggleShopVisibilitySchema>;
