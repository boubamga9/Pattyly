import { z } from 'zod';

export const customizationSchema = z.object({
    button_color: z.string().min(1, 'Couleur requise'),
    button_text_color: z.string().min(1, 'Couleur requise'),
    text_color: z.string().min(1, 'Couleur requise'),
    icon_color: z.string().min(1, 'Couleur requise'),
    secondary_text_color: z.string().min(1, 'Couleur requise'),
    background_color: z.string().min(1, 'Couleur requise'),
    // ✅ Accepter File, string vide, ou undefined (quand aucun fichier n'est sélectionné)
    background_image: z.union([z.instanceof(File), z.string().length(0), z.undefined()]).optional(),
    // ✅ Accepter string, null, ou undefined (la DB peut retourner null)
    background_image_url: z.string().nullable().optional(),
});

export type CustomizationSchema = z.infer<typeof customizationSchema>;