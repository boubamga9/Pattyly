-- Add partner_referral_id and paypal_email to paypal_accounts

ALTER TABLE paypal_accounts 
ADD COLUMN IF NOT EXISTS partner_referral_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS paypal_email TEXT;

COMMENT ON COLUMN paypal_accounts.partner_referral_id IS 'PayPal Partner Referral ID for checking onboarding status';
COMMENT ON COLUMN paypal_accounts.paypal_email IS 'PayPal email address (used for anti-fraud detection)';

