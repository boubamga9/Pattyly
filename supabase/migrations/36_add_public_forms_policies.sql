-- Add public policies for forms and form_fields tables
-- This allows non-authenticated users to view forms and form fields
-- for active shops, enabling product customization functionality

-- Public policy for forms table
CREATE POLICY "Public can view forms of active shops" ON forms
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
  );

-- Public policy for form_fields table  
CREATE POLICY "Public can view form fields of active shops" ON form_fields
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM forms 
      WHERE shop_id IN (SELECT id FROM shops WHERE is_active = true)
    )
  );
