/*
  # Fix product images storage configuration

  1. Changes
    - Update product_images table to use public URLs instead of storage paths
    - Add validation for image URLs
    - Update triggers and functions for image handling
*/

-- Modify product_images table to use full URLs
ALTER TABLE public.product_images
ALTER COLUMN url TYPE text,
ALTER COLUMN url SET NOT NULL;

-- Add check constraint for valid URLs
ALTER TABLE public.product_images
ADD CONSTRAINT valid_image_url 
CHECK (url ~* '^https?://.*\.(jpg|jpeg|png|gif|webp)$');

-- Update existing URLs to use full paths if needed
UPDATE public.product_images
SET url = CASE 
  WHEN url NOT LIKE 'http%' THEN 
    'https://images.unsplash.com/photo-' || url
  ELSE url
END;

-- Function to validate image URL
CREATE OR REPLACE FUNCTION validate_image_url()
RETURNS trigger AS $$
BEGIN
  -- Ensure URL is a valid image URL
  IF NEW.url !~ '^https?://.*\.(jpg|jpeg|png|gif|webp)$' THEN
    RAISE EXCEPTION 'Invalid image URL format. Must be a valid HTTP(S) URL ending with an image extension.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;