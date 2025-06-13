/*
  # Fix supplierCode unique constraint
  
  1. Changes
    - Drop the constraint instead of the index
    - Update the sync_supplier_code function to handle non-unique supplierCode values
    - Ensure proper synchronization between supplier_code and supplierCode
*/

-- Drop the constraint on supplierCode if it exists
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS suppliercode_unique;

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
    -- without enforcing uniqueness
    NEW."supplierCode" := NEW.supplier_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger
DROP TRIGGER IF EXISTS sync_supplier_code_trigger ON public.products;

-- Recreate trigger
CREATE TRIGGER sync_supplier_code_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION sync_supplier_code();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_supplier_code TO authenticated;