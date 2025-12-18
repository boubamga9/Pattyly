-- Remove submitter_payer_id from paypal_accounts and anti_fraud tables since we now use merchant_id

-- Remove from paypal_accounts table
ALTER TABLE paypal_accounts DROP COLUMN IF EXISTS submitter_payer_id;

-- Remove from anti_fraud table
ALTER TABLE anti_fraud DROP COLUMN IF EXISTS submitter_payer_id;

-- Remove indexes if they exist
DROP INDEX IF EXISTS idx_paypal_accounts_submitter_payer_id;
DROP INDEX IF EXISTS idx_anti_fraud_submitter_payer_id;

-- Add comment explaining the change
COMMENT ON TABLE paypal_accounts IS 'PayPal accounts table - uses merchant_id for anti-fraud prevention';
COMMENT ON TABLE anti_fraud IS 'Anti-fraud table - uses merchant_id for PayPal fraud prevention';
