/*
  # Add sort_order to product_categories table
  
  1. Changes
    - Add sort_order column to product_categories table
    - Set default value to 0
    - Update existing categories with sequential sort_order
    - Add index for better performance
*/

-- Add sort_order column if it doesn't exist
ALTER TABLE public.product_categories
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order 
ON public.product_categories(sort_order);

-- Update existing categories with sequential sort_order
DO $$
DECLARE
  category_record RECORD;
  counter INTEGER := 0;
BEGIN
  -- Update root categories
  FOR category_record IN 
    SELECT id FROM product_categories 
    WHERE parent_id IS NULL
    ORDER BY name
  LOOP
    counter := counter + 1;
    UPDATE product_categories 
    SET sort_order = counter
    WHERE id = category_record.id;
  END LOOP;
  
  -- Update level 1 categories (children of root categories)
  FOR category_record IN 
    SELECT DISTINCT parent_id FROM product_categories 
    WHERE parent_id IS NOT NULL
  LOOP
    counter := 0;
    FOR category_record IN 
      SELECT id FROM product_categories 
      WHERE parent_id = category_record.parent_id
      ORDER BY name
    LOOP
      counter := counter + 1;
      UPDATE product_categories 
      SET sort_order = counter
      WHERE id = category_record.id;
    END LOOP;
  END LOOP;
  
  -- Update level 2 categories (children of level 1 categories)
  FOR category_record IN 
    SELECT id FROM product_categories 
    WHERE parent_id IN (
      SELECT id FROM product_categories 
      WHERE parent_id IS NOT NULL
    )
  LOOP
    counter := 0;
    FOR category_record IN 
      SELECT id FROM product_categories 
      WHERE parent_id = category_record.id
      ORDER BY name
    LOOP
      counter := counter + 1;
      UPDATE product_categories 
      SET sort_order = counter
      WHERE id = category_record.id;
    END LOOP;
  END LOOP;
END;
$$;