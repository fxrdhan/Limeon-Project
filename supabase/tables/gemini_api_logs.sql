-- Table Definition: gemini_api_logs
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.gemini_api_logs (
  id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  request_type text,
  status USER-DEFINED NOT NULL,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  response_data jsonb,
  file_info jsonb,
  error_message text
);ALTER TABLE public.gemini_api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read gemini_api_logs" ON public.gemini_api_logs FOR SELECT USING (auth.role() = 'authenticated');
