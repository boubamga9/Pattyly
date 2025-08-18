import { z } from 'zod';
import {
    toggleCustomRequestsSchema,
    updateCustomFormSchema
} from '$lib/validations/schemas/form';

export const toggleCustomRequestsFormSchema = toggleCustomRequestsSchema;
export const updateCustomFormFormSchema = updateCustomFormSchema;

export type ToggleCustomRequestsForm = typeof toggleCustomRequestsFormSchema;
export type UpdateCustomFormForm = typeof updateCustomFormFormSchema;
