-- Migration: Create product_images table for multiple images per product
-- Allows up to 3 images per product with display order

-- Create product_images table
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  public_id TEXT, -- For Cloudinary (facilitates deletion)
  display_order INTEGER NOT NULL DEFAULT 0, -- For ordering images (0, 1, 2)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_display_order ON product_images(product_id, display_order);

-- Enable RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view product images
CREATE POLICY "Public can view product images" ON product_images
  FOR SELECT USING (true);

-- RLS Policy: Users can manage their own product images
CREATE POLICY "Users can manage their own product images" ON product_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN shops s ON p.shop_id = s.id
      WHERE p.id = product_images.product_id
      AND s.profile_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_product_images_updated_at
  BEFORE UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION update_product_images_updated_at();

-- Function to enforce max 3 images per product
CREATE OR REPLACE FUNCTION check_max_product_images()
RETURNS TRIGGER AS $$
DECLARE
  image_count INTEGER;
BEGIN
  -- Count existing images for this product
  SELECT COUNT(*) INTO image_count
  FROM product_images
  WHERE product_id = NEW.product_id;

  -- If this is an INSERT and we already have 3 images, prevent it
  IF TG_OP = 'INSERT' AND image_count >= 3 THEN
    RAISE EXCEPTION 'Un produit ne peut pas avoir plus de 3 images';
  END IF;

  -- If this is an UPDATE and we would have more than 3 images, prevent it
  IF TG_OP = 'UPDATE' AND NEW.product_id != OLD.product_id THEN
    SELECT COUNT(*) INTO image_count
    FROM product_images
    WHERE product_id = NEW.product_id AND id != NEW.id;
    
    IF image_count >= 3 THEN
      RAISE EXCEPTION 'Un produit ne peut pas avoir plus de 3 images';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce max 3 images
CREATE TRIGGER enforce_max_product_images
  BEFORE INSERT OR UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION check_max_product_images();

-- Comment on table
COMMENT ON TABLE product_images IS 'Stores multiple images per product (max 3 images)';
COMMENT ON COLUMN product_images.display_order IS 'Order of display (0, 1, 2)';
COMMENT ON COLUMN product_images.public_id IS 'Cloudinary public_id for image deletion';

