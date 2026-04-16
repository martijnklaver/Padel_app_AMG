-- Enable realtime on all tables (ignore if already a member)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE schedule;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tournament_settings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Update save_match_result to work with schedule table and dynamic points_per_match
DROP FUNCTION IF EXISTS save_match_result(UUID,INT,INT,UUID,UUID,UUID,UUID);

CREATE OR REPLACE FUNCTION save_match_result(
  p_schedule_id    uuid,
  p_score_team1    int,
  p_score_team2    int,
  p_team1_p1       uuid,
  p_team1_p2       uuid,
  p_team2_p1       uuid,
  p_team2_p2       uuid,
  p_points_per_match int DEFAULT 12
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_score_team1 + p_score_team2 <> p_points_per_match THEN
    RAISE EXCEPTION 'Score sum must equal %, got %', p_points_per_match, p_score_team1 + p_score_team2;
  END IF;

  UPDATE schedule SET
    score_team1  = p_score_team1,
    score_team2  = p_score_team2,
    is_completed = true
  WHERE id = p_schedule_id;

  UPDATE players SET
    points_won    = points_won    + p_score_team1,
    points_played = points_played + p_points_per_match
  WHERE id IN (p_team1_p1, p_team1_p2);

  UPDATE players SET
    points_won    = points_won    + p_score_team2,
    points_played = points_played + p_points_per_match
  WHERE id IN (p_team2_p1, p_team2_p2);
END;
$$;

GRANT EXECUTE ON FUNCTION save_match_result(uuid,int,int,uuid,uuid,uuid,uuid,int) TO anon;
