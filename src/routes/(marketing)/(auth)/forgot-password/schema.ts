import { forgotPasswordSchema } from '$lib/validations';

export const formSchema = forgotPasswordSchema;
export type FormSchema = typeof formSchema;
