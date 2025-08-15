import { z } from 'zod';
import { uuidSchema } from './common';

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

// ===== DISPONIBILITÉS QUOTIDIENNES =====

// Disponibilité d'un jour de la semaine
export const availabilitySchema = z.object({
    id: uuidSchema,
    shop_id: uuidSchema,        // Lien vers la boutique
    day: dayOfWeekSchema,       // Jour de la semaine (0-6)
    is_open: z.boolean()        // Boutique ouverte ou fermée ce jour
});

// Mise à jour de la disponibilité d'un jour
export const updateAvailabilitySchema = z.object({
    day: dayOfWeekSchema,
    is_open: z.boolean()
});

// ===== PÉRIODES D'INDISPONIBILITÉ =====

// Période d'indisponibilité (vacances, congés, etc.)
export const unavailabilityBaseSchema = z.object({
    id: uuidSchema,
    shop_id: uuidSchema,        // Lien vers la boutique
    start_date: z.date(),       // Date de début d'indisponibilité
    end_date: z.date()          // Date de fin d'indisponibilité
});

// Validation que la date de début est antérieure ou égale à la date de fin
export const unavailabilitySchema = unavailabilityBaseSchema.refine(
    (data) => data.start_date <= data.end_date,
    {
        message: 'La date de début doit être antérieure ou égale à la date de fin',
        path: ['end_date']
    }
);

// Création d'une période d'indisponibilité
export const createUnavailabilitySchema = unavailabilityBaseSchema.omit({
    id: true,
    shop_id: true
});

// Mise à jour d'une période d'indisponibilité
export const updateUnavailabilitySchema = unavailabilityBaseSchema.pick({
    start_date: true,
    end_date: true
});

// ===== VALIDATIONS MÉTIER =====

// Validation qu'une date de commande ne tombe pas dans une période d'indisponibilité
export const isDateAvailableSchema = z.object({
    order_date: z.date(),
    unavailabilities: z.array(unavailabilitySchema)
}).refine(
    (data) => {
        // Vérifier que la date de commande ne tombe pas dans une période d'indisponibilité
        return !data.unavailabilities.some(unavailability =>
            data.order_date >= unavailability.start_date &&
            data.order_date <= unavailability.end_date
        );
    },
    {
        message: 'Cette date n\'est pas disponible (période d\'indisponibilité)',
        path: ['order_date']
    }
);

// Validation qu'il n'y a pas de chevauchement entre périodes d'indisponibilité
export const noOverlappingUnavailabilitiesSchema = z.array(unavailabilitySchema).refine(
    (unavailabilities) => {
        // Vérifier qu'il n'y a pas de chevauchement entre les périodes
        for (let i = 0; i < unavailabilities.length; i++) {
            for (let j = i + 1; j < unavailabilities.length; j++) {
                const period1 = unavailabilities[i];
                const period2 = unavailabilities[j];

                // Vérifier s'il y a chevauchement
                // Deux périodes se chevauchent si :
                // - La fin de la première est après le début de la seconde ET
                // - Le début de la première est avant la fin de la seconde
                if (
                    period1.end_date >= period2.start_date &&
                    period1.start_date <= period2.end_date
                ) {
                    return false; // Il y a chevauchement
                }
            }
        }
        return true; // Aucun chevauchement
    },
    {
        message: 'Il ne peut pas y avoir de chevauchement entre les périodes d\'indisponibilité',
        path: ['unavailabilities']
    }
);

// ===== TYPES EXPORTÉS =====

export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export type Availability = z.infer<typeof availabilitySchema>;
export type UpdateAvailability = z.infer<typeof updateAvailabilitySchema>;

export type Unavailability = z.infer<typeof unavailabilitySchema>;
export type CreateUnavailability = z.infer<typeof createUnavailabilitySchema>;
export type UpdateUnavailability = z.infer<typeof updateUnavailabilitySchema>;

export type IsDateAvailable = z.infer<typeof isDateAvailableSchema>;
export type NoOverlappingUnavailabilities = z.infer<typeof noOverlappingUnavailabilitiesSchema>;
