-- Migration: Appliquer les policies RLS de la base de test vers la production
-- Date: $(date)
-- Description: Copie toutes les policies RLS de la base de test vers la production

-- Supprimer les anciennes policies existantes (optionnel - décommenter si nécessaire)
-- DO $$ 
-- DECLARE
--     r RECORD;
-- BEGIN
--     FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
--         EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, 'public', r.tablename);
--     END LOOP;
-- END $$;

-- Admin OTP Codes
DROP POLICY IF EXISTS "Allow service role to manage admin_otp_codes" ON public.admin_otp_codes;
CREATE POLICY "Allow service role to manage admin_otp_codes" ON public.admin_otp_codes
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admin Sessions
DROP POLICY IF EXISTS "Service role has full access to admin_sessions" ON public.admin_sessions;
CREATE POLICY "Service role has full access to admin_sessions" ON public.admin_sessions
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Availabilities
DROP POLICY IF EXISTS "Users can delete own availabilities" ON public.availabilities;
CREATE POLICY "Users can delete own availabilities" ON public.availabilities
AS PERMISSIVE FOR DELETE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can insert own availabilities" ON public.availabilities;
CREATE POLICY "Users can insert own availabilities" ON public.availabilities
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can update own availabilities" ON public.availabilities;
CREATE POLICY "Users can update own availabilities" ON public.availabilities
AS PERMISSIVE FOR UPDATE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can view own availabilities" ON public.availabilities;
CREATE POLICY "Users can view own availabilities" ON public.availabilities
AS PERMISSIVE FOR SELECT
TO public
USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.is_active = true))) OR (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid)))));

-- Categories
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories" ON public.categories
AS PERMISSIVE FOR DELETE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories" ON public.categories
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories" ON public.categories
AS PERMISSIVE FOR UPDATE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories" ON public.categories
AS PERMISSIVE FOR SELECT
TO public
USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.is_active = true))) OR (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid)))));

-- Events
DROP POLICY IF EXISTS "Allow anonymous users to insert events" ON public.events;
CREATE POLICY "Allow anonymous users to insert events" ON public.events
AS PERMISSIVE FOR INSERT
TO anon
WITH CHECK ((user_id IS NULL));

DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON public.events;
CREATE POLICY "Allow authenticated users to insert events" ON public.events
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR (user_id IS NULL)));

DROP POLICY IF EXISTS "Allow authenticated users to read events" ON public.events;
CREATE POLICY "Allow authenticated users to read events" ON public.events
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service role to insert events" ON public.events;
CREATE POLICY "Allow service role to insert events" ON public.events
AS PERMISSIVE FOR INSERT
TO service_role
WITH CHECK (true);

-- FAQ
DROP POLICY IF EXISTS "Users can delete their own shop's FAQ" ON public.faq;
CREATE POLICY "Users can delete their own shop's FAQ" ON public.faq
AS PERMISSIVE FOR DELETE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can insert their own shop's FAQ" ON public.faq;
CREATE POLICY "Users can insert their own shop's FAQ" ON public.faq
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can update their own shop's FAQ" ON public.faq;
CREATE POLICY "Users can update their own shop's FAQ" ON public.faq
AS PERMISSIVE FOR UPDATE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can view their own shop's FAQ" ON public.faq;
CREATE POLICY "Users can view their own shop's FAQ" ON public.faq
AS PERMISSIVE FOR SELECT
TO public
USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.is_active = true))) OR (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid)))));

