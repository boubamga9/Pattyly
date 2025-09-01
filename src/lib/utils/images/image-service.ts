/**
 * Service de traitement d'images pour les composants Svelte
 * 
 * Ce service centralise toute la logique de traitement des images côté client :
 * - Validation des fichiers
 * - Compression et redimensionnement
 * - Gestion des URLs de prévisualisation
 * - Nettoyage des ressources
 */

import { compressImage, validateImageFile, IMAGE_PRESETS } from './image-compression';

export interface ProcessedImage {
    file: File;
    url: string;
    originalSize: number;
    compressedSize: number;
    dimensions: {
        width: number;
        height: number;
    };
}

export interface ImageValidation {
    valid: boolean;
    error?: string;
}

/**
 * Service principal pour le traitement d'images
 */
export class ImageService {
    /**
     * Valide une image selon son type
     */
    static validateImage(file: File, type: 'product' | 'logo'): ImageValidation {
        // Validation de base du fichier
        const fileValidation = validateImageFile(file);
        if (!fileValidation.isValid) {
            return { valid: false, error: fileValidation.error };
        }

        // Validation de la taille selon le type
        const maxSize = type === 'logo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB pour logo, 10MB pour produit
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `L'image ne doit pas dépasser ${type === 'logo' ? '5MB' : '10MB'}`
            };
        }

        return { valid: true };
    }

    /**
     * Traite une image (compression + redimensionnement)
     */
    static async processImage(file: File, type: 'product' | 'logo'): Promise<ProcessedImage> {
        // Récupérer les options selon le type
        const options = type === 'logo' ? IMAGE_PRESETS.LOGO : IMAGE_PRESETS.PRODUCT;

        // Compresser l'image
        const result = await compressImage(file, options);

        // Créer une URL de prévisualisation
        const url = URL.createObjectURL(result.file);

        return {
            file: result.file,
            url,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            dimensions: result.dimensions
        };
    }

    /**
     * Nettoie une URL de prévisualisation
     */
    static cleanupPreviewUrl(url: string): void {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }
}
