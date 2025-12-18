-- Fix RLS policy performance issue on stripe_customers
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation for each row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view own stripe customer" ON public.stripe_customers;

-- Recreate the policy with optimized auth.uid() call
CREATE POLICY "Users can view own stripe customer" ON public.stripe_customers
  FOR SELECT
  TO public
  USING (profile_id = (select auth.uid()));

