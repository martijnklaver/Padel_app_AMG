-- Drop old RPC functions
DROP FUNCTION IF EXISTS public.save_match_result CASCADE;
DROP FUNCTION IF EXISTS public.update_match_result CASCADE;

-- Drop old tables (order respects FK constraints)
DROP TABLE IF EXISTS public.schedule CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.tournament_settings CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
