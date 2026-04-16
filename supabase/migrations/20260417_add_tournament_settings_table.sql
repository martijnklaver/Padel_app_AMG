CREATE TABLE IF NOT EXISTS tournament_settings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  points_per_match int        NOT NULL DEFAULT 12,
  num_courts      int         NOT NULL DEFAULT 1,
  rounds_total    int         NOT NULL,
  is_active       boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tournament_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_tournament_settings" ON tournament_settings
  FOR ALL TO anon USING (true) WITH CHECK (true);
