-- Ensure avatar_url column exists on players
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create or update avatars bucket (public readable)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop any existing avatar policies so we can recreate cleanly
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete avatars" ON storage.objects;

-- Recreate policies allowing anonymous (unauthenticated) access
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Allow insert avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

CREATE POLICY "Allow delete avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');
