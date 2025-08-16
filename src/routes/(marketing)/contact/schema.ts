import { contactSchema } from '$lib/validations';

export const formSchema = contactSchema;
export type FormSchema = typeof formSchema;
