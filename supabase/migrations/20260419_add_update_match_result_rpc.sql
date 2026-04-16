-- Add score columns to schedule if not present (already in schema but ensure)
ALTER TABLE public.schedule
  ADD COLUMN IF NOT EXISTS score_team1 int,
  ADD COLUMN IF NOT EXISTS score_team2 int;

-- RPC to correct a previously saved match result
CREATE OR REPLACE FUNCTION public.update_match_result(
  p_schedule_id        uuid,
  p_old_score_team1    int,
  p_old_score_team2    int,
  p_new_score_team1    int,
  p_new_score_team2    int,
  p_old_points_per_match int,
  p_new_points_per_match int,
  p_team1_p1           uuid,
  p_team1_p2           uuid,
  p_team2_p1           uuid,
  p_team2_p2           uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Subtract old scores from team 1
  UPDATE players SET
    points_won    = GREATEST(0, points_won    - p_old_score_team1),
    points_played = GREATEST(0, points_played - p_old_points_per_match)
  WHERE id IN (p_team1_p1, p_team1_p2);

  -- Subtract old scores from team 2
  UPDATE players SET
    points_won    = GREATEST(0, points_won    - p_old_score_team2),
    points_played = GREATEST(0, points_played - p_old_points_per_match)
  WHERE id IN (p_team2_p1, p_team2_p2);

  -- Add new scores to team 1
  UPDATE players SET
    points_won    = points_won    + p_new_score_team1,
    points_played = points_played + p_new_points_per_match
  WHERE id IN (p_team1_p1, p_team1_p2);

  -- Add new scores to team 2
  UPDATE players SET
    points_won    = points_won    + p_new_score_team2,
    points_played = points_played + p_new_points_per_match
  WHERE id IN (p_team2_p1, p_team2_p2);

  -- Update schedule row with new scores
  UPDATE schedule SET
    score_team1 = p_new_score_team1,
    score_team2 = p_new_score_team2
  WHERE id = p_schedule_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_match_result(uuid,int,int,int,int,int,int,uuid,uuid,uuid,uuid) TO anon;
