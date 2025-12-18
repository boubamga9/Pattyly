-- Replace paypal_email with submitter_payer_id in paypal_accounts and anti_fraud tables

-- Update paypal_accounts table
ALTER TABLE paypal_accounts DROP COLUMN IF EXISTS paypal_email;
ALTER TABLE paypal_accounts ADD COLUMN IF NOT EXISTS submitter_payer_id TEXT;

COMMENT ON COLUMN paypal_accounts.submitter_payer_id IS 'PayPal submitter payer ID for anti-fraud detection';

-- Update anti_fraud table
ALTER TABLE anti_fraud DROP COLUMN IF EXISTS paypal_email;
ALTER TABLE anti_fraud ADD COLUMN IF NOT EXISTS submitter_payer_id TEXT;

COMMENT ON COLUMN anti_fraud.submitter_payer_id IS 'PayPal submitter payer ID used for anti-fraud detection';

-- Add index for faster lookups on submitter_payer_id
CREATE INDEX IF NOT EXISTS idx_anti_fraud_submitter_payer_id ON anti_fraud (submitter_payer_id);
CREATE INDEX IF NOT EXISTS idx_paypal_accounts_submitter_payer_id ON paypal_accounts (submitter_payer_id);
