-- Create shop_backgrounds bucket for background images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'shop_backgrounds',
    'shop_backgrounds',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create RLS policies for shop_backgrounds bucket
CREATE POLICY "Authenticated users can upload background images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shop_backgrounds');

CREATE POLICY "Authenticated users can update their background images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'shop_backgrounds');

CREATE POLICY "Authenticated users can delete their background images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'shop_backgrounds');

-- Public read access for background images
CREATE POLICY "Public can view background images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shop_backgrounds');
