import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }

        const { logoUrl } = await request.json();

        if (!logoUrl) {
            return json({ success: false, error: 'URL du logo manquante' }, { status: 400 });
        }

        // Créer un client Supabase avec la service_role key pour la suppression
        const supabaseAdmin = createClient(
            process.env.PUBLIC_SUPABASE_URL!,
            process.env.PRIVATE_SUPABASE_SERVICE_ROLE!
        );

        // Extraire le chemin du fichier depuis l'URL
        // Format: http://localhost:54321/storage/v1/object/public/shop-logos/userId/filename
        const urlParts = logoUrl.split('/');
        const storageIndex = urlParts.findIndex((part: string) => part === 'shop-logos');

        if (storageIndex === -1) {
            return json({ success: false, error: 'URL Supabase invalide' }, { status: 400 });
        }

        // Construire le chemin: userId/filename
        const filePath = urlParts.slice(storageIndex + 1).join('/');

        if (!filePath) {
            return json({ success: false, error: 'Chemin du fichier invalide' }, { status: 400 });
        }

        console.log('🗑️ Suppression du logo via API:', {
            logoUrl,
            filePath,
            bucket: 'shop-logos'
        });

        // Supprimer le fichier avec la service_role key
        const { error: deleteError } = await supabaseAdmin.storage
            .from('shop-logos')
            .remove([filePath]);

        if (deleteError) {
            console.error('❌ Erreur lors de la suppression du logo:', deleteError);
            return json({
                success: false,
                error: 'Erreur lors de la suppression du logo',
                details: deleteError.message
            }, { status: 500 });
        }

        console.log('✅ Logo supprimé avec succès via API:', filePath);
        return json({ success: true, deletedPath: filePath });

    } catch (error) {
        console.error('❌ Erreur inattendue lors de la suppression du logo:', error);
        return json({
            success: false,
            error: 'Erreur inattendue lors de la suppression du logo'
        }, { status: 500 });
    }
};
