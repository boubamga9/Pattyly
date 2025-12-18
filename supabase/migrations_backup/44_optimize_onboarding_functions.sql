-- Migration: Optimize onboarding database calls
-- Description: Create consolidated functions to reduce DB calls in onboarding

-- Function to get all onboarding data in one call
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
    'stripe_account', (
      select json_build_object(
        'id', sca.id,
        'stripe_account_id', sca.stripe_account_id,
        'is_active', sca.is_active
      )
      from stripe_connect_accounts sca
      where sca.profile_id = p_profile_id
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

-- Function to create shop with default availabilities in one transaction
create or replace function create_shop_with_availabilities(
  p_profile_id uuid,
  p_name text,
  p_bio text,
  p_slug text,
  p_logo_url text,
  p_instagram text,
  p_tiktok text,
  p_website text
)
returns json
language plpgsql
as $$
declare
  shop_id uuid;
  result json;
begin
  -- Insert shop
  insert into shops (
    profile_id, name, bio, slug, logo_url, 
    instagram, tiktok, website
  ) values (
    p_profile_id, p_name, p_bio, p_slug, p_logo_url,
    p_instagram, p_tiktok, p_website
  ) returning id into shop_id;
  
  -- Insert default availabilities (Mon-Fri)
  insert into availabilities (shop_id, day, is_open)
  select shop_id, day, (day >= 1 and day <= 5) as is_open
  from generate_series(0, 6) as day;
  
  -- Return shop data
  select json_build_object(
    'id', s.id,
    'name', s.name,
    'bio', s.bio,
    'slug', s.slug,
    'logo_url', s.logo_url,
    'instagram', s.instagram,
    'tiktok', s.tiktok,
    'website', s.website
  ) into result
  from shops s
  where s.id = shop_id;
  
  return result;
end;
$$;

-- Function to check trial eligibility and create trial in one call
create or replace function check_and_create_trial(
  p_profile_id uuid,
  p_email text,
  p_ip_address text,
  p_fingerprint text,
  p_instagram text,
  p_tiktok text,
  p_stripe_customer_id text,
  p_subscription_id text
)
returns json
language plpgsql
security definer
as $$
declare
  result json;
  customer_exists boolean;
begin
  -- Check if customer already exists
  select count(*) > 0 into customer_exists
  from stripe_customers
  where profile_id = p_profile_id;
  
  -- Insert/update customer if needed
  if not customer_exists then
    insert into stripe_customers (profile_id, stripe_customer_id)
    values (p_profile_id, p_stripe_customer_id);
  end if;
  
  -- Insert/update subscription
  insert into user_products (
    profile_id, stripe_product_id, stripe_subscription_id, subscription_status
  ) values (
    p_profile_id, 'prod_Selcz36pAfV3vV', p_subscription_id, 'active'
  )
  on conflict (profile_id) 
  do update set 
    stripe_product_id = excluded.stripe_product_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    subscription_status = excluded.subscription_status;
  
  -- Insert anti-fraud record
  insert into anti_fraud (
    fingerprint, ip_address, email, instagram, tiktok
  ) values (
    p_fingerprint, p_ip_address, p_email, p_instagram, p_tiktok
  );
  
  -- Return success
  select json_build_object(
    'success', true,
    'subscription_id', p_subscription_id
  ) into result;
  
  return result;
end;
$$;

-- Grant execute permissions
grant execute on function get_onboarding_data(uuid) to authenticated;
grant execute on function create_shop_with_availabilities(uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function check_and_create_trial(uuid, text, text, text, text, text, text, text) to authenticated;
