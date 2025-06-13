/*
  # Add Robes category

  1. Changes
    - Add "Robes" category if it doesn't exist
    - Ensure proper parent-child relationship
*/

DO $$
DECLARE
  vetements_id uuid;
BEGIN
  -- Get the ID of the "Vêtements" category
  SELECT id INTO vetements_id
  FROM public.product_categories
  WHERE slug = 'vetements'
  LIMIT 1;

  -- Insert "Robes" category if it doesn't exist
  INSERT INTO public.product_categories (
    name,
    slug,
    description,
    parent_id,
    is_active
  )
  VALUES (
    'Robes',
    'robes',
    'Collection de robes élégantes pour toutes les occasions',
    vetements_id,
    true
  )
  ON CONFLICT (slug) DO UPDATE
  SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id,
    is_active = EXCLUDED.is_active;
END;
$$;