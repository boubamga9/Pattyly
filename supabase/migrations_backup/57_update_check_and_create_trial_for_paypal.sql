-- Mise à jour de la fonction check_and_create_trial pour utiliser paypal_email

-- Drop the old function
DROP FUNCTION IF EXISTS check_and_create_trial(uuid, text, text, text, text, text, text, text);

-- Recreate with new signature (paypal_email instead of ip_address and fingerprint)
create or replace function check_and_create_trial(
  p_profile_id uuid,
  p_email text,
  p_paypal_email text,  -- ✅ Nouveau paramètre
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
  
  -- Insert anti-fraud record with paypal_email
  insert into anti_fraud (
    paypal_email, email, instagram, tiktok
  ) values (
    p_paypal_email, p_email, p_instagram, p_tiktok
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
grant execute on function check_and_create_trial(uuid, text, text, text, text, text, text) to authenticated;

