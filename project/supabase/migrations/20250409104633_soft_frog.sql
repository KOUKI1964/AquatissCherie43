/*
  # Add missing Accessoires categories
  
  1. Changes
    - Add "Accessoires" main category if it doesn't exist
    - Add "Accessoires de luxe" subcategory
    - Add all missing subcategories under "Accessoires de luxe"
    
  2. Structure
    - Level 1: Accessoires (Menu principal)
    - Level 2: Accessoires de luxe (Catégorie)
    - Level 3: Subcategories (Sous-catégories)
*/

-- Function to create or update a category
CREATE OR REPLACE FUNCTION upsert_category(
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id uuid;
BEGIN
  -- Check if category exists
  SELECT id INTO v_category_id
  FROM product_categories
  WHERE slug = p_slug;
  
  IF v_category_id IS NULL THEN
    -- Insert new category
    INSERT INTO product_categories (
      name,
      slug,
      description,
      parent_id,
      is_active
    ) VALUES (
      p_name,
      p_slug,
      p_description,
      p_parent_id,
      true
    )
    RETURNING id INTO v_category_id;
  ELSE
    -- Update existing category
    UPDATE product_categories
    SET
      name = p_name,
      description = COALESCE(p_description, description),
      parent_id = p_parent_id,
      is_active = true,
      updated_at = now()
    WHERE id = v_category_id;
  END IF;
  
  RETURN v_category_id;
END;
$$;

-- Add missing categories
DO $$
DECLARE
  accessoires_id uuid;
  accessoires_luxe_id uuid;
BEGIN
  -- Create or update main Accessoires category
  accessoires_id := upsert_category(
    'Accessoires',
    'accessoires',
    'Accessoires de mode et de luxe'
  );
  
  -- Create or update Accessoires de luxe subcategory
  accessoires_luxe_id := upsert_category(
    'Accessoires de luxe',
    'accessoires-luxe',
    'Accessoires de mode haut de gamme',
    accessoires_id
  );
  
  -- Create or update all missing subcategories
  PERFORM upsert_category('Lunettes de soleil', 'lunettes-soleil', 'Lunettes de soleil tendance', accessoires_luxe_id);
  PERFORM upsert_category('Foulards et écharpes', 'foulards-echarpes', 'Foulards et écharpes élégants', accessoires_luxe_id);
  PERFORM upsert_category('Casquettes', 'casquettes', 'Casquettes tendance', accessoires_luxe_id);
  PERFORM upsert_category('Ceintures', 'ceintures', 'Ceintures élégantes', accessoires_luxe_id);
  PERFORM upsert_category('Accessoires pour cheveux', 'accessoires-cheveux', 'Accessoires élégants pour cheveux', accessoires_luxe_id);
  PERFORM upsert_category('Accessoires de téléphone', 'accessoires-telephone', 'Accessoires pour téléphone', accessoires_luxe_id);
END;
$$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS upsert_category(text, text, text, uuid);