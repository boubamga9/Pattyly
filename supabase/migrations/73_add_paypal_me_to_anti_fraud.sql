-- Migration: Add paypal_me column to anti_fraud table
-- Date: 2025-01-12

-- Add paypal_me column to anti_fraud table
ALTER TABLE anti_fraud ADD COLUMN paypal_me VARCHAR(255);

-- Update get_onboarding_data function to use paypal_me in anti_fraud
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
      join payment_links pl on pl.paypal_me = af.paypal_me
      where pl.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;

-- Grant execute permissions
grant execute on function get_onboarding_data(uuid) to authenticated;

-- Add comment
COMMENT ON FUNCTION get_onboarding_data(uuid) IS 'Get onboarding status - uses paypal_me in anti_fraud table';
