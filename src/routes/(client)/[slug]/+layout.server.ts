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
                },
                hasPolicies: false
            };
        }

        // Récupérer les customizations et vérifier les politiques en parallèle (après avoir shop.id)
        const [customizationsResult, policiesResult] = await Promise.all([
            (locals.supabaseServiceRole as any)
                .from('shop_customizations')
                .select('button_color, button_text_color, text_color, icon_color, secondary_text_color, background_color, background_image_url')
                .eq('shop_id', shop.id)
                .single(),
            (locals.supabaseServiceRole as any)
                .from('shop_policies')
                .select('terms_and_conditions, return_policy, delivery_policy, payment_terms')
                .eq('shop_id', shop.id)
                .single()
        ]);

        const customizations = customizationsResult.data;
        const policies = policiesResult.data;

        // Vérifier si au moins une politique est définie
        const hasPolicies = policies && (
            policies.terms_and_conditions ||
            policies.return_policy ||
            policies.delivery_policy ||
            policies.payment_terms
        );

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
            },
            hasPolicies: Boolean(hasPolicies)
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
            },
            hasPolicies: false
        };
    }
};