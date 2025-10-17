import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug } = params;


        // Get shop information
        const { data: shop, error: shopError } = await (locals.supabaseServiceRole as any)
            .from('shops')
            .select('id, name, bio, slug, logo_url')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (shopError) {
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!shop) {

            throw error(404, 'Boutique non trouvée');
        }

        // Get shop FAQ
        const { data: faqs, error: faqsError } = await (locals.supabaseServiceRole as any)
            .from('faq')
            .select('*')
            .eq('shop_id', shop.id)
            .order('created_at', { ascending: true });

        if (faqsError) {
            throw error(500, 'Erreur lors du chargement des FAQ');
        }

        return {
            shop,
            faqs: faqs || []
        };

    } catch (err) {
        throw error(500, 'Erreur inattendue lors du chargement des FAQ');
    }
}; 