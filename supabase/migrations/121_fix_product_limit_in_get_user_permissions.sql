-- Fix product limit in get_user_permissions to use get_product_limit function
-- The function was hardcoding 10 for free/basic plans, but free should be 3

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_user_permissions(uuid);

CREATE OR REPLACE FUNCTION get_user_permissions(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
declare
  result json;
  v_plan text;
  v_product_count integer;
  v_product_limit integer;
  v_shop_id uuid;
  v_shop_slug text;
begin
  -- Get shop info
  select s.id, s.slug
  into v_shop_id, v_shop_slug
  from shops s
  where s.profile_id = p_profile_id;
  
  -- Get plan and product count
  v_plan := get_user_plan(p_profile_id, 'prod_Selcz36pAfV3vV', 'prod_Selbd3Ne2plHqG');
  v_product_count := get_product_count(p_profile_id);
  
  -- ✅ FIX : Utiliser get_product_limit au lieu de valeurs codées en dur
  -- Si pas de plan, utiliser 'free' par défaut
  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;
  v_product_limit := get_product_limit(v_plan);
  
  select json_build_object(
    'shopId', v_shop_id,
    'shopSlug', v_shop_slug,
    'plan', v_plan,
    'productCount', v_product_count,
    'productLimit', v_product_limit, -- ✅ Utiliser la limite calculée
    'canHandleCustomRequests', v_plan in ('premium', 'exempt'),
    'canManageCustomForms', v_plan in ('premium', 'exempt'),
    'canAddMoreProducts', v_product_count < v_product_limit, -- ✅ Utiliser la limite calculée
    'needsSubscription', v_plan is null,
    'isExempt', v_plan = 'exempt',
    'canAccessDashboard', v_plan is not null,
    'has_paypal', (
      select count(*) > 0
      from payment_links pl
      where pl.profile_id = p_profile_id
      and pl.is_active = true
    )
  ) into result;
  
  return result;
end;
$$;

-- Grant execute permissions
grant execute on function get_user_permissions(uuid) to authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_permissions(uuid) IS 'Get user permissions - uses get_product_limit for accurate limits';



