import { z } from 'zod';
import { otpCodeSchema, emailSchema } from '$lib/validations/schemas/common';

export const otpSchema = z.object({
    code: otpCodeSchema,
    email: emailSchema,
    type: z.enum(['signup', 'recovery']).default('signup')
});

export type OtpSchema = typeof otpSchema;
export type OtpForm = z.infer<typeof otpSchema>;
