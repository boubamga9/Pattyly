-- Add background_image_url column to shop_customizations table

ALTER TABLE shop_customizations 
ADD COLUMN background_image_url TEXT;

-- Add comment
COMMENT ON COLUMN shop_customizations.background_image_url IS 'URL of the background image for the shop slug page';
