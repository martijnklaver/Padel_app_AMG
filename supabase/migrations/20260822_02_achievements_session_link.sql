-- Achievements koppelen aan de sessie waarin ze behaald zijn, zodat per sessie
-- getoond kan worden welke achievements daar zijn behaald. Stapelbare
-- achievements (bijv. Sessiewinnaar) krijgen voortaan een aparte rij per keer
-- behaald i.p.v. één rij met een `count` — de unique constraint op
-- (player_id, achievement_key) staat dat nu in de weg en wordt verwijderd.
ALTER TABLE public.achievements
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.sessions(id);

ALTER TABLE public.achievements
DROP CONSTRAINT IF EXISTS achievements_player_id_achievement_key_key;
