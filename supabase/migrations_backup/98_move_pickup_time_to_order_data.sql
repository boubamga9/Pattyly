-- Move pickup_time from pending_orders column to order_data JSONB and drop the column

-- 1. Update existing pending_orders to include pickup_time in order_data JSONB
UPDATE pending_orders 
SET order_data = order_data || jsonb_build_object('pickup_time', pickup_time)
WHERE pickup_time IS NOT NULL;

-- 2. Drop the pickup_time column from pending_orders table
ALTER TABLE pending_orders DROP COLUMN IF EXISTS pickup_time;
