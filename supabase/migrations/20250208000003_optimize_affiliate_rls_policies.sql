-- Migration: Optimize RLS policies for affiliate tables
-- Fix performance issues detected by Supabase linter:
-- 1. Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row
-- 2. Merge multiple SELECT policies on affiliations into a single policy

-- Drop existing policies on affiliations
DROP POLICY IF EXISTS "Users can view their own affiliations as referrer" ON affiliations;
DROP POLICY IF EXISTS "Users can view their own affiliation as referred" ON affiliations;

-- Create a single optimized policy that combines both cases
CREATE POLICY "Users can view their own affiliations"
    ON affiliations FOR SELECT
    USING ((select auth.uid()) = referrer_profile_id 
        OR (select auth.uid()) = referred_profile_id);

-- Optimize policy on affiliate_commissions
DROP POLICY IF EXISTS "Users can view their own commissions" ON affiliate_commissions;

CREATE POLICY "Users can view their own commissions"
    ON affiliate_commissions FOR SELECT
    USING ((select auth.uid()) = referrer_profile_id);

-- Optimize policy on affiliate_payouts
DROP POLICY IF EXISTS "Users can view their own payouts" ON affiliate_payouts;

CREATE POLICY "Users can view their own payouts"
    ON affiliate_payouts FOR SELECT
    USING ((select auth.uid()) = referrer_profile_id);


