import { z } from 'zod';
import { nameSchema, slugSchema, bioSchema } from '$lib/validations';

export const updateShopSchema = z.object({
    name: nameSchema,
    bio: bioSchema.optional(),
    slug: slugSchema,
    instagram: z.string().optional(),
    tiktok: z.string().optional(),
    website: z.string().url('Format d\'URL invalide').optional().or(z.literal('')),
    logo: z.instanceof(File).optional(),
    logoUrl: z.string().optional()
});

export const formSchema = updateShopSchema;
export type FormSchema = typeof formSchema;
