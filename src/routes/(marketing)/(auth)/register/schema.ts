import { registerSchema } from '$lib/validations';

export const formSchema = registerSchema;
export type FormSchema = typeof formSchema;
