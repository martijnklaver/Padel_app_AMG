ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS player_order uuid[];
