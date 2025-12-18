-- Remove partner_referral_id from paypal_accounts table since we no longer use it

ALTER TABLE paypal_accounts DROP COLUMN IF EXISTS partner_referral_id;

-- Add comment explaining the change
COMMENT ON TABLE paypal_accounts IS 'PayPal accounts table - uses merchant_id for anti-fraud prevention, no longer needs partner_referral_id';
