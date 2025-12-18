-- Migration: Update dashboard functions for PayPal
-- Description: Replace Stripe Connect checks with PayPal checks

-- Update get_user_permissions to check PayPal instead of Stripe Connect
create or replace function get_user_permissions(p_profile_id uuid)
returns json
language plpgsql
as $$
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
      from paypal_accounts pa
      where pa.profile_id = p_profile_id
      and pa.is_active = true
      and pa.onboarding_status = 'completed'
    )
  ) into result;
  
  return result;
end;
$$;

-- Grant execute permission
grant execute on function get_user_permissions(uuid) to authenticated;

-- Add comment
comment on function get_user_permissions(uuid) is 'Get user permissions including PayPal account status';

-- Update get_onboarding_data to check PayPal instead of Stripe Connect
create or replace function get_onboarding_data(p_profile_id uuid)
returns json
language plpgsql
as $$
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
        'website', s.website
      )
      from shops s
      where s.profile_id = p_profile_id
    ),
    'paypal_account', (
      select json_build_object(
        'id', pa.id,
        'paypal_merchant_id', pa.paypal_merchant_id,
        'is_active', pa.is_active,
        'onboarding_status', pa.onboarding_status
      )
      from paypal_accounts pa
      where pa.profile_id = p_profile_id
    ),
    'has_subscription', (
      select count(*) > 0
      from user_products up
      where up.profile_id = p_profile_id
    ),
    'is_anti_fraud', (
      select count(*) > 0
      from anti_fraud af
      where af.email = (
        select email from profiles where id = p_profile_id
      )
    )
  ) into result;
  
  return result;
end;
$$;

-- Grant execute permission
grant execute on function get_onboarding_data(uuid) to authenticated;

-- Add comment
comment on function get_onboarding_data(uuid) is 'Get onboarding data including PayPal account status';

