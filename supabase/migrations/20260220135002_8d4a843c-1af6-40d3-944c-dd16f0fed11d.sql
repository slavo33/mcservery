
-- Create storage bucket for server images
INSERT INTO storage.buckets (id, name, public)
VALUES ('server-images', 'server-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view server images
CREATE POLICY "Server images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-images');

-- Allow authenticated users to upload images to their server folder
CREATE POLICY "Users can upload server images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'server-images' AND auth.uid() IS NOT NULL);

-- Allow users to delete their own server images
CREATE POLICY "Users can delete server images"
ON storage.objects FOR DELETE
USING (bucket_id = 'server-images' AND auth.uid() IS NOT NULL);
