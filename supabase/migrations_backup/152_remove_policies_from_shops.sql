-- Migration: Remove policy columns from shops table
-- After migrating data to shop_policies, we remove the columns from shops

-- Remove policy columns from shops table
ALTER TABLE shops
DROP COLUMN IF EXISTS terms_and_conditions,
DROP COLUMN IF EXISTS return_policy,
DROP COLUMN IF EXISTS delivery_policy,
DROP COLUMN IF EXISTS payment_terms;

-- Remove constraints (they will be automatically dropped with columns, but being explicit)
ALTER TABLE shops
DROP CONSTRAINT IF EXISTS shops_terms_and_conditions_check,
DROP CONSTRAINT IF EXISTS shops_return_policy_check,
DROP CONSTRAINT IF EXISTS shops_delivery_policy_check,
DROP CONSTRAINT IF EXISTS shops_payment_terms_check;

