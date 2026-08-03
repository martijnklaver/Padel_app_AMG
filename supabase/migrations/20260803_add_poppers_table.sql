CREATE TABLE IF NOT EXISTS public.poppers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id),
  opponent_ids uuid[],
  count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.poppers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read poppers" ON public.poppers FOR SELECT USING (true);
CREATE POLICY "Allow anon insert poppers" ON public.poppers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update poppers" ON public.poppers FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete poppers" ON public.poppers FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.poppers;
