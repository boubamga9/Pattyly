-- Migration: Create inspiration_images bucket and configure RLS
-- This bucket will store inspiration photos organized by order ID

-- Create the inspiration_images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'inspiration-images',
    'inspiration-images', 
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create RLS policy to allow authenticated users to upload inspiration images
CREATE POLICY "Allow authenticated users to upload inspiration images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'inspiration-images' 
    AND auth.role() = 'authenticated'
);

-- Create RLS policy to allow public read access to inspiration images
CREATE POLICY "Allow public read access to inspiration images" ON storage.objects
FOR SELECT USING (bucket_id = 'inspiration-images');

-- Create RLS policy to allow users to delete their own inspiration images
CREATE POLICY "Allow users to delete inspiration images" ON storage.objects
FOR DELETE USING (
    bucket_id = 'inspiration-images' 
    AND auth.role() = 'authenticated'
);