-- Form Fields
DROP POLICY IF EXISTS "Users can delete own form fields" ON public.form_fields;
CREATE POLICY "Users can delete own form fields" ON public.form_fields
AS PERMISSIVE FOR DELETE
TO public
USING (form_id IN ( SELECT forms.id
   FROM forms
  WHERE (forms.shop_id IN ( SELECT shops.id
           FROM shops
          WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "Users can insert own form fields" ON public.form_fields;
CREATE POLICY "Users can insert own form fields" ON public.form_fields
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (form_id IN ( SELECT forms.id
   FROM forms
  WHERE (forms.shop_id IN ( SELECT shops.id
           FROM shops
          WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "Users can update own form fields" ON public.form_fields;
CREATE POLICY "Users can update own form fields" ON public.form_fields
AS PERMISSIVE FOR UPDATE
TO public
USING (form_id IN ( SELECT forms.id
   FROM forms
  WHERE (forms.shop_id IN ( SELECT shops.id
           FROM shops
          WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "Users can view own form fields" ON public.form_fields;
CREATE POLICY "Users can view own form fields" ON public.form_fields
AS PERMISSIVE FOR SELECT
TO public
USING ((form_id IN ( SELECT forms.id
   FROM forms
  WHERE (forms.shop_id IN ( SELECT shops.id
           FROM shops
          WHERE (shops.is_active = true))))) OR (form_id IN ( SELECT forms.id
   FROM forms
  WHERE (forms.shop_id IN ( SELECT shops.id
           FROM shops
          WHERE (shops.profile_id = ( SELECT auth.uid() AS uid)))))));

-- Forms
DROP POLICY IF EXISTS "Users can delete own forms" ON public.forms;
CREATE POLICY "Users can delete own forms" ON public.forms
AS PERMISSIVE FOR DELETE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can insert own forms" ON public.forms;
CREATE POLICY "Users can insert own forms" ON public.forms
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can update own forms" ON public.forms;
CREATE POLICY "Users can update own forms" ON public.forms
AS PERMISSIVE FOR UPDATE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can view own forms" ON public.forms;
CREATE POLICY "Users can view own forms" ON public.forms
AS PERMISSIVE FOR SELECT
TO public
USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.is_active = true))) OR (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid)))));

-- Orders
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders" ON public.orders
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders" ON public.orders
AS PERMISSIVE FOR UPDATE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
AS PERMISSIVE FOR SELECT
TO public
USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.is_active = true))) OR (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid)))));

-- Payment Links
DROP POLICY IF EXISTS "Users can create their own payment links" ON public.payment_links;
CREATE POLICY "Users can create their own payment links" ON public.payment_links
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));

DROP POLICY IF EXISTS "Users can update their own payment links" ON public.payment_links;
CREATE POLICY "Users can update their own payment links" ON public.payment_links
AS PERMISSIVE FOR UPDATE
TO public
USING ((( SELECT auth.uid() AS uid) = profile_id));

DROP POLICY IF EXISTS "Users can view their own payment links" ON public.payment_links;
CREATE POLICY "Users can view their own payment links" ON public.payment_links
AS PERMISSIVE FOR SELECT
TO public
USING ((( SELECT auth.uid() AS uid) = profile_id));

-- Pending Orders
DROP POLICY IF EXISTS "Public can delete pending orders" ON public.pending_orders;
CREATE POLICY "Public can delete pending orders" ON public.pending_orders
AS PERMISSIVE FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Public can insert pending orders" ON public.pending_orders;
CREATE POLICY "Public can insert pending orders" ON public.pending_orders
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read pending orders" ON public.pending_orders;
CREATE POLICY "Public can read pending orders" ON public.pending_orders
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Personal Order Notes
DROP POLICY IF EXISTS "Users can delete personal notes for their own shop" ON public.personal_order_notes;
CREATE POLICY "Users can delete personal notes for their own shop" ON public.personal_order_notes
AS PERMISSIVE FOR DELETE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can insert personal notes for their own shop" ON public.personal_order_notes;
CREATE POLICY "Users can insert personal notes for their own shop" ON public.personal_order_notes
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can update personal notes for their own shop" ON public.personal_order_notes;
CREATE POLICY "Users can update personal notes for their own shop" ON public.personal_order_notes
AS PERMISSIVE FOR UPDATE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can view personal notes for their own shop" ON public.personal_order_notes;
CREATE POLICY "Users can view personal notes for their own shop" ON public.personal_order_notes
AS PERMISSIVE FOR SELECT
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

-- Products
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products" ON public.products
AS PERMISSIVE FOR DELETE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
CREATE POLICY "Users can insert own products" ON public.products
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products
AS PERMISSIVE FOR UPDATE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Users can view own products" ON public.products
AS PERMISSIVE FOR SELECT
TO public
USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.is_active = true))) OR (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid)))));

-- Profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK ((( SELECT auth.uid() AS uid) = id));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
AS PERMISSIVE FOR UPDATE
TO public
USING ((( SELECT auth.uid() AS uid) = id));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
AS PERMISSIVE FOR SELECT
TO public
USING ((( SELECT auth.uid() AS uid) = id));

-- Shop Customizations
DROP POLICY IF EXISTS "Users can access their own shop customizations" ON public.shop_customizations;
CREATE POLICY "Users can access their own shop customizations" ON public.shop_customizations
AS PERMISSIVE FOR ALL
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

-- Shop Transfers
DROP POLICY IF EXISTS "Authenticated users can create transfers" ON public.shop_transfers;
CREATE POLICY "Authenticated users can create transfers" ON public.shop_transfers
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));

DROP POLICY IF EXISTS "Authenticated users can view transfers" ON public.shop_transfers;
CREATE POLICY "Authenticated users can view transfers" ON public.shop_transfers
AS PERMISSIVE FOR SELECT
TO public
USING ((( SELECT auth.uid() AS uid) IS NOT NULL));

DROP POLICY IF EXISTS "Users can mark transfers as used for their email" ON public.shop_transfers;
CREATE POLICY "Users can mark transfers as used for their email" ON public.shop_transfers
AS PERMISSIVE FOR UPDATE
TO public
USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (target_email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = ( SELECT auth.uid() AS uid))))::text) AND (used_at IS NULL)));

-- Shops
DROP POLICY IF EXISTS "Users can insert own shop" ON public.shops;
CREATE POLICY "Users can insert own shop" ON public.shops
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));

DROP POLICY IF EXISTS "Users can update own shop" ON public.shops;
CREATE POLICY "Users can update own shop" ON public.shops
AS PERMISSIVE FOR UPDATE
TO public
USING ((( SELECT auth.uid() AS uid) = profile_id));

DROP POLICY IF EXISTS "Users can view own shop" ON public.shops;
CREATE POLICY "Users can view own shop" ON public.shops
AS PERMISSIVE FOR SELECT
TO public
USING (((is_active = true) OR (( SELECT auth.uid() AS uid) = profile_id)));

-- Unavailabilities
DROP POLICY IF EXISTS "Users can delete own unavailabilities" ON public.unavailabilities;
CREATE POLICY "Users can delete own unavailabilities" ON public.unavailabilities
AS PERMISSIVE FOR DELETE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can insert own unavailabilities" ON public.unavailabilities;
CREATE POLICY "Users can insert own unavailabilities" ON public.unavailabilities
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can update own unavailabilities" ON public.unavailabilities;
CREATE POLICY "Users can update own unavailabilities" ON public.unavailabilities
AS PERMISSIVE FOR UPDATE
TO public
USING (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can view own unavailabilities" ON public.unavailabilities;
CREATE POLICY "Users can view own unavailabilities" ON public.unavailabilities
AS PERMISSIVE FOR SELECT
TO public
USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.is_active = true))) OR (shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.profile_id = ( SELECT auth.uid() AS uid)))));

-- User Products
DROP POLICY IF EXISTS "Server can delete subscriptions" ON public.user_products;
CREATE POLICY "Server can delete subscriptions" ON public.user_products
AS PERMISSIVE FOR DELETE
TO public
USING ((( SELECT auth.role() AS role) = 'service_role'::text));

DROP POLICY IF EXISTS "Server can insert subscriptions" ON public.user_products;
CREATE POLICY "Server can insert subscriptions" ON public.user_products
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));

DROP POLICY IF EXISTS "Server can update subscriptions" ON public.user_products;
CREATE POLICY "Server can update subscriptions" ON public.user_products
AS PERMISSIVE FOR UPDATE
TO public
USING ((( SELECT auth.role() AS role) = 'service_role'::text));

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_products;
CREATE POLICY "Users can view own subscriptions" ON public.user_products
AS PERMISSIVE FOR SELECT
TO public
USING ((( SELECT auth.uid() AS uid) = profile_id));

