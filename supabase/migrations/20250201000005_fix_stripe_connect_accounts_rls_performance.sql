-- Migration: Fix RLS policies performance for stripe_connect_accounts
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row
-- This fixes the "auth_rls_initplan" linter warning for better query performance

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own stripe connect accounts" ON stripe_connect_accounts;
DROP POLICY IF EXISTS "Users can insert their own stripe connect accounts" ON stripe_connect_accounts;
DROP POLICY IF EXISTS "Users can update their own stripe connect accounts" ON stripe_connect_accounts;

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "Users can view their own stripe connect accounts"
    ON stripe_connect_accounts FOR SELECT
    USING ((select auth.uid()) = profile_id);

CREATE POLICY "Users can insert their own stripe connect accounts"
    ON stripe_connect_accounts FOR INSERT
    WITH CHECK ((select auth.uid()) = profile_id);

CREATE POLICY "Users can update their own stripe connect accounts"
    ON stripe_connect_accounts FOR UPDATE
    USING ((select auth.uid()) = profile_id);

