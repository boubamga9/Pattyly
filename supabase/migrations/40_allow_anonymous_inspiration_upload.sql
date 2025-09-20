-- Allow anonymous users to upload inspiration images
-- This enables non-authenticated users to upload inspiration photos for custom orders

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Allow authenticated users to upload inspiration images" ON storage.objects;

-- Create a new policy that allows both authenticated and anonymous users
CREATE POLICY "Allow users to upload inspiration images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'inspiration-images'
);
