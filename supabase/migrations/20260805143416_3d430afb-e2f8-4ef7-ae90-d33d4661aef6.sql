DROP POLICY IF EXISTS "Authenticated users can upload bug screenshots" ON storage.objects;

CREATE POLICY "Users can upload bug screenshots to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bug-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);