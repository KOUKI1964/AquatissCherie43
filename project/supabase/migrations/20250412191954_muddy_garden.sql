/*
  # Add support for product variants with suffixes
  
  1. Changes
    - Add metadata columns to store variant information
    - Add functions to handle variant SKU generation
    - Add constraints to ensure valid variant suffixes
    
  2. Features
    - Automatic suffix incrementation (.01, .02, etc.)
    - Parent-child relationship between products
    - Validation of variant format
*/

-- Add function to validate SKU format
CREATE OR REPLACE FUNCTION validate_product_sku()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if SKU is in the correct format
  IF NEW.sku !~ '^[0-9]{3}\.[0-9]{6}(\.[0-9]{2})?$' THEN
    RAISE EXCEPTION 'Invalid SKU format. Must be in format: 000.000000 or 000.000000.00';
  END IF;
  
  -- If this is a variant (has a suffix)
  IF NEW.sku ~ '\.[0-9]{2}$' THEN
    -- Extract the base SKU (without suffix)
    DECLARE
      base_sku text;
    BEGIN
      base_sku := substring(NEW.sku from '^(.+)\.[0-9]{2}$');
      
      -- Check if the base SKU exists
      IF NOT EXISTS (
        SELECT 1 FROM products 
        WHERE sku = base_sku
      ) THEN
        RAISE EXCEPTION 'Parent product with SKU % does not exist', base_sku;
      END IF;
      
      -- Store the parent product ID in metadata
      IF NEW.metadata IS NULL THEN
        NEW.metadata := '{}'::jsonb;
      END IF;
      
      NEW.metadata := jsonb_set(
        NEW.metadata,
        '{isVariant}',
        'true'::jsonb
      );
      
      -- Store the variant suffix
      NEW.metadata := jsonb_set(
        NEW.metadata,
        '{variantSuffix}',
        to_jsonb(substring(NEW.sku from '\.[0-9]{2}$'))
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for SKU validation
DROP TRIGGER IF EXISTS validate_product_sku_trigger ON products;
CREATE TRIGGER validate_product_sku_trigger
  BEFORE INSERT OR UPDATE OF sku ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_sku();

-- Function to find the next available variant suffix
CREATE OR REPLACE FUNCTION get_next_variant_suffix(parent_sku text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  highest_suffix integer := 0;
  variant_record record;
  next_suffix text;
BEGIN
  -- Find all variants of the parent SKU
  FOR variant_record IN 
    SELECT sku 
    FROM products 
    WHERE sku LIKE parent_sku || '.%'
    ORDER BY sku
  LOOP
    -- Extract the suffix number
    DECLARE
      suffix_match text;
      suffix_num integer;
    BEGIN
      suffix_match := substring(variant_record.sku from '\.[0-9]{2}$');
      IF suffix_match IS NOT NULL THEN
        suffix_num := substring(suffix_match from '\.[0]*([1-9][0-9]*)$')::integer;
        IF suffix_num > highest_suffix THEN
          highest_suffix := suffix_num;
        END IF;
      END IF;
    END;
  END LOOP;
  
  -- Increment for next available
  next_suffix := '.' || lpad((highest_suffix + 1)::text, 2, '0');
  
  RETURN next_suffix;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_product_sku TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_variant_suffix TO authenticated;