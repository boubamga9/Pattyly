import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug } = params;
        console.log('🔍 Loading FAQ page for shop:', slug);

        // Récupérer les informations de la boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, bio, slug, logo_url')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (shopError) {
            console.error('❌ Database error fetching shop:', shopError);
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!shop) {
            console.log('⚠️ Shop not found:', slug);
            throw error(404, 'Boutique non trouvée');
        }

        console.log('✅ Shop found:', shop.id);

        // Récupérer les FAQ de la boutique
        const { data: faqs, error: faqsError } = await locals.supabase
            .from('faq')
            .select('*')
            .eq('shop_id', shop.id)
            .order('created_at', { ascending: true });

        if (faqsError) {
            console.error('❌ Error fetching FAQs:', faqsError);
            throw error(500, 'Erreur lors du chargement des FAQ');
        }

        console.log('✅ FAQs loaded successfully:', faqs?.length || 0, 'items');

        return {
            shop,
            faqs: faqs || []
        };

    } catch (err) {
        console.error('💥 Unexpected error in FAQ load:', err);
        throw error(500, 'Erreur inattendue lors du chargement des FAQ');
    }
}; 