-- Table Definition: api_metrics
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.api_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  timestamp timestamp with time zone DEFAULT now(),
  endpoint character varying(255) NOT NULL,
  processing_time integer NOT NULL,
  status character varying(50) NOT NULL,
  file_size bigint,
  file_name character varying(500),
  response_size integer,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);ALTER TABLE public.api_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read api_metrics" ON public.api_metrics FOR SELECT USING (auth.role() = 'authenticated');
