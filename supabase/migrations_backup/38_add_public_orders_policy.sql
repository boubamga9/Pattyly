-- Add public policy for orders table
-- This allows anyone to view orders from active shops
-- This is a simple solution for now - orders are readable by everyone

-- Public policy for viewing orders from active shops
CREATE POLICY "Public can view orders from active shops" ON orders
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
  );
