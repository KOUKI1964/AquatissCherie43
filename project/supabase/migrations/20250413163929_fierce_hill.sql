/*
  # Remove supplier code uniqueness constraint
  
  1. Changes
    - Remove uniqueness constraint on supplier_code in products table
    - Create supplier_codes_history table to track code usage
    - Add functions to manage supplier code history
    
  2. Features
    - Allows multiple products to use the same supplier code
    - Tracks all supplier codes ever used
    - Ensures codes are reused correctly when suppliers are recreated
*/

-- Remove uniqueness constraint on supplier_code if it exists
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_supplier_code_key;

-- Create table to track supplier code history
CREATE TABLE IF NOT EXISTS public.supplier_codes_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code text NOT NULL,
  supplier_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  last_used_at timestamptz
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_supplier_codes_history_code ON public.supplier_codes_history(supplier_code);
CREATE INDEX IF NOT EXISTS idx_supplier_codes_history_active ON public.supplier_codes_history(is_active);

-- Enable RLS
ALTER TABLE public.supplier_codes_history ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admins can manage supplier codes history"
  ON public.supplier_codes_history
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  ));

-- Function to record supplier code when a new supplier is created
CREATE OR REPLACE FUNCTION record_supplier_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this code already exists in history
  IF EXISTS (
    SELECT 1 FROM public.supplier_codes_history
    WHERE supplier_code = NEW.supplier_code
  ) THEN
    -- Update existing record
    UPDATE public.supplier_codes_history
    SET 
      supplier_name = NEW.name,
      is_active = true,
      deleted_at = NULL,
      last_used_at = now()
    WHERE supplier_code = NEW.supplier_code;
  ELSE
    -- Insert new record
    INSERT INTO public.supplier_codes_history (
      supplier_code,
      supplier_name,
      is_active,
      last_used_at
    ) VALUES (
      NEW.supplier_code,
      NEW.name,
      true,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for recording supplier code
DROP TRIGGER IF EXISTS record_supplier_code_trigger ON public.suppliers;
CREATE TRIGGER record_supplier_code_trigger
  AFTER INSERT OR UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION record_supplier_code();

-- Function to mark supplier code as inactive when supplier is deleted
CREATE OR REPLACE FUNCTION mark_supplier_code_inactive()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark code as inactive
  UPDATE public.supplier_codes_history
  SET 
    is_active = false,
    deleted_at = now()
  WHERE supplier_code = OLD.supplier_code;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for marking supplier code as inactive
DROP TRIGGER IF EXISTS mark_supplier_code_inactive_trigger ON public.suppliers;
CREATE TRIGGER mark_supplier_code_inactive_trigger
  BEFORE DELETE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION mark_supplier_code_inactive();

-- Function to check if a supplier code is available
CREATE OR REPLACE FUNCTION is_supplier_code_available(p_code text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.suppliers
    WHERE supplier_code = p_code
  );
END;
$$;

-- Function to get a supplier code's history
CREATE OR REPLACE FUNCTION get_supplier_code_history(p_code text)
RETURNS TABLE (
  supplier_name text,
  is_active boolean,
  created_at timestamptz,
  deleted_at timestamptz,
  last_used_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.supplier_name,
    h.is_active,
    h.created_at,
    h.deleted_at,
    h.last_used_at
  FROM public.supplier_codes_history h
  WHERE h.supplier_code = p_code
  ORDER BY h.created_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.supplier_codes_history TO authenticated;
GRANT EXECUTE ON FUNCTION record_supplier_code TO authenticated;
GRANT EXECUTE ON FUNCTION mark_supplier_code_inactive TO authenticated;
GRANT EXECUTE ON FUNCTION is_supplier_code_available TO authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_code_history TO authenticated;