-- Simplify anti_fraud table to only keep merchant_id
-- Remove unnecessary columns and simplify the check_and_create_trial function

-- Remove unnecessary columns from anti_fraud
ALTER TABLE anti_fraud DROP COLUMN IF EXISTS email;
ALTER TABLE anti_fraud DROP COLUMN IF EXISTS instagram;
ALTER TABLE anti_fraud DROP COLUMN IF EXISTS tiktok;

-- Update check_and_create_trial function to only use merchant_id
DROP FUNCTION IF EXISTS check_and_create_trial(uuid, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION check_and_create_trial(
  p_profile_id uuid,
  p_email text,
  p_merchant_id text,
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
grant execute on function check_and_create_trial(uuid, text, text, text, text, text, text) to authenticated;

-- Add comment explaining the simplified approach
COMMENT ON TABLE anti_fraud IS 'Anti-fraud table - simplified to only track merchant_id for PayPal fraud prevention';
COMMENT ON COLUMN anti_fraud.merchant_id IS 'PayPal merchant ID - one trial per merchant_id';
