-- Fix function search_path for generate_patient_number
CREATE OR REPLACE FUNCTION public.generate_patient_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.patients;
  new_number := 'PT-' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$;