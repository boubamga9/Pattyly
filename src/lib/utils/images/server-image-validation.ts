/**
 * Utilitaire de validation et re-compression côté serveur
 * 
 * Ce fichier gère la validation stricte des images côté serveur :
 * - Vérification des dimensions réelles
 * - Re-compression si nécessaire
 * - Validation absolue de la qualité
 */

import { getImageDimensions, compressImageServer, needsRecompression, logCompressionInfo } from './server-image-compression';

export interface ServerImageValidationOptions {
    maxWidth: number;
    maxHeight: number;
    maxSizeBytes: number;
    allowedTypes: string[];
    quality: number;
}

export interface ServerImageValidationResult {
    isValid: boolean;
    error?: string;
    needsRecompression: boolean;
    originalDimensions?: { width: number; height: number };
    compressedFile?: File;
}

/**
 * Configuration prédéfinie pour la validation serveur
 */
export const SERVER_VALIDATION_PRESETS = {
    // Logos : 400x400, 1MB max, qualité 90%
    LOGO: {
        maxWidth: 400,
        maxHeight: 400,
        maxSizeBytes: 1 * 1024 * 1024, // 1MB
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        quality: 0.90
    },

    // Images de produits : 800x800, 2MB max, qualité 85%
    PRODUCT: {
        maxWidth: 800,
        maxHeight: 800,
        maxSizeBytes: 2 * 1024 * 1024, // 2MB
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        quality: 0.85
    }
} as const;

/**
 * Valide une image côté serveur avec vérification stricte
 */
export async function validateImageServer(
    file: File,
    preset: keyof typeof SERVER_VALIDATION_PRESETS
): Promise<ServerImageValidationResult> {
    const options = SERVER_VALIDATION_PRESETS[preset];

    try {
        // 1. Validation basique du fichier
        if (!file || file.size === 0) {
            return {
                isValid: false,
                error: 'Fichier invalide ou vide',
                needsRecompression: false
            };
        }

        // 2. Validation du type MIME
        if (!options.allowedTypes.includes(file.type as any)) {
            return {
                isValid: false,
                error: `Type de fichier non autorisé. Types acceptés: ${options.allowedTypes.join(', ')}`,
                needsRecompression: false
            };
        }

        // 3. Validation de la taille
        if (file.size > options.maxSizeBytes) {
            return {
                isValid: false,
                error: `Fichier trop volumineux. Taille max: ${formatFileSize(options.maxSizeBytes)}`,
                needsRecompression: false
            };
        }

        // 4. 🔍 Vérification des dimensions réelles côté serveur
        let originalDimensions: { width: number; height: number };
        try {
            originalDimensions = await getImageDimensions(file);
        } catch (error) {
            return {
                isValid: false,
                error: 'Impossible de lire les dimensions de l\'image',
                needsRecompression: false
            };
        }

        // 5. 🔄 Vérifier si re-compression nécessaire
        if (needsRecompression(originalDimensions, preset)) {
            try {
                // Re-compression automatique côté serveur
                const compressionResult = await compressImageServer(file, preset);

                // Log de la compression
                logCompressionInfo(file, preset, compressionResult);

                return {
                    isValid: true,
                    needsRecompression: true,
                    originalDimensions,
                    compressedFile: compressionResult.file
                };
            } catch (error) {
                return {
                    isValid: false,
                    error: 'Erreur lors de la re-compression de l\'image',
                    needsRecompression: false
                };
            }
        }

        // 6. ✅ Validation réussie (pas de re-compression nécessaire)
        return {
            isValid: true,
            needsRecompression: false,
            originalDimensions
        };

    } catch (error) {
        return {
            isValid: false,
            error: 'Erreur lors de la validation du fichier',
            needsRecompression: false
        };
    }
}

/**
 * Valide et potentiellement re-compresse une image côté serveur
 * ✅ Version avancée maintenant implémentée !
 */
export async function validateAndRecompressImage(
    file: File,
    preset: keyof typeof SERVER_VALIDATION_PRESETS
): Promise<ServerImageValidationResult> {
    // Maintenant on fait la validation + re-compression automatique !
    return validateImageServer(file, preset);
}

/**
 * Formate une taille en octets en format lisible
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Logs de validation pour le debugging
 */
export function logValidationInfo(
    file: File,
    preset: keyof typeof SERVER_VALIDATION_PRESETS,
    result: ServerImageValidationResult
): void {
    const options = SERVER_VALIDATION_PRESETS[preset];
}
