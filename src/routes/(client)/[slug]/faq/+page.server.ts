import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug } = params;

        // ✅ OPTIMISÉ : Charger shop avec relation faq en une seule requête
        const { data: shop, error: shopError } = await (locals.supabaseServiceRole as any)
            .from('shops')
            .select('id, name, bio, slug, logo_url, faq(*)')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (shopError) {
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!shop) {
            throw error(404, 'Boutique non trouvée');
        }

        // Les customizations sont chargées dans le layout parent

        // Extraire les FAQ depuis la relation et les trier
        const faqs = (shop.faq || []).sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Retourner shop sans la relation faq (déjà extraite)
        const { faq, ...shopWithoutFaq } = shop;

        return {
            shop: shopWithoutFaq,
            faqs: faqs || []
        };

    } catch (err) {
        throw error(500, 'Erreur inattendue lors du chargement des FAQ');
    }
}; 