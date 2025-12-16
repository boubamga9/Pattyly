import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug } = params;

        // ✅ OPTIMISÉ : Charger shop d'abord, puis politiques
        const { data: shop, error: shopError } = await (locals.supabaseServiceRole as any)
            .from('shops')
            .select('id, name, bio, slug, logo_url, instagram, tiktok, website')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (shopError || !shop) {
            throw error(404, 'Boutique non trouvée');
        }

        // Charger les politiques
        const { data: policies } = await (locals.supabaseServiceRole as any)
            .from('shop_policies')
            .select('terms_and_conditions, return_policy, delivery_policy, payment_terms')
            .eq('shop_id', shop.id)
            .maybeSingle();


        // Les customizations sont chargées dans le layout parent

        return {
            shop: {
                id: shop.id,
                name: shop.name,
                bio: shop.bio,
                slug: shop.slug,
                logo_url: shop.logo_url,
                instagram: shop.instagram,
                tiktok: shop.tiktok,
                website: shop.website
            },
            policies: policies || {
                terms_and_conditions: null,
                return_policy: null,
                delivery_policy: null,
                payment_terms: null
            }
        };

    } catch (err) {
        throw error(500, 'Erreur inattendue lors du chargement des politiques');
    }
};

