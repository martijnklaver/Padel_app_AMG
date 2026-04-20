CREATE INDEX idx_sessions_date   ON public.sessions (date DESC);
CREATE INDEX idx_sessions_active ON public.sessions (is_active) WHERE is_active = true;

CREATE INDEX idx_schedule_session ON public.schedule (session_id, round_number);
CREATE INDEX idx_schedule_current ON public.schedule (session_id, is_current) WHERE is_current = true;

CREATE INDEX idx_matches_session  ON public.matches (session_id, round_number);
