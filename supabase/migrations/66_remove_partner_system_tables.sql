-- Remove partner system tables since we now use PayPal instead of partner referrals

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS partner_commissions CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS partners CASCADE;

-- Add comment explaining the change
COMMENT ON SCHEMA public IS 'Partner system tables removed - now using PayPal for payments instead of partner referrals';
