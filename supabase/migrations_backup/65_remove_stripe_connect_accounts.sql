-- Remove stripe_connect_accounts table and related functions since we now use PayPal

-- Drop the table and all related objects
DROP TABLE IF EXISTS stripe_connect_accounts CASCADE;

-- Add comment explaining the change
COMMENT ON SCHEMA public IS 'Stripe Connect accounts removed - now using PayPal for payments';
