-- Migration: Migrate policies from shops table to shop_policies table
-- This migrates any existing policy data from shops columns to the new shop_policies table

-- Migrate existing policies from shops to shop_policies
INSERT INTO shop_policies (shop_id, terms_and_conditions, return_policy, delivery_policy, payment_terms)
SELECT 
    id as shop_id,
    terms_and_conditions,
    return_policy,
    delivery_policy,
    payment_terms
FROM shops
WHERE 
    terms_and_conditions IS NOT NULL 
    OR return_policy IS NOT NULL 
    OR delivery_policy IS NOT NULL 
    OR payment_terms IS NOT NULL
ON CONFLICT (shop_id) DO UPDATE SET
    terms_and_conditions = EXCLUDED.terms_and_conditions,
    return_policy = EXCLUDED.return_policy,
    delivery_policy = EXCLUDED.delivery_policy,
    payment_terms = EXCLUDED.payment_terms;

