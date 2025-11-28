-- ==============================================
-- Migration 111: Fix RLS Performance Issues
-- ==============================================
-- This migration fixes two types of performance issues:
-- 1. Auth RLS Initialization Plan: Wraps auth.uid() and auth.role() in (select ...)
--    to prevent re-evaluation for each row
-- 2. Multiple Permissive Policies: Consolidates multiple permissive policies
--    where possible to improve query performance
-- ==============================================

BEGIN;

-- ==============================================
-- 1. FIX AUTH RLS INITIALIZATION PLAN ISSUES
-- ==============================================
-- Replace auth.uid() with (select auth.uid()) and auth.role() with (select auth.role())
-- to prevent re-evaluation for each row

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- User products policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_products;
CREATE POLICY "Users can view own subscriptions" ON user_products
  FOR SELECT USING ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Server can manage subscriptions" ON user_products;
CREATE POLICY "Server can insert subscriptions" ON user_products
  FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');
CREATE POLICY "Server can update subscriptions" ON user_products
  FOR UPDATE USING ((select auth.role()) = 'service_role');
CREATE POLICY "Server can delete subscriptions" ON user_products
  FOR DELETE USING ((select auth.role()) = 'service_role');

-- Shops policies
DROP POLICY IF EXISTS "Users can view own shop" ON shops;
CREATE POLICY "Users can view own shop" ON shops
  FOR SELECT USING ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can update own shop" ON shops;
CREATE POLICY "Users can update own shop" ON shops
  FOR UPDATE USING ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can insert own shop" ON shops;
CREATE POLICY "Users can insert own shop" ON shops
  FOR INSERT WITH CHECK ((select auth.uid()) = profile_id);

-- Categories policies
-- Note: "Users can view own categories" will be created in consolidation section
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );
CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );
CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Products policies
-- Note: "Users can view own products" will be created in consolidation section
DROP POLICY IF EXISTS "Users can manage own products" ON products;
CREATE POLICY "Users can insert own products" ON products
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );
CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );
CREATE POLICY "Users can delete own products" ON products
  FOR DELETE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Forms policies
-- Note: "Users can view own forms" will be created in consolidation section
DROP POLICY IF EXISTS "Users can manage own forms" ON forms;
CREATE POLICY "Users can insert own forms" ON forms
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );
CREATE POLICY "Users can update own forms" ON forms
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );
CREATE POLICY "Users can delete own forms" ON forms
  FOR DELETE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Form fields policies
-- Note: "Users can view own form fields" will be created in consolidation section
DROP POLICY IF EXISTS "Users can manage own form fields" ON form_fields;
CREATE POLICY "Users can insert own form fields" ON form_fields
  FOR INSERT WITH CHECK (
    form_id IN (
      SELECT id FROM forms 
      WHERE shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
    )
  );
CREATE POLICY "Users can update own form fields" ON form_fields
  FOR UPDATE USING (
    form_id IN (
      SELECT id FROM forms 
      WHERE shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
    )
  );
CREATE POLICY "Users can delete own form fields" ON form_fields
  FOR DELETE USING (
    form_id IN (
      SELECT id FROM forms 
      WHERE shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
    )
  );

-- Orders policies
-- Note: "Users can view own orders" will be created in consolidation section

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Availabilities policies
-- Note: "Users can view own availabilities" will be created in consolidation section
DROP POLICY IF EXISTS "Users can manage own availabilities" ON availabilities;
CREATE POLICY "Users can insert own availabilities" ON availabilities
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );
CREATE POLICY "Users can update own availabilities" ON availabilities
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );
CREATE POLICY "Users can delete own availabilities" ON availabilities
  FOR DELETE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Unavailabilities policies
-- Note: "Users can view own unavailabilities" will be created in consolidation section
DROP POLICY IF EXISTS "Users can manage own unavailabilities" ON unavailabilities;
CREATE POLICY "Users can insert own unavailabilities" ON unavailabilities
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );
CREATE POLICY "Users can update own unavailabilities" ON unavailabilities
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );
CREATE POLICY "Users can delete own unavailabilities" ON unavailabilities
  FOR DELETE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Shop customizations policies
DROP POLICY IF EXISTS "Users can access their own shop customizations" ON shop_customizations;
CREATE POLICY "Users can access their own shop customizations" ON shop_customizations
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE profile_id = (select auth.uid())
        )
    );

-- Shop transfers policies
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
    END IF;
END $$;

-- Note: "Users can view transfers for their email" policy is redundant
-- since "Authenticated users can view transfers" already covers all cases
-- We'll drop it in the consolidation section below

-- Personal order notes policies
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

