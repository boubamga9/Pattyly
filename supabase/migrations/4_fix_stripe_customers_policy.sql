-- Fix stripe_customers RLS policy to allow server-side access
DROP POLICY IF EXISTS "Stripe customers server access" ON stripe_customers;

CREATE POLICY "Stripe customers server access" ON stripe_customers
  FOR ALL USING (true); -- Allow server-side access 