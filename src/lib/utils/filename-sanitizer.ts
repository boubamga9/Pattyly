/**
 * Sanitize filename for storage compatibility
 * Removes accents, spaces, and special characters
 * 
 * @param filename - Original filename
 * @returns Sanitized filename safe for storage
 */
export function sanitizeFileName(filename: string): string {
    // Get file extension
    const lastDotIndex = filename.lastIndexOf('.');
    const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

    // Sanitize the name part
    const sanitizedName = name
        .normalize('NFD')                    // Decompose accented characters (é → e + ´)
        .replace(/[\u0300-\u036f]/g, '')     // Remove accent marks
        .replace(/\s+/g, '-')                // Replace spaces with hyphens
        .replace(/[^a-zA-Z0-9-]/g, '')       // Remove special characters except hyphens
        .replace(/-+/g, '-')                 // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '')               // Remove leading/trailing hyphens
        .toLowerCase();                      // Convert to lowercase for consistency

    // Ensure we have a valid name
    const finalName = sanitizedName || 'file';

    return `${finalName}${extension}`;
}
