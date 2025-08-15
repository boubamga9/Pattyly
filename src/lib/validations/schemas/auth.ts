import { z } from 'zod';
import { emailSchema, passwordSchema } from './common';

/**
 * Schémas de validation pour l'authentification et la gestion de compte
 * Utilise les schémas communs de common.ts pour la cohérence
 */

// ===== SCHÉMAS COMPOSÉS =====

// Connexion
export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema
});

// Inscription
export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema
});

// Mot de passe oublié
export const forgotPasswordSchema = z.object({
    email: emailSchema
});

// Mise à jour d'email
export const updateEmailSchema = z.object({
    email: emailSchema
});

// Changement de mot de passe
export const changePasswordSchema = z
    .object({
        old_password: passwordSchema,
        new_password: passwordSchema,
        confirm_password: passwordSchema
    })
    .refine(
        (data) => data.new_password === data.confirm_password,
        {
            message: 'Les mots de passe ne correspondent pas',
            path: ['confirm_password']
        }
    );

// Création de mot de passe (pour les comptes sans mot de passe)
export const createPasswordSchema = z
    .object({
        new_password: passwordSchema,
        confirm_password: passwordSchema
    })
    .refine(
        (data) => data.new_password === data.confirm_password,
        {
            message: 'Les mots de passe ne correspondent pas',
            path: ['confirm_password']
        }
    );

// Suppression de compte
export const deleteAccountSchema = z.object({
    confirmation: z.string().min(1, 'La confirmation est requise')
});

// ===== TYPES EXPORTÉS =====

export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type UpdateEmail = z.infer<typeof updateEmailSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type CreatePassword = z.infer<typeof createPasswordSchema>;
export type DeleteAccount = z.infer<typeof deleteAccountSchema>;
