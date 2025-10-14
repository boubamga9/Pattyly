-- Migration: Fix get_user_permissions to remove stripe_connect_accounts reference
-- Date: 2025-01-12

-- Update get_user_permissions function to remove stripe_connect_accounts check
CREATE OR REPLACE FUNCTION get_user_permissions(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
declare
  result json;
  v_plan text;
  v_product_count integer;
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
  
  select json_build_object(
    'shopId', v_shop_id,
    'shopSlug', v_shop_slug,
    'plan', v_plan,
    'productCount', v_product_count,
    'productLimit', case 
      when v_plan = 'premium' then 999999
      when v_plan = 'exempt' then 999999
      else 10
    end,
    'canHandleCustomRequests', v_plan in ('premium', 'exempt'),
    'canManageCustomForms', v_plan in ('premium', 'exempt'),
    'canAddMoreProducts', v_product_count < case 
      when v_plan = 'premium' then 999999
      when v_plan = 'exempt' then 999999
      else 10
    end,
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
COMMENT ON FUNCTION get_user_permissions(uuid) IS 'Get user permissions - stripe_connect_accounts reference removed';

