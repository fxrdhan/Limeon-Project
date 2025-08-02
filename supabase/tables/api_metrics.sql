-- Table Definition: api_metrics
-- Exported from Supabase on: 2025-08-02T13:07:13.932Z

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
);