-- Allow anon role to upload files to the payment-files bucket (local-auth app has no Supabase session)
DROP POLICY IF EXISTS payment_files_upload ON storage.objects;
CREATE POLICY payment_files_upload
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-files');

-- Allow anon to update and delete files too
DROP POLICY IF EXISTS payment_files_update ON storage.objects;
CREATE POLICY payment_files_update
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'payment-files')
  WITH CHECK (bucket_id = 'payment-files');

DROP POLICY IF EXISTS payment_files_delete ON storage.objects;
CREATE POLICY payment_files_delete
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'payment-files');