-- FAQ policies
-- Note: "Users can view their own shop's FAQ" will be created in consolidation section
-- Only apply if the table exists (it may be created in a later migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'faq'
    ) THEN
        DROP POLICY IF EXISTS "Users can manage their own shop's FAQ" ON faq;
        CREATE POLICY "Users can insert their own shop's FAQ" ON faq
            FOR INSERT WITH CHECK (
                shop_id IN (
                    SELECT id FROM shops WHERE profile_id = (select auth.uid())
                )
            );
        CREATE POLICY "Users can update their own shop's FAQ" ON faq
            FOR UPDATE USING (
                shop_id IN (
                    SELECT id FROM shops WHERE profile_id = (select auth.uid())
                )
            );
        CREATE POLICY "Users can delete their own shop's FAQ" ON faq
            FOR DELETE USING (
                shop_id IN (
                    SELECT id FROM shops WHERE profile_id = (select auth.uid())
                )
            );
    END IF;
END $$;

-- Payment links policies
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

-- ==============================================
-- 2. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- ==============================================
-- Combine multiple permissive SELECT policies into single policies using OR conditions
-- This improves performance by reducing the number of policies that need to be evaluated

-- Shops: Combine "Public can view active shops" and "Users can view own shop"
DROP POLICY IF EXISTS "Public can view active shops" ON shops;
-- Keep "Users can view own shop" as it already covers both cases with OR
-- But we need to update it to include public access
DROP POLICY IF EXISTS "Users can view own shop" ON shops;
CREATE POLICY "Users can view own shop" ON shops
  FOR SELECT USING (
    is_active = true 
    OR (select auth.uid()) = profile_id
  );

-- Categories: Combine public and user policies
DROP POLICY IF EXISTS "Public can view categories of active shops" ON categories;
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
    OR shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Products: Combine public and user policies
DROP POLICY IF EXISTS "Public can view products of active shops" ON products;
DROP POLICY IF EXISTS "Users can view own products" ON products;
CREATE POLICY "Users can view own products" ON products
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
    OR shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Forms: Combine public and user policies
DROP POLICY IF EXISTS "Public can view forms of active shops" ON forms;
DROP POLICY IF EXISTS "Users can view own forms" ON forms;
CREATE POLICY "Users can view own forms" ON forms
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
    OR shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Form fields: Combine public and user policies
DROP POLICY IF EXISTS "Public can view form fields of active shops" ON form_fields;
DROP POLICY IF EXISTS "Users can view own form fields" ON form_fields;
CREATE POLICY "Users can view own form fields" ON form_fields
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM forms 
      WHERE shop_id IN (SELECT id FROM shops WHERE is_active = true)
    )
    OR form_id IN (
      SELECT id FROM forms 
      WHERE shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
    )
  );

-- Orders: Combine public and user policies
DROP POLICY IF EXISTS "Public can view orders from active shops" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
    OR shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Availabilities: Combine public and user policies
DROP POLICY IF EXISTS "Public can view availabilities of active shops" ON availabilities;
DROP POLICY IF EXISTS "Users can view own availabilities" ON availabilities;
CREATE POLICY "Users can view own availabilities" ON availabilities
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
    OR shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- Unavailabilities: Combine public and user policies
DROP POLICY IF EXISTS "Public can view unavailabilities of active shops" ON unavailabilities;
DROP POLICY IF EXISTS "Users can view own unavailabilities" ON unavailabilities;
CREATE POLICY "Users can view own unavailabilities" ON unavailabilities
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
    OR shop_id IN (SELECT id FROM shops WHERE profile_id = (select auth.uid()))
  );

-- FAQ: Combine public and user policies
-- Only apply if the table exists (it may be created in a later migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'faq'
    ) THEN
        DROP POLICY IF EXISTS "Public can view FAQ" ON faq;
        DROP POLICY IF EXISTS "Users can view their own shop's FAQ" ON faq;
        CREATE POLICY "Users can view their own shop's FAQ" ON faq
            FOR SELECT USING (
                shop_id IN (SELECT id FROM shops WHERE is_active = true)
                OR shop_id IN (
                    SELECT id FROM shops WHERE profile_id = (select auth.uid())
                )
            );
    END IF;
END $$;

-- Shop transfers: Remove redundant SELECT policy
-- "Authenticated users can view transfers" already covers all authenticated users viewing all transfers
-- "Users can view transfers for their email" is redundant for SELECT (but we keep it for clarity if needed)
-- However, to fix the linter warning, we remove the redundant one
-- Only apply if the table exists (it may be created in a later migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shop_transfers'
    ) THEN
        DROP POLICY IF EXISTS "Users can view transfers for their email" ON shop_transfers;
        -- The "Authenticated users can view transfers" policy (already updated above) covers all cases
    END IF;
END $$;

-- User products: "Server can manage subscriptions" has been split into
-- separate INSERT, UPDATE, DELETE policies (no SELECT), so it won't conflict
-- with "Users can view own subscriptions" SELECT policy.

COMMIT;

