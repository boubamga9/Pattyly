import { z } from 'zod';

export const customizationSchema = z.object({
    button_color: z.string().min(1, 'Couleur requise'),
    button_text_color: z.string().min(1, 'Couleur requise'),
    text_color: z.string().min(1, 'Couleur requise'),
    icon_color: z.string().min(1, 'Couleur requise'),
    secondary_text_color: z.string().min(1, 'Couleur requise'),
    background_color: z.string().min(1, 'Couleur requise'),
    background_image: z.instanceof(File).optional(),
    background_image_url: z.string().optional(),
});

export type CustomizationSchema = z.infer<typeof customizationSchema>;
