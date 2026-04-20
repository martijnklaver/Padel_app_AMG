CREATE TYPE public.score_mode AS ENUM ('points', 'games');

CREATE TABLE public.sessions (
  id               uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  date             date             NOT NULL,
  player_ids       uuid[]           NOT NULL,
  score_mode       public.score_mode NOT NULL DEFAULT 'points',
  points_per_match int              NULL,
  total_matches    int              NOT NULL,
  is_active        boolean          NOT NULL DEFAULT false,
  is_completed     boolean          NOT NULL DEFAULT false,
  created_at       timestamptz      NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_sessions" ON public.sessions
  FOR ALL TO anon USING (true) WITH CHECK (true);
