-- Migration: Create user plan and product count functions
-- Description: Adds two utility functions for user permissions and product counting

-- Drop the old get_user_plan function if it exists
drop function if exists get_user_plan(uuid);

-- Function to get the count of products for a specific user profile
create or replace function get_product_count(profile_id uuid)
returns integer
language sql stable as $$
  select count(*)
  from products p
  join shops s on s.id = p.shop_id
  where s.profile_id = $1
  and p.is_active = true;
$$;

-- Function to get the user's subscription plan
create or replace function get_user_plan(
  p_profile_id uuid,
  premium_product_id text default 'prod_Selcz36pAfV3vV',
  basic_product_id text default 'prod_Selbd3Ne2plHqG'
)
returns text
language plpgsql
as $$
declare
  v_is_free boolean;
  v_product_id text;
begin
  -- Vérifie si l'utilisateur est exempt
  select is_stripe_free
  into v_is_free
  from profiles
  where id = p_profile_id;

  if v_is_free then
    return 'exempt';
  end if;

  -- Récupère l'abonnement actif ou le plus récent
  select stripe_product_id
  into v_product_id
  from user_products
  where profile_id = p_profile_id
  order by (subscription_status = 'active') desc, created_at desc
  limit 1;

  if v_product_id is null then
    return null;
  end if;

  -- Comparaison avec les paramètres
  if v_product_id = premium_product_id then
    return 'premium';
  elsif v_product_id = basic_product_id then
    return 'basic';
  else
    return null;
  end if;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function get_product_count(uuid) to authenticated;
grant execute on function get_user_plan(uuid, text, text) to authenticated;
