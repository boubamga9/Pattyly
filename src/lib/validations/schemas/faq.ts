import { z } from 'zod';
import { faqTextSchema } from './common';

export const faqSchema = z.object({
    question: faqTextSchema.pipe(
        z.string().max(500, 'La question ne peut pas dépasser 500 caractères')
    ),
    answer: faqTextSchema.pipe(
        z.string().max(2000, 'La réponse ne peut pas dépasser 2000 caractères')
    )
});

export const createFaqSchema = faqSchema;

export const updateFaqSchema = faqSchema.extend({
    id: z.string().min(1, 'ID requis')
});
