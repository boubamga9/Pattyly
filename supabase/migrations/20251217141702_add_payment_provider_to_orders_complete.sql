-- Migration: Add payment_provider to orders table and update get_order_detail_data
-- Description: Adds payment_provider column to orders table, creates index, adds comment, and updates get_order_detail_data function
-- Date: 2025-12-17

-- ==============================================
-- PARTIE 1: Ajouter payment_provider à orders
-- ==============================================

DO $$
BEGIN
    -- Ajouter la colonne payment_provider à la table orders si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_provider'
    ) THEN
        ALTER TABLE orders
            ADD COLUMN payment_provider TEXT;
        
        -- Ajouter la contrainte CHECK
        ALTER TABLE orders
            ADD CONSTRAINT orders_payment_provider_check 
            CHECK (payment_provider = ANY (ARRAY['paypal'::text, 'revolut'::text]));
        
        -- Ajouter un index pour améliorer les performances des requêtes
        CREATE INDEX IF NOT EXISTS idx_orders_payment_provider
            ON orders(payment_provider)
            WHERE payment_provider IS NOT NULL;
        
        -- Ajouter un commentaire pour documenter la colonne
        COMMENT ON COLUMN orders.payment_provider IS 'Méthode de paiement utilisée par le client (paypal, revolut, etc.)';
    END IF;
END $$;

-- ==============================================
-- PARTIE 2: Mettre à jour get_order_detail_data
-- ==============================================

-- Mettre à jour get_order_detail_data pour inclure payment_provider
DROP FUNCTION IF EXISTS get_order_detail_data(UUID, UUID);

CREATE OR REPLACE FUNCTION get_order_detail_data(p_order_id UUID, p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'order', (
            SELECT json_build_object(
                'id', o.id,
                'customer_name', o.customer_name,
                'customer_email', o.customer_email,
                'customer_phone', o.customer_phone,
                'customer_instagram', o.customer_instagram,
                'pickup_date', o.pickup_date,
                'pickup_time', o.pickup_time,
                'status', o.status,
                'total_amount', o.total_amount,
                'product_name', o.product_name,
                'additional_information', o.additional_information,
                'chef_message', o.chef_message,
                'created_at', o.created_at,
                'chef_pickup_date', o.chef_pickup_date,
                'chef_pickup_time', o.chef_pickup_time,
                'paid_amount', o.paid_amount,
                'order_ref', o.order_ref,
                'payment_provider', o.payment_provider,
                'customization_data', o.customization_data,
                'inspiration_photos', o.inspiration_photos,
                'product', json_build_object(
                    'name', p.name,
                    'description', p.description,
                    'image_url', p.image_url,
                    'base_price', p.base_price
                )
            )
            FROM orders o
            LEFT JOIN products p ON o.product_id = p.id
            WHERE o.id = p_order_id
            AND o.shop_id = (
                SELECT id FROM shops WHERE profile_id = p_profile_id
            )
        ),
        'personalNote', (
            SELECT json_build_object(
                'id', pon.id,
                'note', pon.note,
                'created_at', pon.created_at,
                'updated_at', pon.updated_at
            )
            FROM personal_order_notes pon
            WHERE pon.order_id = p_order_id
            AND pon.shop_id = (
                SELECT id FROM shops WHERE profile_id = p_profile_id
            )
        ),
        'shop', (
            SELECT json_build_object(
                'name', s.name,
                'slug', s.slug,
                'logo_url', s.logo_url
            )
            FROM shops s
            WHERE s.profile_id = p_profile_id
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_order_detail_data(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_order_detail_data(UUID, UUID) IS 'Get order detail data including payment_provider';






