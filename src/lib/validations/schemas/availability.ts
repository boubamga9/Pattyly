import { z } from 'zod';
import { uuidSchema, timeSlotSchema } from './common';

/**
 * Schémas de validation pour la gestion des disponibilités
 * Gère les jours ouverts et les périodes d'indisponibilité des boutiques
 */

// ===== JOURS DE LA SEMAINE =====

// Jour de la semaine (0 = dimanche, 6 = samedi)
export const dayOfWeekSchema = z
    .number()
    .int()
    .min(0, 'Le jour doit être entre 0 et 6')
    .max(6, 'Le jour doit être entre 0 et 6');

// ===== SCHÉMAS DE BASE RÉUTILISABLES =====

// Schéma de base pour les dates (string pour input type="date")
export const dateStringSchema = z.string().min(1, 'Date requise');

// Schéma de base pour la validation des dates (début ≤ fin)
export const dateRangeSchema = z.object({
    startDate: dateStringSchema,
    endDate: dateStringSchema
}).refine(
    (data) => {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return start <= end;
    },
    {
        message: 'La date de début doit être antérieure ou égale à la date de fin',
        path: ['endDate']
    }
);

// ===== DISPONIBILITÉS QUOTIDIENNES =====

// Disponibilité d'un jour de la semaine
export const availabilitySchema = z.object({
    id: uuidSchema,
    shop_id: uuidSchema,
    day: dayOfWeekSchema,
    is_open: z.boolean(),
    daily_order_limit: z.number().int().nullable(),
    start_time: timeSlotSchema.nullable(),
    end_time: timeSlotSchema.nullable(),
    interval_time: z.string().nullable() // PostgreSQL INTERVAL as string
});

// Mise à jour de la disponibilité d'un jour (pour l'action updateAvailability)
export const updateAvailabilityActionSchema = z.object({
    availabilityId: uuidSchema,
    isAvailable: z.string().transform((val) => val === 'true'),
    dailyOrderLimit: z.number().int().nullable(),
    startTime: timeSlotSchema.nullable(),
    endTime: timeSlotSchema.nullable(),
    intervalTime: z.string().nullable() // PostgreSQL INTERVAL as string (e.g., "00:30:00")
});

// ===== PÉRIODES D'INDISPONIBILITÉ =====

// Période d'indisponibilité (vacances, congés, etc.)
export const unavailabilityBaseSchema = z.object({
    id: uuidSchema,
    shop_id: uuidSchema,
    start_date: dateStringSchema,
    end_date: dateStringSchema
}).refine(
    (data) => {
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        return start <= end;
    },
    {
        message: 'La date de début doit être antérieure ou égale à la date de fin',
        path: ['end_date']
    }
);

// Création d'une période d'indisponibilité (pour le formulaire)
export const createUnavailabilityFormSchema = dateRangeSchema;

// Action pour ajouter une indisponibilité (avec validation des chevauchements)
export const addUnavailabilityActionSchema = z.object({
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    existingUnavailabilities: z.array(z.object({
        start_date: z.string(),
        end_date: z.string()
    })).optional()
}).refine(
    (data) => {
        // Validation de base : début ≤ fin
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (start > end) {
            return false;
        }

        // Si pas de périodes existantes, pas de chevauchement possible
        if (!data.existingUnavailabilities || data.existingUnavailabilities.length === 0) {
            return true;
        }

        // Vérifier qu'il n'y a pas de chevauchement avec les périodes existantes
        return !data.existingUnavailabilities.some(existing => {
            const existingStart = new Date(existing.start_date);
            const existingEnd = new Date(existing.end_date);

            // Deux périodes se chevauchent si :
            // - La fin de la nouvelle est après le début de l'existante ET
            // - Le début de la nouvelle est avant la fin de l'existante
            return end >= existingStart && start <= existingEnd;
        });
    },
    {
        message: 'Cette période chevauche une période d\'indisponibilité existante',
        path: ['startDate']
    }
);

// Action pour supprimer une indisponibilité
export const deleteUnavailabilityActionSchema = z.object({
    unavailabilityId: uuidSchema
});

// ===== TYPES EXPORTÉS =====

export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export type Availability = z.infer<typeof availabilitySchema>;
export type UpdateAvailabilityAction = z.infer<typeof updateAvailabilityActionSchema>;

export type Unavailability = z.infer<typeof unavailabilityBaseSchema>;
export type CreateUnavailabilityForm = z.infer<typeof createUnavailabilityFormSchema>;
export type AddUnavailabilityAction = z.infer<typeof addUnavailabilityActionSchema>;
export type DeleteUnavailabilityAction = z.infer<typeof deleteUnavailabilityActionSchema>;
