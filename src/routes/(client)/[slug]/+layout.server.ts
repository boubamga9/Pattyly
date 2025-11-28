import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
    const { slug } = params;

    try {
        // ✅ OPTIMISÉ : Récupérer shop.id et customizations en parallèle
        const { data: shop, error: shopError } = await (locals.supabaseServiceRole as any)
            .from('shops')
            .select('id')
            .eq('slug', slug)
            .single();

        if (shopError || !shop) {
            return {
                shopId: null,
                customizations: {
                    button_color: '#ff6f61',
                    button_text_color: '#ffffff',
                    text_color: '#333333',
                    icon_color: '#6b7280',
                    secondary_text_color: '#333333',
                    background_color: '#fafafa',
                    background_image_url: null
                }
            };
        }

        // Récupérer les customizations en parallèle (après avoir shop.id)
        const { data: customizations, error: customizationsError } = await (locals.supabaseServiceRole as any)
            .from('shop_customizations')
            .select('button_color, button_text_color, text_color, icon_color, secondary_text_color, background_color, background_image_url')
            .eq('shop_id', shop.id)
            .single();

        return {
            shopId: shop.id,
            customizations: customizations || {
                button_color: '#ff6f61',
                button_text_color: '#ffffff',
                text_color: '#333333',
                icon_color: '#6b7280',
                secondary_text_color: '#333333',
                background_color: '#fafafa',
                background_image_url: null
            }
        };
    } catch (error) {
        console.error('Error loading customizations in layout:', error);
        return {
            shopId: null,
            customizations: {
                button_color: '#ff6f61',
                button_text_color: '#ffffff',
                text_color: '#333333',
                icon_color: '#6b7280',
                secondary_text_color: '#333333',
                background_color: '#fafafa',
                background_image_url: null
            }
        };
    }
};