-- Games & Sets score mode voor sessies met 4 spelers

ALTER TYPE public.score_mode ADD VALUE IF NOT EXISTS 'games_sets';

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS sets_format int NULL;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS set_details jsonb NULL;
