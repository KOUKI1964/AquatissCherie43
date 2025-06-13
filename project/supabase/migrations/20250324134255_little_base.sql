/*
  # Fix Storage URL Generation

  1. Changes
    - Remove storage.url() function call
    - Add proper URL construction for storage items
    - Update validation function
*/

-- Create storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'product-images',
    'product-images',
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  );
EXCEPTION
  WHEN unique_violation THEN
    NULL;
END $$;

-- Enable RLS for the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;

-- Create policies for the product-images bucket
CREATE POLICY "Admins can manage product images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id = auth.uid()
  )
);

CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Update image validation function to handle storage URLs
CREATE OR REPLACE FUNCTION validate_product_image()
RETURNS trigger AS $$
DECLARE
  supabase_url text;
BEGIN
  -- Get Supabase URL from environment variable or configuration
  supabase_url := current_setting('app.settings.supabase_url', true);

  -- Vérifier que le produit existe
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = NEW.product_id) THEN
    RAISE EXCEPTION 'Produit invalide';
  END IF;

  -- Vérifier qu'il n'y a qu'une seule image primaire
  IF NEW.is_primary THEN
    UPDATE product_images
    SET is_primary = false
    WHERE product_id = NEW.product_id
    AND id != COALESCE(NEW.id, uuid_nil());
  END IF;

  -- Construire l'URL complète si nécessaire
  IF NEW.url NOT LIKE 'http%' THEN
    NEW.url := supabase_url || '/storage/v1/object/public/product-images/' || NEW.url;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;