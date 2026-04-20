CREATE TABLE public.players (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_players" ON public.players
  FOR ALL TO anon USING (true) WITH CHECK (true);

INSERT INTO public.players (name) VALUES
  ('Neil'),
  ('Wouter'),
  ('Kay'),
  ('Laurens'),
  ('Martijn');
