-- Add avatar_url column to players
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create avatars storage bucket (publicly readable, no file size limit)
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'avatars',
  'avatars',
  true,
  ARRAY['image/jpeg', 'image/png', 'image/webp'],
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow upload
CREATE POLICY "Allow insert avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- Allow re-upload (upsert)
CREATE POLICY "Allow update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

-- Allow delete
CREATE POLICY "Allow delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');
