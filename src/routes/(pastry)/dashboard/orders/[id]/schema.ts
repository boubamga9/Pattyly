import { z } from 'zod';
import { priceSchema, timeSlotSchema } from '$lib/validations/schemas/common.js';

// Schéma pour le formulaire de devis
export const makeQuoteFormSchema = z.object({
    price: priceSchema,
    chef_message: z.string().max(500, 'Le message ne peut pas dépasser 500 caractères').optional(),
    chef_pickup_date: z.string().optional(),
    chef_pickup_time: timeSlotSchema.optional()
});

// Schéma pour le formulaire de rejet
export const rejectOrderFormSchema = z.object({
    chef_message: z.string().max(500, 'Le message ne peut pas dépasser 500 caractères').optional()
});

// Schéma pour la note personnelle
export const personalNoteFormSchema = z.object({
    note: z.string().max(1000, 'La note ne peut pas dépasser 1000 caractères').optional()
});

// Types exportés
export type MakeQuoteForm = z.infer<typeof makeQuoteFormSchema>;
export type RejectOrderForm = z.infer<typeof rejectOrderFormSchema>;
export type PersonalNoteForm = z.infer<typeof personalNoteFormSchema>;
