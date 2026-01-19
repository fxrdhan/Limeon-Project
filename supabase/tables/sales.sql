-- Table Definition: sales
-- Exported from Supabase on: 2025-08-08T12:52:51.349Z

CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid,
  doctor_id uuid,
  invoice_number character varying(50),
  date date NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  payment_method character varying(20) DEFAULT 'cash'::character varying,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read sales" ON public.sales FOR SELECT USING (auth.role() = 'authenticated');
