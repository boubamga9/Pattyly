import { loginSchema } from '$lib/validations';

export const formSchema = loginSchema;
export type FormSchema = typeof formSchema;
