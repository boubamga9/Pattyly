-- Migration: Fix remaining auth_rls_initplan performance issues
-- Description: Replace auth.uid() with (select auth.uid()) in RLS policies to optimize performance
-- This prevents re-evaluation of auth functions for each row

-- ==============================================
-- 1. EVENTS TABLE
-- ==============================================
DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON events;
CREATE POLICY "Allow authenticated users to insert events"
ON events FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()) OR user_id IS NULL);

-- ==============================================
-- 2. SHOP_TRANSFERS TABLE
-- ==============================================
-- Fix policies that weren't updated in migration 111
-- Only apply if the table exists (it may be created in a later migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shop_transfers'
    ) THEN
        DROP POLICY IF EXISTS "Authenticated users can create transfers" ON shop_transfers;
        CREATE POLICY "Authenticated users can create transfers" ON shop_transfers
          FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

        DROP POLICY IF EXISTS "Authenticated users can view transfers" ON shop_transfers;
        CREATE POLICY "Authenticated users can view transfers" ON shop_transfers
          FOR SELECT USING ((select auth.uid()) IS NOT NULL);

        DROP POLICY IF EXISTS "Users can mark transfers as used for their email" ON shop_transfers;
        CREATE POLICY "Users can mark transfers as used for their email" ON shop_transfers
          FOR UPDATE USING (
            (select auth.uid()) IS NOT NULL 
            AND target_email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
            AND used_at IS NULL
          );

        -- Fix "Users can view transfers for their email" if it exists
        DROP POLICY IF EXISTS "Users can view transfers for their email" ON shop_transfers;
        CREATE POLICY "Users can view transfers for their email" ON shop_transfers
          FOR SELECT USING (
            (select auth.uid()) IS NOT NULL 
            AND target_email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
          );
    END IF;
END $$;

-- ==============================================
-- 3. PERSONAL_ORDER_NOTES TABLE
-- ==============================================
-- Only apply if the table exists (it may be created in a later migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'personal_order_notes'
    ) THEN
        DROP POLICY IF EXISTS "Users can view personal notes for their own shop" ON personal_order_notes;
        CREATE POLICY "Users can view personal notes for their own shop" ON personal_order_notes
        FOR SELECT USING (
            shop_id IN (
                SELECT id FROM shops 
                WHERE profile_id = (select auth.uid())
            )
        );

        DROP POLICY IF EXISTS "Users can insert personal notes for their own shop" ON personal_order_notes;
        CREATE POLICY "Users can insert personal notes for their own shop" ON personal_order_notes
        FOR INSERT WITH CHECK (
            shop_id IN (
                SELECT id FROM shops 
                WHERE profile_id = (select auth.uid())
            )
        );

        DROP POLICY IF EXISTS "Users can update personal notes for their own shop" ON personal_order_notes;
        CREATE POLICY "Users can update personal notes for their own shop" ON personal_order_notes
        FOR UPDATE USING (
            shop_id IN (
                SELECT id FROM shops 
                WHERE profile_id = (select auth.uid())
            )
        );

        DROP POLICY IF EXISTS "Users can delete personal notes for their own shop" ON personal_order_notes;
        CREATE POLICY "Users can delete personal notes for their own shop" ON personal_order_notes
        FOR DELETE USING (
            shop_id IN (
                SELECT id FROM shops 
                WHERE profile_id = (select auth.uid())
            )
        );
    END IF;
END $$;

-- ==============================================
-- 4. FAQ TABLE
-- ==============================================
-- Only apply if the table exists (it may be created in a later migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'faq'
    ) THEN
        DROP POLICY IF EXISTS "Users can view their own shop's FAQ" ON faq;
        CREATE POLICY "Users can view their own shop's FAQ" ON faq
            FOR SELECT USING (
                shop_id IN (
                    SELECT id FROM shops WHERE profile_id = (select auth.uid())
                )
            );

        DROP POLICY IF EXISTS "Users can manage their own shop's FAQ" ON faq;
        CREATE POLICY "Users can manage their own shop's FAQ" ON faq
            FOR ALL USING (
                shop_id IN (
                    SELECT id FROM shops WHERE profile_id = (select auth.uid())
                )
            );
    END IF;
END $$;

-- ==============================================
-- 5. PAYMENT_LINKS TABLE
-- ==============================================
-- These should already be fixed in migration 111, but ensure they're correct
-- Only apply if the table exists (it may be created in a later migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_links'
    ) THEN
        DROP POLICY IF EXISTS "Users can view their own payment links" ON payment_links;
        CREATE POLICY "Users can view their own payment links" ON payment_links
            FOR SELECT USING ((select auth.uid()) = profile_id);

        DROP POLICY IF EXISTS "Users can create their own payment links" ON payment_links;
        CREATE POLICY "Users can create their own payment links" ON payment_links
            FOR INSERT WITH CHECK ((select auth.uid()) = profile_id);

        DROP POLICY IF EXISTS "Users can update their own payment links" ON payment_links;
        CREATE POLICY "Users can update their own payment links" ON payment_links
            FOR UPDATE USING ((select auth.uid()) = profile_id);
    END IF;
END $$;

