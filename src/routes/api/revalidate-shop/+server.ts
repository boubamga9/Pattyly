import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { forceRevalidateShop } from '$lib/utils/catalog/catalog-revalidation';
import { env } from '$env/dynamic/private';

/**
 * API endpoint pour forcer la revalidation d'une boutique
 * Usage: POST /api/revalidate-shop
 * Body: { "slug": "shop-slug" }
 * Headers: { "Authorization": "Bearer REVALIDATION_TOKEN" }
 */
export const POST: RequestHandler = async ({ request }) => {
    try {
        // Vérifier l'autorisation
        const authHeader = request.headers.get('authorization');
        const expectedToken = `Bearer ${env.REVALIDATION_TOKEN}`;

        if (authHeader !== expectedToken) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { slug } = await request.json();

        if (!slug || typeof slug !== 'string') {
            return json({ error: 'Slug is required' }, { status: 400 });
        }

        console.log(`🔄 Manual revalidation requested for slug: ${slug}`);

        const success = await forceRevalidateShop(slug);

        if (success) {
            return json({
                success: true,
                message: `Shop ${slug} revalidated successfully`
            });
        } else {
            return json({
                success: false,
                error: `Failed to revalidate shop ${slug}`
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error in revalidate-shop API:', error);
        return json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
};