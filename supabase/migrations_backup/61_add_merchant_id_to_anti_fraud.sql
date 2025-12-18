-- Add merchant_id to anti_fraud table for PayPal anti-fraud checks

ALTER TABLE anti_fraud ADD COLUMN IF NOT EXISTS merchant_id TEXT;

COMMENT ON COLUMN anti_fraud.merchant_id IS 'PayPal merchant ID used for anti-fraud detection';

-- Add index for faster lookups on merchant_id
CREATE INDEX IF NOT EXISTS idx_anti_fraud_merchant_id ON anti_fraud (merchant_id);
