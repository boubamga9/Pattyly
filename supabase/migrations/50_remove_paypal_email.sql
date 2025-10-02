-- Migration: Remove unused paypal_email column
-- Description: paypal_email is never used in the codebase and serves no purpose

-- Drop the paypal_email column
ALTER TABLE paypal_accounts DROP COLUMN IF EXISTS paypal_email;

-- Add comment explaining the schema
COMMENT ON TABLE paypal_accounts IS 'Stores PayPal merchant account information for payment processing';
COMMENT ON COLUMN paypal_accounts.paypal_merchant_id IS 'PayPal merchant ID returned after successful onboarding';
COMMENT ON COLUMN paypal_accounts.onboarding_url IS 'PayPal onboarding URL (valid ~3h, useful if user returns)';
COMMENT ON COLUMN paypal_accounts.tracking_id IS 'Unique tracking ID used to link onboarding session to our user';
COMMENT ON COLUMN paypal_accounts.onboarding_status IS 'Current status of PayPal onboarding process';
COMMENT ON COLUMN paypal_accounts.is_active IS 'Whether the account is active and can receive payments';

