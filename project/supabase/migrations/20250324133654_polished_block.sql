/*
  # Setup Storage for Product Images

  1. Create storage bucket for product images
  2. Setup RLS policies for the bucket
  3. Update image validation function
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the product-images bucket
CREATE POLICY "Admins can manage product images"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'product-images' AND EXISTS (
  SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()
));

CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Update image validation function to handle storage URLs
CREATE OR REPLACE FUNCTION validate_product_image()
RETURNS trigger AS $$
BEGIN
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
    NEW.url := storage.url('product-images', NEW.url);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;