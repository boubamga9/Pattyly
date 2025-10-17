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

        // Récupérer les customizations
        const { data: customizations } = await (locals.supabaseServiceRole as any)
            .from('shop_customizations')
            .select('button_color, button_text_color, text_color, icon_color, secondary_text_color, background_color, background_image_url')
            .eq('shop_id', shop.id)
            .single();

        return {
            shop,
            faqs: faqs || [],
            customizations: customizations || {
                button_color: '#ff6f61',
                button_text_color: '#ffffff',
                text_color: '#333333',
                icon_color: '#6b7280',
                secondary_text_color: '#333333',
                background_color: '#ffe8d6',
                background_image_url: null
            }
        };

    } catch (err) {
        throw error(500, 'Erreur inattendue lors du chargement des FAQ');
    }
}; 