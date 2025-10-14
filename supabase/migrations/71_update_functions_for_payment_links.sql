-- Migration: Update functions to use payment_links instead of paypal_accounts
-- Date: 2025-01-12

-- Update get_onboarding_data function to check payment_links table
CREATE OR REPLACE FUNCTION get_onboarding_data(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  result json;
begin
  select json_build_object(
    'shop', (
      select json_build_object(
        'id', s.id,
        'name', s.name,
        'bio', s.bio,
        'slug', s.slug,
        'logo_url', s.logo_url,
        'instagram', s.instagram,
        'tiktok', s.tiktok,
        'website', s.website,
        'is_custom_accepted', s.is_custom_accepted,
        'is_active', s.is_active
      )
      from shops s
      where s.profile_id = p_profile_id
    ),
    'paypal_account', (
      select json_build_object(
        'id', pl.id,
        'paypal_me', pl.paypal_me,
        'is_active', pl.is_active,
        'created_at', pl.created_at
      )
      from payment_links pl
      where pl.profile_id = p_profile_id
      and pl.is_active = true
    ),
    'has_shop', (
      select count(*) > 0
      from shops s
      where s.profile_id = p_profile_id
    ),
    'has_paypal', (
      select count(*) > 0
      from payment_links pl
      where pl.profile_id = p_profile_id
      and pl.is_active = true
    ),
    'has_subscription', (
      select count(*) > 0
      from user_products up
      where up.profile_id = p_profile_id
    ),
    'is_anti_fraud', (
      select count(*) > 0
      from anti_fraud af
      where af.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;

-- Update get_user_permissions function to check payment_links table
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
    'has_stripe_connect', (
      select count(*) > 0
      from stripe_connect_accounts sca
      where sca.profile_id = p_profile_id
      and sca.is_active = true
    ),
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
grant execute on function get_onboarding_data(uuid) to authenticated;
grant execute on function get_user_permissions(uuid) to authenticated;

-- Add comments
COMMENT ON FUNCTION get_onboarding_data(uuid) IS 'Get onboarding status - updated to use payment_links table';
COMMENT ON FUNCTION get_user_permissions(uuid) IS 'Get user permissions - updated to include has_paypal from payment_links table';
