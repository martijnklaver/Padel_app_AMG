-- Maak avatars bucket aan als die nog niet bestaat
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Verwijder oude policies (alle varianten)
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_delete" ON storage.objects;

-- Zet RLS aan
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Maak nieuwe policies aan
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_public_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_public_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "avatars_public_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars');
