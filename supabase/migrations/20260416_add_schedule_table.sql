CREATE TABLE IF NOT EXISTS schedule (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number int         NOT NULL,
  court_number int         NOT NULL,
  team1_p1     uuid        REFERENCES players(id),
  team1_p2     uuid        REFERENCES players(id),
  team2_p1     uuid        REFERENCES players(id),
  team2_p2     uuid        REFERENCES players(id),
  score_team1  int,
  score_team2  int,
  is_completed boolean     NOT NULL DEFAULT false,
  is_current   boolean     NOT NULL DEFAULT false,
  warning      text
);

ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_schedule" ON schedule
  FOR ALL TO anon USING (true) WITH CHECK (true);
