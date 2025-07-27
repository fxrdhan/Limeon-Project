-- Function: convert_expiry_date
-- Exported from Supabase on: 2025-07-27T11:16:32.138Z

CREATE OR REPLACE FUNCTION public.convert_expiry_date(month_year text)
 RETURNS date
 LANGUAGE plpgsql
AS $function$
DECLARE
  month_num int;
  year_num int;
  last_day date;
BEGIN
  -- Parse bulan dan tahun dari string format "MM-YYYY"
  month_num := split_part(month_year, '-', 1)::int;
  year_num := split_part(month_year, '-', 2)::int;
  
  -- Dapatkan tanggal hari terakhir dari bulan tersebut
  -- Caranya: ambil tanggal 1 bulan berikutnya, lalu kurangi 1 hari
  IF month_num = 12 THEN
    last_day := make_date(year_num + 1, 1, 1) - interval '1 day';
  ELSE
    last_day := make_date(year_num, month_num + 1, 1) - interval '1 day';
  END IF;
  
  RETURN last_day;
END;
$function$
;