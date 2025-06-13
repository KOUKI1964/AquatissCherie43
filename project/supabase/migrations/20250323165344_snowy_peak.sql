/*
  # Add initial clothing category

  1. Changes
    - Insert the "Vêtements" category
    - Add initial subcategories
*/

-- Insert main clothing category
INSERT INTO public.product_categories (name, slug, description)
VALUES (
  'Vêtements',
  'vetements',
  'Collection de vêtements élégants et raffinés'
)
ON CONFLICT (slug) DO NOTHING;

-- Get the ID of the main category
WITH clothing_category AS (
  SELECT id FROM public.product_categories WHERE slug = 'vetements' LIMIT 1
)
-- Insert subcategories
INSERT INTO public.product_categories (name, slug, description, parent_id)
SELECT 
  subcategory.name,
  subcategory.slug,
  subcategory.description,
  clothing_category.id
FROM clothing_category,
(VALUES 
  ('Robes', 'robes', 'Robes élégantes pour toutes les occasions'),
  ('Pulls et Gilets', 'pulls-et-gilets', 'Pulls, gilets et sweatshirts confortables'),
  ('Manteaux', 'manteaux', 'Manteaux et vestes pour toutes les saisons'),
  ('Chemises et Blouses', 'chemises-et-blouses', 'Chemises et blouses raffinées'),
  ('Pantalons', 'pantalons', 'Pantalons et jeans tendance'),
  ('Jupes', 'jupes', 'Jupes élégantes et modernes')
) AS subcategory(name, slug, description)
ON CONFLICT (slug) DO NOTHING;