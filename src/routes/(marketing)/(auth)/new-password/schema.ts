import { z } from 'zod';
import { passwordSchema } from '$lib/validations/schemas/common';

export const newPasswordSchema = z.object({
    password: passwordSchema,
    confirmPassword: passwordSchema
}).refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
});

export type NewPasswordSchema = typeof newPasswordSchema;
export type NewPasswordForm = z.infer<typeof newPasswordSchema>;
