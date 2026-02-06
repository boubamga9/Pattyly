import {
    updateAvailabilityActionSchema,
    addUnavailabilityActionSchema,
    deleteUnavailabilityActionSchema,
    addSlotUnavailabilityActionSchema,
    deleteSlotUnavailabilityActionSchema
} from '$lib/validations/schemas/availability';

// ===== SCHÉMAS POUR LES ACTIONS =====

// Mise à jour de la disponibilité d'un jour
export const updateAvailabilityFormSchema = updateAvailabilityActionSchema;

// Ajout d'une période d'indisponibilité
export const addUnavailabilityFormSchema = addUnavailabilityActionSchema;

// Suppression d'une période d'indisponibilité
export const deleteUnavailabilityFormSchema = deleteUnavailabilityActionSchema;

// Ajout d'une indisponibilité de créneau (un jour précis)
export const addSlotUnavailabilityFormSchema = addSlotUnavailabilityActionSchema;

// Suppression d'une indisponibilité de créneau
export const deleteSlotUnavailabilityFormSchema = deleteSlotUnavailabilityActionSchema;

// ===== TYPES EXPORTÉS =====

export type UpdateAvailabilityForm = typeof updateAvailabilityFormSchema;
export type AddUnavailabilityForm = typeof addUnavailabilityFormSchema;
export type DeleteUnavailabilityForm = typeof deleteUnavailabilityFormSchema;
export type AddSlotUnavailabilityForm = typeof addSlotUnavailabilityFormSchema;
export type DeleteSlotUnavailabilityForm = typeof deleteSlotUnavailabilityFormSchema;
