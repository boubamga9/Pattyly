/**
 * Utilitaire de compression et redimensionnement d'images
 * 
 * Ce fichier centralise toute la logique de traitement des images :
 * - Redimensionnement intelligent selon le type d'image
 * - Compression optimisée pour la qualité web
 * - Conversion automatique des formats
 * - Validation des types de fichiers
 */

export interface ImageCompressionOptions {
    maxWidth: number;
    maxHeight: number;
    quality: number; // 0.1 à 1.0
    format?: 'jpeg' | 'png' | 'webp';
    maintainAspectRatio?: boolean;
}

export interface ImageCompressionResult {
    file: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    dimensions: {
        width: number;
        height: number;
    };
}

/**
 * Configuration prédéfinie pour les différents types d'images
 */
export const IMAGE_PRESETS = {
    // Images de produits : 800x800, qualité 85%
    PRODUCT: {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        format: 'jpeg' as const,
        maintainAspectRatio: true
    },

    // Logos : 400x400, qualité 90%
    LOGO: {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.90,
        format: 'png' as const, // PNG pour préserver la transparence
        maintainAspectRatio: true
    },

    // Images de fond : 1920x1080, qualité 85%
    BACKGROUND: {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        format: 'jpeg' as const,
        maintainAspectRatio: true
    }
} as const;

/**
 * Valide qu'un fichier est bien une image
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Vérifier le type MIME
    if (!file.type.startsWith('image/')) {
        return { isValid: false, error: 'Le fichier doit être une image' };
    }

    // Types acceptés
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        return { isValid: false, error: 'Format d\'image non supporté. Utilisez JPG, PNG ou WebP' };
    }

    return { isValid: true };
}

/**
 * Redimensionne et compresse une image selon les options données
 */
export async function compressImage(
    file: File,
    options: ImageCompressionOptions
): Promise<ImageCompressionResult> {
    return new Promise((resolve, reject) => {
        // Validation du fichier
        const validation = validateImageFile(file);
        if (!validation.isValid) {
            reject(new Error(validation.error));
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        if (!ctx) {
            reject(new Error('Impossible de créer le contexte canvas'));
            return;
        }

        img.onload = () => {
            try {
                // Calculer les nouvelles dimensions
                const { width: newWidth, height: newHeight } = calculateDimensions(
                    img.width,
                    img.height,
                    options.maxWidth,
                    options.maxHeight,
                    options.maintainAspectRatio ?? true
                );

                // Configurer le canvas
                canvas.width = newWidth;
                canvas.height = newHeight;

                // Appliquer un algorithme de lissage pour une meilleure qualité
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Dessiner l'image redimensionnée
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // Convertir en Blob avec compression
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Erreur lors de la compression'));
                            return;
                        }

                        // Créer un nouveau fichier avec le blob compressé
                        const compressedFile = new File(
                            [blob],
                            `compressed-${file.name}`,
                            {
                                type: blob.type,
                                lastModified: Date.now()
                            }
                        );

                        // Calculer les statistiques
                        const originalSize = file.size;
                        const compressedSize = compressedFile.size;
                        const compressionRatio = Math.round(
                            ((originalSize - compressedSize) / originalSize) * 100
                        );

                        resolve({
                            file: compressedFile,
                            originalSize,
                            compressedSize,
                            compressionRatio,
                            dimensions: {
                                width: newWidth,
                                height: newHeight
                            }
                        });
                    },
                    `image/${options.format || 'jpeg'}`,
                    options.quality
                );
            } catch (error) {
                reject(new Error(`Erreur lors du traitement: ${error}`));
            }
        };

        img.onerror = () => {
            reject(new Error('Impossible de charger l\'image'));
        };

        // Charger l'image
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Calcule les nouvelles dimensions en respectant le ratio si demandé
 */
function calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean
): { width: number; height: number } {
    if (!maintainAspectRatio) {
        return { width: maxWidth, height: maxHeight };
    }

    // Calculer le ratio pour maintenir les proportions
    const aspectRatio = originalWidth / originalHeight;

    let newWidth = maxWidth;
    let newHeight = maxHeight;

    // Déterminer la dimension limitante
    if (maxWidth / aspectRatio <= maxHeight) {
        // La largeur est la dimension limitante
        newWidth = maxWidth;
        newHeight = Math.round(maxWidth / aspectRatio);
    } else {
        // La hauteur est la dimension limitante
        newHeight = maxHeight;
        newWidth = Math.round(maxHeight * aspectRatio);
    }

    return { width: newWidth, height: newHeight };
}

/**
 * Fonction de convenance pour compresser une image produit
 */
export async function compressProductImage(file: File): Promise<ImageCompressionResult> {
    return compressImage(file, IMAGE_PRESETS.PRODUCT);
}

/**
 * Fonction de convenance pour compresser un logo
 */
export async function compressLogo(file: File): Promise<ImageCompressionResult> {
    return compressImage(file, IMAGE_PRESETS.LOGO);
}

/**
 * Fonction de convenance pour compresser une image de fond
 */
export async function compressBackgroundImage(file: File): Promise<ImageCompressionResult> {
    return compressImage(file, IMAGE_PRESETS.BACKGROUND);
}

/**
 * Utilitaire pour afficher les informations de compression
 */
export function formatCompressionInfo(result: ImageCompressionResult): string {
    const { originalSize, compressedSize, compressionRatio, dimensions } = result;

    return `
Taille originale: ${formatFileSize(originalSize)}
Taille compressée: ${formatFileSize(compressedSize)}
Réduction: ${compressionRatio}%
Dimensions: ${dimensions.width}x${dimensions.height}px
    `.trim();
}

/**
 * Formate une taille en octets en format lisible
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
