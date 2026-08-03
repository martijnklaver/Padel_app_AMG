-- Zet gestopte sessies op afgerond (is_active = false maar nog niet is_completed)
UPDATE public.sessions
SET is_completed = true
WHERE is_active = false AND is_completed = false;
