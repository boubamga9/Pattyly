-- ==============================================
-- MISE À JOUR DE LA FONCTION get_order_detail_data
-- ==============================================

-- Mettre à jour la fonction pour inclure order_ref et retirer les anciennes colonnes PayPal

CREATE OR REPLACE FUNCTION get_order_detail_data(p_order_id uuid, p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'order', (
      SELECT json_build_object(
        'id', o.id,
        'customer_name', o.customer_name,
        'customer_email', o.customer_email,
        'customer_phone', o.customer_phone,
        'pickup_date', o.pickup_date,
        'status', o.status,
        'total_amount', o.total_amount,
        'product_name', o.product_name,
        'additional_information', o.additional_information,
        'chef_message', o.chef_message,
        'created_at', o.created_at,
        'chef_pickup_date', o.chef_pickup_date,
        'paid_amount', o.paid_amount,
        'order_ref', o.order_ref,
        'customization_data', o.customization_data,
        'inspiration_photos', o.inspiration_photos,
        'products', json_build_object(
          'name', p.name,
          'description', p.description,
          'image_url', p.image_url,
          'base_price', p.base_price
        )
      )
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.id = p_order_id AND o.shop_id = (SELECT id FROM shops WHERE profile_id = p_profile_id)
    ),
    'personalNote', (
      SELECT json_build_object(
        'note', pn.note,
        'created_at', pn.created_at,
        'updated_at', pn.updated_at
      )
      FROM personal_order_notes pn
      WHERE pn.order_id = p_order_id
    ),
    'shop', (
      SELECT json_build_object(
        'id', s.id,
        'name', s.name
      )
      FROM shops s
      WHERE s.profile_id = p_profile_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

