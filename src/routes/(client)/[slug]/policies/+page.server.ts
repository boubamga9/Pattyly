import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug } = params;

        // ✅ OPTIMISÉ : Charger shop avec les politiques en une seule requête
        const { data: shop, error: shopError } = await (locals.supabaseServiceRole as any)
            .from('shops')
            .select('id, name, bio, slug, logo_url, instagram, tiktok, website, terms_and_conditions, return_policy, delivery_policy, payment_terms')
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
            policies: {
                terms_and_conditions: shop.terms_and_conditions,
                return_policy: shop.return_policy,
                delivery_policy: shop.delivery_policy,
                payment_terms: shop.payment_terms
            }
        };

    } catch (err) {
        throw error(500, 'Erreur inattendue lors du chargement des politiques');
    }
};

