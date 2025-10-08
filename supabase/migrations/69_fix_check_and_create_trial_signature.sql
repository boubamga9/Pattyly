-- Fix check_and_create_trial function signature to remove unused parameters
-- and update the webhook handler call

-- Drop the old function with all parameters
DROP FUNCTION IF EXISTS check_and_create_trial(uuid, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS check_and_create_trial(uuid, text, text, text, text);

-- Create the simplified function with only necessary parameters
CREATE OR REPLACE FUNCTION check_and_create_trial(
  p_email text,
  p_merchant_id text,
  p_profile_id uuid,
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
  
  -- Insert anti-fraud record (only merchant_id)
  insert into anti_fraud (merchant_id) values (p_merchant_id);
  
  -- Return success
  select json_build_object(
    'success', true,
    'subscription_id', p_subscription_id
  ) into result;
  
  return result;
end;
$$;

-- Grant execute permissions
grant execute on function check_and_create_trial(text, text, uuid, text, text) to authenticated;

-- Add comment explaining the simplified approach
COMMENT ON FUNCTION check_and_create_trial(text, text, uuid, text, text) IS 'Create trial subscription and anti-fraud record - simplified to only use merchant_id';
