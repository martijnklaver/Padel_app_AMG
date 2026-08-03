-- Idempotente versie: veilig om opnieuw uit te voeren
CREATE TABLE IF NOT EXISTS public.poppers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id),
  opponent_ids uuid[],
  count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.poppers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all_poppers ON public.poppers;
CREATE POLICY allow_all_poppers ON public.poppers
  FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.poppers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
