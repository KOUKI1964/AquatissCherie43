/*
  # Update supplier code validation
  
  1. Changes
    - Update the sync_supplier_code function to remove uniqueness check
    - Update the generate_supplier_code function to check history
    - Ensure supplier codes are properly validated
    
  2. Features
    - Allows multiple products to use the same supplier code
    - Ensures supplier codes are properly formatted
    - Maintains backward compatibility
*/

-- Update the sync_supplier_code function to remove uniqueness check
CREATE OR REPLACE FUNCTION sync_supplier_code()
RETURNS TRIGGER AS $$
BEGIN
  -- If the product has a supplier code, verify it exists
  IF NEW.supplier_code IS NOT NULL THEN
    -- Verify the format is correct (3 digits)
    IF NEW.supplier_code !~ '^[0-9]{3}$' THEN
      RAISE EXCEPTION 'Le code fournisseur doit être composé de 3 chiffres';
    END IF;
    
    -- Synchronize the supplierCode field with supplier_code
    NEW."supplierCode" := NEW.supplier_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the generate_supplier_code function to check history
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code text;
  code_exists boolean;
  attempts integer := 0;
  max_attempts integer := 100;
  
  -- Check if this supplier had a code before
  previous_code text;
BEGIN
  -- First, check if this supplier name exists in history
  SELECT supplier_code INTO previous_code
  FROM public.supplier_codes_history
  WHERE supplier_name = NEW.name
  ORDER BY last_used_at DESC
  LIMIT 1;
  
  -- If found and available, reuse the code
  IF previous_code IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM suppliers 
      WHERE supplier_code = previous_code
      AND id != NEW.id
    ) THEN
      NEW.supplier_code := previous_code;
      RETURN NEW;
    END IF;
  END IF;
  
  -- Otherwise generate a new code
  LOOP
    -- Generate a code à 3 chiffres
    new_code := lpad(floor(random() * 900 + 100)::text, 3, '0');
    
    -- Check if the code exists in active suppliers
    SELECT EXISTS (
      SELECT 1 FROM suppliers WHERE supplier_code = new_code
    ) INTO code_exists;
    
    -- Exit if code is unique or after too many attempts
    EXIT WHEN NOT code_exists OR attempts >= max_attempts;
    attempts := attempts + 1;
  END LOOP;
  
  IF attempts >= max_attempts THEN
    RAISE EXCEPTION 'Impossible de générer un code fournisseur unique après % tentatives', max_attempts;
  END IF;
  
  NEW.supplier_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the sync_supplier_code_on_products function
CREATE OR REPLACE FUNCTION sync_supplier_code_on_products()
RETURNS TRIGGER AS $$
BEGIN
  -- If the supplier code has changed, update all products with the old code
  IF NEW.supplier_code != OLD.supplier_code THEN
    -- Record the change in history
    UPDATE public.supplier_codes_history
    SET 
      is_active = false,
      deleted_at = now()
    WHERE supplier_code = OLD.supplier_code;
    
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
    
    -- Update products
    UPDATE products
    SET supplier_code = NEW.supplier_code
    WHERE supplier_code = OLD.supplier_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS sync_supplier_code_trigger ON public.products;
DROP TRIGGER IF EXISTS generate_supplier_code_trigger ON public.suppliers;
DROP TRIGGER IF EXISTS sync_supplier_code_on_products_trigger ON public.suppliers;

-- Recreate triggers
CREATE TRIGGER sync_supplier_code_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION sync_supplier_code();

CREATE TRIGGER generate_supplier_code_trigger
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW
  WHEN (NEW.supplier_code IS NULL)
  EXECUTE FUNCTION generate_supplier_code();

CREATE TRIGGER sync_supplier_code_on_products_trigger
  AFTER UPDATE OF supplier_code ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION sync_supplier_code_on_products();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_supplier_code TO authenticated;
GRANT EXECUTE ON FUNCTION generate_supplier_code TO authenticated;
GRANT EXECUTE ON FUNCTION sync_supplier_code_on_products TO authenticated;