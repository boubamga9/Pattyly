import { v2 as cloudinary } from 'cloudinary';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration de Cloudinary
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
	console.error('❌ Variables d\'environnement Cloudinary manquantes !');
	process.exit(1);
}

cloudinary.config({
	cloud_name: CLOUDINARY_CLOUD_NAME,
	api_key: CLOUDINARY_API_KEY,
	api_secret: CLOUDINARY_API_SECRET
});

interface ImageMapping {
	[key: string]: string;
}

async function uploadMarketingImage(filePath: string, fileName: string, folder: string = 'marketing') {
	try {
		const fileBuffer = await readFile(filePath);
		
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

async function uploadMarketingImages() {
	console.log('🚀 Début de l\'upload des images marketing vers Cloudinary...\n');

	const results: ImageMapping = {};

	try {
		// Upload des images du carousel
		console.log('📸 Upload des images du carousel...');
		const carouselDir = join(__dirname, '../static/carousel');
		const carouselFiles = await readdir(carouselDir);
		
		for (const file of carouselFiles) {
			if (file.match(/\.(jpg|jpeg|png|webp)$/i)) {
				const filePath = join(carouselDir, file);
				const fileName = file.replace(/\.[^/.]+$/, ''); // Enlever l'extension
				const originalPath = `/carousel/${file}`;
				
				console.log(`  → Upload de ${file}...`);
				const result = await uploadMarketingImage(filePath, fileName, 'marketing/carousel');
				results[originalPath] = result.secure_url;
				console.log(`  ✓ ${file} → ${result.secure_url}\n`);
			}
		}

		// Upload des images mockup
		console.log('🖼️  Upload des images mockup...');
		const mockupDir = join(__dirname, '../static/mockup');
		const mockupFiles = await readdir(mockupDir);
		
		for (const file of mockupFiles) {
			if (file.match(/\.(jpg|jpeg|png|webp)$/i)) {
				const filePath = join(mockupDir, file);
				const fileName = file.replace(/\.[^/.]+$/, ''); // Enlever l'extension
				const originalPath = `/mockup/${file}`;
				
				console.log(`  → Upload de ${file}...`);
				const result = await uploadMarketingImage(filePath, fileName, 'marketing/mockup');
				results[originalPath] = result.secure_url;
				console.log(`  ✓ ${file} → ${result.secure_url}\n`);
			}
		}

		// Afficher le mapping final
		console.log('\n✅ Upload terminé !\n');
		console.log('📋 Mapping des URLs :');
		console.log(JSON.stringify(results, null, 2));
		
		// Sauvegarder dans un fichier
		const fs = await import('fs/promises');
		await fs.writeFile(
			join(__dirname, '../marketing-images-mapping.json'),
			JSON.stringify(results, null, 2)
		);
		console.log('\n💾 Mapping sauvegardé dans marketing-images-mapping.json');
		
		return results;
	} catch (error) {
		console.error('❌ Erreur lors de l\'upload:', error);
		throw error;
	}
}

// Exécuter le script
uploadMarketingImages()
	.then(() => {
		console.log('\n✨ Tous les uploads sont terminés !');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n💥 Erreur fatale:', error);
		process.exit(1);
	});
