import { z } from 'zod';
import { nameSchema, emailSchema, messageSchema } from './common';

/**
 * Schémas de validation pour le formulaire de contact
 * Gère les messages de contact des visiteurs du site
 */

// ===== SCHÉMAS DE BASE =====

// Sujet du message de contact
export const subjectSchema = z
    .string()
    .min(2, 'Le sujet doit faire au moins 2 caractères')
    .max(100, 'Le sujet ne peut pas dépasser 100 caractères')
    .trim();

// ===== SCHÉMAS COMPOSÉS =====

// Formulaire de contact complet
export const contactSchema = z.object({
    name: nameSchema,           // Nom du contact
    email: emailSchema,         // Email du contact
    subject: subjectSchema,     // Sujet du message
    body: z.string()            // Corps du message (requis)
        .min(1, 'Le message est requis')
        .max(500, 'Le message ne peut pas dépasser 500 caractères')
        .trim()
});

// ===== TYPES EXPORTÉS =====

export type Subject = z.infer<typeof subjectSchema>;
export type Contact = z.infer<typeof contactSchema>;
