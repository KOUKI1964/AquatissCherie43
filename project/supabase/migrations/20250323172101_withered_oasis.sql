/*
  # Add automatic slug generation for products

  1. Changes
    - Add function to generate unique product slugs
    - Add trigger to automatically generate slugs on insert/update
    - Add function to sanitize text for slugs

  2. Security
    - Ensure unique slugs
    - Handle special characters and spaces
    - Prevent duplicate slugs
*/

-- Function to sanitize text for slugs
CREATE OR REPLACE FUNCTION slugify(text_to_slug text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  slug text;
BEGIN
  -- Convert to lowercase and replace accented characters
  slug := lower(text_to_slug);
  slug := translate(slug, 'àáâãäåāăąèéêëēĕėęěìíîïĩīĭ', 'aaaaaaaaaeeeeeeeeeiiiiiii');
  slug := translate(slug, 'óôõöōŏőøùúûüũūŭůýÿ', 'oooooooouuuuuuuuyy');
  slug := translate(slug, 'śŝşšźżžþðß', 'sssszzztds');
  
  -- Replace spaces and special characters with hyphens
  slug := regexp_replace(slug, '[^a-z0-9\-_]+', '-', 'g');
  
  -- Remove multiple consecutive hyphens
  slug := regexp_replace(slug, '-+', '-', 'g');
  
  -- Remove leading and trailing hyphens
  slug := trim(both '-' from slug);
  
  RETURN slug;
END;
$$;

-- Function to generate a unique product slug
CREATE OR REPLACE FUNCTION generate_unique_product_slug(product_name text, existing_slug text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  new_slug text;
  counter integer := 0;
  slug_exists boolean;
BEGIN
  -- Generate base slug from product name
  base_slug := slugify(product_name);
  
  -- If updating and slug hasn't changed, return existing slug
  IF existing_slug IS NOT NULL AND base_slug = existing_slug THEN
    RETURN existing_slug;
  END IF;
  
  -- Try the base slug first
  new_slug := base_slug;
  
  -- Check if slug exists
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM products WHERE slug = new_slug
      AND CASE 
        WHEN existing_slug IS NOT NULL THEN slug != existing_slug
        ELSE true
      END
    ) INTO slug_exists;
    
    EXIT WHEN NOT slug_exists;
    
    -- If exists, append counter and try again
    counter := counter + 1;
    new_slug := base_slug || '-' || counter::text;
  END LOOP;
  
  RETURN new_slug;
END;
$$;

-- Trigger function to handle slug generation
CREATE OR REPLACE FUNCTION handle_product_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.slug := generate_unique_product_slug(NEW.name);
  ELSIF TG_OP = 'UPDATE' AND (NEW.name != OLD.name OR NEW.slug IS NULL) THEN
    NEW.slug := generate_unique_product_slug(NEW.name, OLD.slug);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic slug generation
DROP TRIGGER IF EXISTS generate_product_slug ON products;
CREATE TRIGGER generate_product_slug
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION handle_product_slug();