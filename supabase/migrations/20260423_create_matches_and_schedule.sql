CREATE TABLE public.matches (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  round_number           int         NOT NULL,
  team1_p1               uuid        NOT NULL REFERENCES public.players(id),
  team1_p2               uuid        NOT NULL REFERENCES public.players(id),
  team2_p1               uuid        NOT NULL REFERENCES public.players(id),
  team2_p2               uuid        NOT NULL REFERENCES public.players(id),
  score_team1            int         NULL,
  score_team2            int         NULL,
  winner                 int         NULL CHECK (winner IN (1, 2)),
  normalized_score_team1 float       NULL,
  normalized_score_team2 float       NULL,
  is_completed           boolean     NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.schedule (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid    NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  round_number int     NOT NULL,
  team1_p1     uuid    NOT NULL REFERENCES public.players(id),
  team1_p2     uuid    NOT NULL REFERENCES public.players(id),
  team2_p1     uuid    NOT NULL REFERENCES public.players(id),
  team2_p2     uuid    NOT NULL REFERENCES public.players(id),
  is_completed boolean NOT NULL DEFAULT false,
  is_current   boolean NOT NULL DEFAULT false
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_matches" ON public.matches
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_schedule" ON public.schedule
  FOR ALL TO anon USING (true) WITH CHECK (true);
