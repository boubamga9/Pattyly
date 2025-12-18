-- Remove unique constraint on paypal_merchant_id to allow multiple shops per PayPal account
-- Keep anti-fraud check to prevent duplicate trials

ALTER TABLE paypal_accounts DROP CONSTRAINT IF EXISTS paypal_accounts_paypal_merchant_id_key;

-- Add comment explaining the change
COMMENT ON TABLE paypal_accounts IS 'PayPal accounts table - allows multiple shops per merchant_id for anti-fraud prevention';
