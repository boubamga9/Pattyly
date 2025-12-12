-- Migration: Optimize RLS policies for push_subscriptions table
-- Description: Fix performance issues with RLS policies by using (select auth.uid()) 
--              and removing redundant service_role policy (service_role bypasses RLS by default)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Server can manage all push subscriptions" ON push_subscriptions;

-- Recreate optimized policies using (select auth.uid()) to avoid re-evaluation for each row
-- This improves query performance at scale

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
    FOR SELECT USING ((select auth.uid()) = profile_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK ((select auth.uid()) = profile_id);

-- Policy: Users can update their own subscriptions
CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
    FOR UPDATE USING ((select auth.uid()) = profile_id);

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
    FOR DELETE USING ((select auth.uid()) = profile_id);

-- Note: service_role bypasses RLS by default in Supabase, so no separate policy is needed
-- The server can manage all subscriptions without needing an explicit policy
