import { z } from 'zod';

export const customizationSchema = z.object({
    button_color: z.string().min(1, 'Couleur requise'),
    button_text_color: z.string().min(1, 'Couleur requise'),
    text_color: z.string().min(1, 'Couleur requise'),
    icon_color: z.string().min(1, 'Couleur requise'),
    secondary_text_color: z.string().min(1, 'Couleur requise'),
    background_color: z.string().min(1, 'Couleur requise'),
    // ✅ Accepter File ou undefined (les chaînes vides sont gérées manuellement dans le code)
    // Utiliser z.preprocess pour convertir les chaînes vides en undefined
    background_image: z.preprocess(
        (val) => {
            // Si c'est une chaîne vide, retourner undefined
            if (typeof val === 'string' && val.length === 0) {
                return undefined;
            }
            // Sinon, retourner la valeur telle quelle (File ou undefined)
            return val;
        },
        z.instanceof(File).optional()
    ),
    // ✅ Accepter string, null, ou undefined (la DB peut retourner null)
    background_image_url: z.string().nullable().optional(),
});

export type CustomizationSchema = z.infer<typeof customizationSchema>;