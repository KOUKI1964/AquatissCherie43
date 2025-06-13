/*
  # Create Category Hierarchy View

  1. Changes
    - Create a view to display the full category hierarchy
    - Include path information for easier navigation
    - Maintain all original column names
    - Set proper security for the view
*/

-- Create the view showing category hierarchy
CREATE OR REPLACE VIEW category_hierarchy_view AS
WITH RECURSIVE category_tree AS (
  -- Base case: top-level categories (no parent)
  SELECT 
    id,
    name,
    slug,
    parent_id,
    is_active,
    name as path_name,
    slug as path_slug,
    1 as level,
    ARRAY[name] as path_array
  FROM product_categories
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive case: categories with parents
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.parent_id,
    c.is_active,
    ct.path_name || ' > ' || c.name as path_name,
    ct.path_slug || '/' || c.slug as path_slug,
    ct.level + 1 as level,
    ct.path_array || c.name as path_array
  FROM product_categories c
  INNER JOIN category_tree ct ON c.parent_id = ct.id
  WHERE ct.level < 3  -- Limit to 3 levels
)
SELECT 
  id,
  name,
  slug,
  parent_id,
  is_active,
  path_name,
  path_slug,
  level,
  CASE 
    WHEN level = 1 THEN 'Menu principal'
    WHEN level = 2 THEN 'Catégorie'
    WHEN level = 3 THEN 'Sous-catégorie'
    ELSE 'Autre'
  END AS level_name
FROM category_tree
ORDER BY path_array;

-- Grant permissions
GRANT SELECT ON category_hierarchy_view TO authenticated, anon;

-- Create policy for public access to active categories
CREATE POLICY "Anyone can view active categories in hierarchy"
  ON product_categories
  FOR SELECT
  TO public
  USING (is_active = true);