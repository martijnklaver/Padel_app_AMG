-- ============================================================
--  Padel Americano – Supabase SQL Setup Script
--  Paste this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  points_won    INT  NOT NULL DEFAULT 0,
  points_played INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS matches (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team1_p1     UUID        NOT NULL REFERENCES players(id),
  team1_p2     UUID        NOT NULL REFERENCES players(id),
  team2_p1     UUID        NOT NULL REFERENCES players(id),
  team2_p2     UUID        NOT NULL REFERENCES players(id),
  score_team1  INT,
  score_team2  INT,
  is_completed BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────
-- Allow anonymous read + write (no auth required for now)

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches  ENABLE ROW LEVEL SECURITY;

-- Players: full access for anon
CREATE POLICY "anon_all_players" ON players
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Matches: full access for anon
CREATE POLICY "anon_all_matches" ON matches
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Realtime ──────────────────────────────────────────────────
-- Enable realtime publication for both tables
-- (Run these statements one by one if you get duplicate errors)
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE players;
  ALTER PUBLICATION supabase_realtime ADD TABLE matches;
COMMIT;

-- ── RPC: save_match_result ────────────────────────────────────
-- Atomically saves the score and updates all 4 players' stats.
CREATE OR REPLACE FUNCTION save_match_result(
  p_match_id  UUID,
  p_score_team1 INT,
  p_score_team2 INT,
  p_team1_p1  UUID,
  p_team1_p2  UUID,
  p_team2_p1  UUID,
  p_team2_p2  UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate score sum
  IF p_score_team1 + p_score_team2 <> 12 THEN
    RAISE EXCEPTION 'Score sum must equal 12, got %', p_score_team1 + p_score_team2;
  END IF;

  -- Insert the match record (or update if it already exists)
  INSERT INTO matches (
    id, team1_p1, team1_p2, team2_p1, team2_p2,
    score_team1, score_team2, is_completed
  )
  VALUES (
    p_match_id, p_team1_p1, p_team1_p2, p_team2_p1, p_team2_p2,
    p_score_team1, p_score_team2, true
  )
  ON CONFLICT (id) DO UPDATE SET
    score_team1  = EXCLUDED.score_team1,
    score_team2  = EXCLUDED.score_team2,
    is_completed = true;

  -- Update team 1 players
  UPDATE players SET
    points_won    = points_won    + p_score_team1,
    points_played = points_played + 12
  WHERE id IN (p_team1_p1, p_team1_p2);

  -- Update team 2 players
  UPDATE players SET
    points_won    = points_won    + p_score_team2,
    points_played = points_played + 12
  WHERE id IN (p_team2_p1, p_team2_p2);
END;
$$;

-- Grant execute to anon role
GRANT EXECUTE ON FUNCTION save_match_result(UUID,INT,INT,UUID,UUID,UUID,UUID) TO anon;
