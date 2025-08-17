import { z } from 'zod';
import { changePasswordSchema, createPasswordSchema, deleteAccountSchema } from '$lib/validations/schemas/auth';

export const infoFormSchema = z.object({
	// Note: In our new schema, we don't have a 'name' field in profiles
	// The email is managed through Supabase Auth
	// We can add other profile fields here if needed in the future
});

export type InfoFormSchema = typeof infoFormSchema;

///

export const deleteAccountFormSchema = deleteAccountSchema;
export type DeleteAccountFormSchema = typeof deleteAccountFormSchema;

export const changePasswordFormSchema = changePasswordSchema;
export type ChangePasswordFormSchema = typeof changePasswordFormSchema;

export const createPasswordFormSchema = createPasswordSchema;
export type CreatePasswordFormSchema = typeof createPasswordFormSchema;
