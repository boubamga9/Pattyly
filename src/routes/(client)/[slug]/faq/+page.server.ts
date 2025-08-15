import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const { slug } = params;

    // Récupérer les informations de la boutique
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('id, name, bio, slug, logo_url')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

    if (shopError || !shop) {
        throw error(404, 'Boutique non trouvée');
    }

    // Récupérer les FAQ de la boutique
    const { data: faqs, error: faqsError } = await locals.supabase
        .from('faq')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: true });

    if (faqsError) {
        console.error('Error fetching FAQs:', faqsError);
        throw error(500, 'Erreur lors du chargement des FAQ');
    }

    return {
        shop,
        faqs: faqs || []
    };
}; 