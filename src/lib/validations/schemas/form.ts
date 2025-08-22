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

// ===== 3.1. CHAMP DE PERSONNALISATION (pour les formulaires) =====

export const customizationFieldSchema = z.object({
    id: z.string().optional(),           // Optionnel pour les nouveaux champs
    label: z.string().min(1, 'Le libellé est requis').max(100, 'Max 100 caractères'),
    type: fieldTypeSchema,
    required: z.boolean().default(false),
    options: z.array(z.object({
        label: z.string().min(1, 'Le libellé est requis').max(50, 'Max 50 caractères'),
        price: z.number().min(0, 'Le prix doit être positif').optional()
    })).optional().default([])
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

// Fonction pour créer un schéma de validation dynamique basé sur les champs configurés
export function createDynamicCustomizationSchema(fields: Array<{
    id: string;
    label: string;
    type: 'short-text' | 'long-text' | 'number' | 'single-select' | 'multi-select';
    required: boolean;
    options?: Array<{ label: string; price?: number }>;
}>) {
    const shape: Record<string, any> = {};

    for (const field of fields) {
        let validator: any;

        switch (field.type) {
            case 'short-text':
                validator = z.string();
                if (field.required) {
                    validator = validator.min(2, `${field.label} est requis`);
                }
                break;

            case 'long-text':
                validator = z.string();
                if (field.required) {
                    validator = validator.min(1, `${field.label} est requis`);
                }
                break;

            case 'number':
                validator = z.number().min(0, `${field.label} doit être positif`);
                if (!field.required) {
                    validator = validator.optional();
                }
                break;

            case 'single-select':
                validator = z.string();
                if (field.required) {
                    validator = validator.min(1, `${field.label} est requis`);
                } else {
                    validator = validator.optional();
                }

                if (field.options && field.options.length > 0) {
                    const validOptions = field.options.map(opt => opt.label);
                    validator = validator.refine(
                        (val: string | undefined) => !val || validOptions.includes(val),
                        `Veuillez sélectionner une option valide pour ${field.label}`
                    );
                }
                break;

            case 'multi-select':
                validator = z.array(z.string());
                if (field.required) {
                    validator = validator.min(1, `Veuillez sélectionner au moins une option pour ${field.label}`);
                } else {
                    validator = validator.optional();
                }

                if (field.options && field.options.length > 0) {
                    const validOptions = field.options.map(opt => opt.label);
                    validator = validator.refine(
                        (values: string[] | undefined) => !values || values.every(val => validOptions.includes(val)),
                        `Veuillez sélectionner des options valides pour ${field.label}`
                    );
                }
                break;
        }

        shape[field.id] = validator;
    }

    return z.object(shape);
}

// ===== 6. SCHÉMAS D'ACTION POUR LES FORMULAIRES PERSONNALISÉS =====

// Action pour activer/désactiver les demandes personnalisées
export const toggleCustomRequestsSchema = z.object({
    isCustomAccepted: z.string().transform((val) => val === 'true')
});

// Action pour mettre à jour le formulaire personnalisé
export const updateCustomFormSchema = z.object({
    title: z.string().max(200, 'Le titre ne peut pas dépasser 200 caractères').optional(),
    description: z.string().max(500, 'La description ne peut pas dépasser 500 caractères').optional(),
    customFields: z.array(customizationFieldSchema)
});

// ===== TYPES EXPORTÉS =====

export type FieldType = z.infer<typeof fieldTypeSchema>;
export type FormOption = z.infer<typeof formOptionSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type CustomizationField = z.infer<typeof customizationFieldSchema>;
export type ProductForm = z.infer<typeof productFormSchema>;
export type CustomForm = z.infer<typeof customFormSchema>;
export type Form = z.infer<typeof formSchema>;
export type CustomizationResponse = z.infer<typeof customizationResponseSchema>;
export type ToggleCustomRequests = z.infer<typeof toggleCustomRequestsSchema>;
export type UpdateCustomForm = z.infer<typeof updateCustomFormSchema>;
