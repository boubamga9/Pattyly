import { z } from 'zod';
import {
    updateAvailabilityActionSchema,
    addUnavailabilityActionSchema,
    deleteUnavailabilityActionSchema
} from '$lib/validations/schemas/availability';

// ===== SCHÉMAS POUR LES ACTIONS =====

// Mise à jour de la disponibilité d'un jour
export const updateAvailabilityFormSchema = updateAvailabilityActionSchema;

// Ajout d'une période d'indisponibilité
export const addUnavailabilityFormSchema = addUnavailabilityActionSchema;

// Suppression d'une période d'indisponibilité
export const deleteUnavailabilityFormSchema = deleteUnavailabilityActionSchema;

// ===== TYPES EXPORTÉS =====

export type UpdateAvailabilityForm = typeof updateAvailabilityFormSchema;
export type AddUnavailabilityForm = typeof addUnavailabilityFormSchema;
export type DeleteUnavailabilityForm = typeof deleteUnavailabilityFormSchema;
