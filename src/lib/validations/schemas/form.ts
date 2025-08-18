import { z } from 'zod';
import { uuidSchema, priceSchema } from './common';

/**
 * Schémas de validation pour les formulaires de personnalisation
 * 
 * Il y a 2 types de formulaires :
 * 1. Formulaires de personnalisation de produits (is_custom_form = false)
 *    - Pas de title/description
 * 2. Formulaires personnalisés de boutique (is_custom_form = true)
 *    - Avec title/description optionnels
 * 
 * Structure : forms (table) ← form_fields (table)
 */

// ===== 1. TYPES DE CHAMPS DISPONIBLES =====

export const fieldTypeSchema = z.enum([
    'short-text',    // Ex: "Nom du gâteau"
    'long-text',     // Ex: "Description des goûts"
    'number',        // Ex: "Nombre de personnes"
    'single-select', // Ex: "Couleur" avec options Rouge/Blanc/Noir
    'multi-select'   // Ex: "Décorations" avec options multiples
]);

// ===== 2. OPTIONS AVEC PRIX =====

export const formOptionSchema = z.object({
    label: z.string().min(1, 'Le libellé est requis').max(50, 'Max 50 caractères'),
    price: priceSchema
});

// ===== 3. CHAMP DE FORMULAIRE (table form_fields) =====

export const formFieldSchema = z.object({
    id: uuidSchema,
    form_id: uuidSchema,              // Lien vers le formulaire parent
    label: z.string()
        .min(1, 'Le libellé est requis')
        .max(100, 'Max 100 caractères'),
    type: fieldTypeSchema,
    options: z.array(formOptionSchema).optional(),
    required: z.boolean().default(false),  // False par défaut
    order: z.number().int().min(0)
});

// ===== 4. FORMULAIRE (table forms) =====

// Formulaire de PRODUIT (sans title/description)
export const productFormSchema = z.object({
    id: uuidSchema,
    shop_id: uuidSchema,
    is_custom_form: z.literal(false)  // Toujours false pour les produits
});

// Formulaire PERSONNALISÉ (avec title/description)
export const customFormSchema = z.object({
    id: uuidSchema,
    shop_id: uuidSchema,
    is_custom_form: z.literal(true),  // Toujours true pour les formulaires personnalisés
    title: z.string().max(200).optional(),
    description: z.string().max(500).optional()
});

// Union des deux types de formulaires
export const formSchema = z.discriminatedUnion('is_custom_form', [
    productFormSchema,
    customFormSchema
]);

// ===== 5. RÉPONSES DES CLIENTS =====

export const customizationResponseSchema = z.record(
    z.string(), // LABEL du champ (ex: "Nombre de personnes")
    z.union([
        z.string(),           // Réponse texte
        z.number(),           // Réponse nombre
        z.array(z.string())   // Réponse sélection multiple
    ])
);

// ===== 6. SCHÉMAS D'ACTION POUR LES FORMULAIRES PERSONNALISÉS =====

// Action pour activer/désactiver les demandes personnalisées
export const toggleCustomRequestsSchema = z.object({
    isCustomAccepted: z.string().transform((val) => val === 'true')
});

// Action pour mettre à jour le formulaire personnalisé
export const updateCustomFormSchema = z.object({
    title: z.string().max(200, 'Le titre ne peut pas dépasser 200 caractères').optional(),
    description: z.string().max(500, 'La description ne peut pas dépasser 500 caractères').optional(),
    customFields: z.string().transform((val) => {
        try {
            return JSON.parse(val);
        } catch {
            throw new Error('Format des champs invalide');
        }
    }).refine((val) => Array.isArray(val), {
        message: 'Les champs doivent être un tableau'
    })
});

// ===== TYPES EXPORTÉS =====

export type FieldType = z.infer<typeof fieldTypeSchema>;
export type FormOption = z.infer<typeof formOptionSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type ProductForm = z.infer<typeof productFormSchema>;
export type CustomForm = z.infer<typeof customFormSchema>;
export type Form = z.infer<typeof formSchema>;
export type CustomizationResponse = z.infer<typeof customizationResponseSchema>;
export type ToggleCustomRequests = z.infer<typeof toggleCustomRequestsSchema>;
export type UpdateCustomForm = z.infer<typeof updateCustomFormSchema>;
