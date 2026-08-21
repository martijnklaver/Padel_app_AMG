-- Achievements stapelen: sommige badges kunnen meerdere keren behaald worden.
-- We houden nog steeds één rij per (player_id, achievement_key), maar tellen
-- hoe vaak behaald in `count` i.p.v. dubbele rijen te weigeren.
ALTER TABLE public.achievements
DROP CONSTRAINT IF EXISTS achievements_player_id_achievement_key_key;

ALTER TABLE public.achievements
ADD COLUMN IF NOT EXISTS count int DEFAULT 1;

ALTER TABLE public.achievements
DROP CONSTRAINT IF EXISTS achievements_player_id_achievement_key_key;

ALTER TABLE public.achievements
ADD CONSTRAINT achievements_player_id_achievement_key_key UNIQUE (player_id, achievement_key);
