import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '$env/static/private';

// Configuration de Cloudinary
cloudinary.config({
	cloud_name: CLOUDINARY_CLOUD_NAME,
	api_key: CLOUDINARY_API_KEY,
	api_secret: CLOUDINARY_API_SECRET
});

/**
 * Upload d'un logo de boutique vers Cloudinary
 * @param file - Fichier image à uploader
 * @param shopId - ID de la boutique pour organiser les fichiers
 * @returns Promise avec l'URL sécurisée de l'image
 */
export async function uploadShopLogo(file: File, shopId: string) {
	try {
		// Convertir le File en Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload vers Cloudinary avec organisation par boutique
		const result = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						folder: `shops/${shopId}/logo`,
						public_id: 'logo',
						overwrite: true,
						resource_type: 'image',
						transformation: [
							{ width: 800, height: 800, crop: 'limit', quality: 'auto', format: 'auto' }
						]
					},
					(error, result) => {
						if (error) reject(error);
						else if (result) resolve(result);
						else reject(new Error('Upload failed'));
					}
				)
				.end(buffer);
		});

		return {
			secure_url: result.secure_url,
			public_id: result.public_id
		};
	} catch (error) {
		console.error('❌ [Cloudinary] Error uploading shop logo:', error);
		throw error;
	}
}

/**
 * Upload d'une image de fond de boutique vers Cloudinary
 * @param file - Fichier image à uploader
 * @param shopId - ID de la boutique pour organiser les fichiers
 * @returns Promise avec l'URL sécurisée de l'image
 */
export async function uploadBackgroundImage(file: File, shopId: string) {
	try {
		// Convertir le File en Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload vers Cloudinary avec organisation par boutique
		const result = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						folder: `shops/${shopId}/background`,
						public_id: 'background',
						overwrite: true,
						resource_type: 'image',
						transformation: [
							{ width: 1920, height: 1080, crop: 'limit', quality: 'auto', format: 'auto' }
						]
					},
					(error, result) => {
						if (error) reject(error);
						else if (result) resolve(result);
						else reject(new Error('Upload failed'));
					}
				)
				.end(buffer);
		});

		return {
			secure_url: result.secure_url,
			public_id: result.public_id
		};
	} catch (error) {
		console.error('❌ [Cloudinary] Error uploading background image:', error);
		throw error;
	}
}

/**
 * Upload d'une image de produit vers Cloudinary
 * @param file - Fichier image à uploader
 * @param shopId - ID de la boutique pour organiser les fichiers
 * @param productId - ID du produit (optionnel, pour organisation)
 * @returns Promise avec l'URL sécurisée de l'image
 */
export async function uploadProductImage(file: File, shopId: string, productId?: string) {
	try {
		// Convertir le File en Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Générer un ID unique pour le produit si non fourni
		const imageId = productId || `product-${Date.now()}`;

		// Upload vers Cloudinary avec organisation par boutique
		const result = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						folder: `shops/${shopId}/products`,
						public_id: imageId,
						overwrite: false,
						resource_type: 'image',
						transformation: [
							{ width: 1200, height: 1200, crop: 'limit', quality: 'auto', format: 'auto' }
						]
					},
					(error, result) => {
						if (error) reject(error);
						else if (result) resolve(result);
						else reject(new Error('Upload failed'));
					}
				)
				.end(buffer);
		});

		return {
			secure_url: result.secure_url,
			public_id: result.public_id
		};
	} catch (error) {
		console.error('❌ [Cloudinary] Error uploading product image:', error);
		throw error;
	}
}

/**
 * Supprime une image de Cloudinary
 * @param publicId - Public ID de l'image à supprimer
 * @returns Promise<void>
 */
export async function deleteImage(publicId: string) {
	try {
		await cloudinary.uploader.destroy(publicId);
	} catch (error) {
		console.error('❌ [Cloudinary] Error deleting image:', error);
		throw error;
	}
}

/**
 * Extrait le public_id d'une URL Cloudinary
 * @param url - URL Cloudinary complète
 * @returns Public ID ou null si l'URL n'est pas valide
 */
export function extractPublicIdFromUrl(url: string): string | null {
	try {
		// Format d'URL Cloudinary: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
		const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
		if (match && match[1]) {
			return match[1];
		}
		return null;
	} catch (error) {
		console.error('❌ [Cloudinary] Error extracting public_id:', error);
		return null;
	}
}

/**
 * Upload d'une image statique marketing vers Cloudinary
 * @param filePath - Chemin du fichier à uploader
 * @param fileName - Nom du fichier (sans extension)
 * @param folder - Dossier dans Cloudinary (ex: 'marketing/carousel' ou 'marketing/mockup')
 * @returns Promise avec l'URL sécurisée de l'image
 */
export async function uploadMarketingImage(filePath: string, fileName: string, folder: string = 'marketing') {
	try {
		const fs = await import('fs/promises');
		const path = await import('path');
		
		// Lire le fichier
		const fileBuffer = await fs.readFile(filePath);
		
		// Upload vers Cloudinary
		const result = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						folder: folder,
						public_id: fileName,
						overwrite: true,
						resource_type: 'image',
						transformation: [
							{ quality: 'auto', format: 'auto' }
						]
					},
					(error, result) => {
						if (error) reject(error);
						else if (result) resolve(result);
						else reject(new Error('Upload failed'));
					}
				)
				.end(fileBuffer);
		});

		return {
			secure_url: result.secure_url,
			public_id: result.public_id
		};
	} catch (error) {
		console.error(`❌ [Cloudinary] Error uploading marketing image ${fileName}:`, error);
		throw error;
	}
}


