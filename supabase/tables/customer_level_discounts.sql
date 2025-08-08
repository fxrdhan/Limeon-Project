-- Table Definition: customer_level_discounts
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.customer_level_discounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL,
  customer_level_id uuid NOT NULL,
  discount_percentage numeric DEFAULT 0.00,
  discount_rules jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);