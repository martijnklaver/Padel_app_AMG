-- Achievements & badges
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id),
  achievement_key text NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  UNIQUE(player_id, achievement_key)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all_achievements ON public.achievements;
CREATE POLICY allow_all_achievements ON public.achievements
  FOR ALL USING (true) WITH CHECK (true);

-- Picca van de dag
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS photo_url text;

-- session-photos storage bucket (publiek leesbaar, geen size limit)
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-photos', 'session-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS is al ingeschakeld op storage.objects (zie avatars-migratie); niet opnieuw
-- ALTER-en hier, want dat vereist table-owner rechten die de migratierol niet heeft.

DROP POLICY IF EXISTS "session_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "session_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "session_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "session_photos_delete" ON storage.objects;

CREATE POLICY "session_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'session-photos');

CREATE POLICY "session_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'session-photos');

CREATE POLICY "session_photos_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'session-photos');

CREATE POLICY "session_photos_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'session-photos');
