import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
    try {
        const { order_ref } = params;

        if (!order_ref) {
            return json({ exists: false }, { status: 400 });
        }

        // Vérifier si une commande existe avec cet order_ref
        const { data: order, error: orderError } = await (locals.supabaseServiceRole as any)
            .from('orders')
            .select('id, shops!inner(slug)')
            .eq('order_ref', order_ref)
            .maybeSingle();

        if (orderError) {
            console.error('Error checking order:', orderError);
            return json({ exists: false }, { status: 500 });
        }

        if (order) {
            return json({ 
                exists: true, 
                orderId: order.id, 
                slug: order.shops.slug 
            });
        }

        return json({ exists: false });
    } catch (err) {
        console.error('Error in check-order API:', err);
        return json({ exists: false }, { status: 500 });
    }
};

