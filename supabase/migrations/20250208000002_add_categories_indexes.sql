-- Migration: Add indexes to categories table for better performance
-- Purpose: Optimize queries filtering by shop_id and (shop_id, name)
-- Date: 2025-02-08

-- Index on shop_id (for filtering categories by shop)
CREATE INDEX IF NOT EXISTS "idx_categories_shop_id" 
ON "public"."categories" USING btree ("shop_id");

-- Composite index on (shop_id, name) for lookups by shop and name
-- This optimizes the "check if category exists" query used in product creation/update
CREATE INDEX IF NOT EXISTS "idx_categories_shop_id_name" 
ON "public"."categories" USING btree ("shop_id", "name");


