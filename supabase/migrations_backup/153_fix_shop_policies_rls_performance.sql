-- Migration: Fix RLS performance issue for shop_policies
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation for each row

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can access their own shop policies" ON shop_policies;

-- Recreate the policy with optimized auth.uid() call
CREATE POLICY "Users can access their own shop policies" ON shop_policies
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE profile_id = (select auth.uid())
        )
    );

