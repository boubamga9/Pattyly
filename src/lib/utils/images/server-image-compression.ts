/**
 * Utilitaire de compression et re-compression côté serveur
 * 
 * Ce fichier gère la compression d'images côté serveur avec Sharp :
 * - Vérification des dimensions réelles
 * - Re-compression automatique si nécessaire
 * - Optimisation de la qualité
 */

import sharp from 'sharp';

export interface ServerCompressionOptions {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'jpeg' | 'png' | 'webp';
}

export interface ServerCompressionResult {
    file: File;
    originalSize: number;
    compressedSize: number;
    originalDimensions: { width: number; height: number };
    compressedDimensions: { width: number; height: number };
    compressionRatio: number;
    wasRecompressed: boolean;
}

/**
 * Configuration prédéfinie pour la compression serveur
 */
export const SERVER_COMPRESSION_PRESETS = {
    // Logos : 400x400, qualité 90%
    LOGO: {
        maxWidth: 400,
        maxHeight: 400,
        quality: 90,
        format: 'png'
    },

    // Images de produits : 800x800, qualité 85%
    PRODUCT: {
        maxWidth: 800,
        maxHeight: 800,
        quality: 85,
        format: 'jpeg'
    }
} as const;

/**
 * Obtient les dimensions réelles d'une image
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    try {
        const buffer = await file.arrayBuffer();
        const metadata = await sharp(Buffer.from(buffer)).metadata();

        return {
            width: metadata.width || 0,
            height: metadata.height || 0
        };
    } catch (error) {
        console.error('Erreur lors de la lecture des dimensions:', error);
        throw new Error('Impossible de lire les dimensions de l\'image');
    }
}

/**
 * Compresse une image côté serveur avec Sharp
 */
export async function compressImageServer(
    file: File,
    preset: keyof typeof SERVER_COMPRESSION_PRESETS
): Promise<ServerCompressionResult> {
    const options = SERVER_COMPRESSION_PRESETS[preset] as ServerCompressionOptions;

    try {
        const originalSize = file.size;
        const buffer = await file.arrayBuffer();

        // Obtenir les dimensions originales
        const originalDimensions = await getImageDimensions(file);

        // Créer l'instance Sharp
        let sharpInstance = sharp(Buffer.from(buffer));

        // Redimensionner si nécessaire
        if (originalDimensions.width > options.maxWidth || originalDimensions.height > options.maxHeight) {
            sharpInstance = sharpInstance.resize(options.maxWidth, options.maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // Appliquer la compression selon le format
        let compressedBuffer: Buffer;

        if (options.format === 'jpeg') {
            compressedBuffer = await sharpInstance
                .jpeg({ quality: options.quality })
                .toBuffer();
        } else if (options.format === 'png') {
            compressedBuffer = await sharpInstance
                .png({ quality: options.quality })
                .toBuffer();
        } else if (options.format === 'webp') {
            compressedBuffer = await sharpInstance
                .webp({ quality: options.quality })
                .toBuffer();
        } else {
            throw new Error(`Format non supporté: ${options.format}`);
        }

        // Créer le nouveau fichier
        const compressedFile = new File([compressedBuffer], file.name, {
            type: `image/${options.format}`,
            lastModified: Date.now(),
        });

        // Calculer les nouvelles dimensions
        const compressedDimensions = await getImageDimensions(compressedFile);

        return {
            file: compressedFile,
            originalSize,
            compressedSize: compressedFile.size,
            originalDimensions,
            compressedDimensions,
            compressionRatio: (1 - (compressedFile.size / originalSize)) * 100,
            wasRecompressed: true
        };

    } catch (error) {
        console.error('Erreur lors de la compression serveur:', error);
        throw new Error('Erreur lors de la compression de l\'image');
    }
}

/**
 * Vérifie si une image nécessite une re-compression
 */
export function needsRecompression(
    dimensions: { width: number; height: number },
    preset: keyof typeof SERVER_COMPRESSION_PRESETS
): boolean {
    const options = SERVER_COMPRESSION_PRESETS[preset] as ServerCompressionOptions;

    return dimensions.width > options.maxWidth || dimensions.height > options.maxHeight;
}

/**
 * Logs de compression pour le debugging
 */
export function logCompressionInfo(
    file: File,
    preset: keyof typeof SERVER_COMPRESSION_PRESETS,
    result: ServerCompressionResult
): void {
    const options = SERVER_COMPRESSION_PRESETS[preset] as ServerCompressionOptions;

    console.log('🔧 Compression serveur:', {
        fileName: file.name,
        preset,
        originalSize: formatFileSize(result.originalSize),
        compressedSize: formatFileSize(result.compressedSize),
        originalDimensions: `${result.originalDimensions.width}x${result.originalDimensions.height}`,
        compressedDimensions: `${result.compressedDimensions.width}x${result.compressedDimensions.height}`,
        compressionRatio: `${result.compressionRatio.toFixed(1)}%`,
        wasRecompressed: result.wasRecompressed,
        maxDimensions: `${options.maxWidth}x${options.maxHeight}`,
        quality: options.quality,
        format: options.format
    });
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
