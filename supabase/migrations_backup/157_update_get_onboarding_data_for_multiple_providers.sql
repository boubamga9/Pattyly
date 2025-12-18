-- Migration: Update get_onboarding_data to support multiple payment providers
-- Description: Modifies the function to check for any payment provider instead of just PayPal
-- Date: 2025-01-XX

-- Update get_onboarding_data function to support multiple payment providers
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
    -- Retourner le premier payment_link trouvé pour rétrocompatibilité
    -- (généralement PayPal si existant)
    'paypal_account', (
      select json_build_object(
        'id', pl.id,
        'paypal_me', pl.paypal_me,
        'payment_identifier', pl.payment_identifier,
        'provider_type', pl.provider_type,
        'is_active', pl.is_active,
        'created_at', pl.created_at
      )
      from payment_links pl
      where pl.profile_id = p_profile_id
      and (pl.is_active = true OR pl.is_active IS NULL)
      order by 
        case when pl.provider_type = 'paypal' then 1 else 2 end,
        pl.created_at
      limit 1
    ),
    'has_shop', (
      select count(*) > 0
      from shops s
      where s.profile_id = p_profile_id
    ),
    -- Vérifier qu'il y a au moins un payment_link (peu importe le provider)
    'has_paypal', (
      select count(*) > 0
      from payment_links pl
      where pl.profile_id = p_profile_id
      and (pl.is_active = true OR pl.is_active IS NULL)
    ),
    'has_subscription', (
      select count(*) > 0
      from user_products up
      where up.profile_id = p_profile_id
    )
    -- Note: is_anti_fraud removed - anti_fraud table was deleted in migration 130
  ) into result;
  
  return result;
end;
$$;

-- Grant execute permissions
grant execute on function get_onboarding_data(uuid) to authenticated;

-- Add comment
COMMENT ON FUNCTION get_onboarding_data(uuid) IS 'Get onboarding status - supports multiple payment providers (PayPal, Revolut, etc.)';

