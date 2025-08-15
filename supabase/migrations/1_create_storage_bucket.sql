-- Create shop-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for shop-logos bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'shop-logos');

CREATE POLICY "Authenticated users can upload logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'shop-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'shop-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'shop-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
); 