-- Update check_and_create_trial function to use merchant_id instead of submitter_payer_id

DROP FUNCTION IF EXISTS check_and_create_trial(uuid, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION check_and_create_trial(
  p_profile_id uuid,
  p_email text,
  p_merchant_id text, -- Changed from submitter_payer_id
  p_instagram text,
  p_tiktok text,
  p_stripe_customer_id text,
  p_subscription_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    email, merchant_id, instagram, tiktok -- Updated columns
  ) values (
    p_email, p_merchant_id, p_instagram, p_tiktok -- Updated values
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
