/*
  # Enable public access to products and categories
  
  1. Changes
    - Add public access policies for products and categories
    - Allow reading published products
    - Allow reading active categories
    - Maintain admin-only write access
*/

-- Drop all existing policies first
DO $$ 
BEGIN
    -- Drop product policies
    DROP POLICY IF EXISTS "Anyone can view published products" ON public.products;
    
    -- Drop category policies
    DROP POLICY IF EXISTS "Anyone can view active categories" ON public.product_categories;
    
    -- Drop media policies
    DROP POLICY IF EXISTS "Anyone can view product media" ON public.product_media;
    DROP POLICY IF EXISTS "Anyone can view media files" ON public.media_files;
    
    -- Drop existing view if it exists
    DROP VIEW IF EXISTS public.product_media_view;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create policy for public product access
CREATE POLICY "Anyone can view published products"
    ON public.products
    FOR SELECT
    TO public
    USING (
        status = 'published'
        AND EXISTS (
            SELECT 1 
            FROM product_categories 
            WHERE product_categories.id = products.category_id 
            AND product_categories.is_active = true
        )
    );

-- Create policy for public category access
CREATE POLICY "Anyone can view active categories"
    ON public.product_categories
    FOR SELECT
    TO public
    USING (is_active = true);

-- Create policy for public product media access
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'product_media' 
        AND policyname = 'Anyone can view product media'
    ) THEN
        CREATE POLICY "Anyone can view product media"
            ON public.product_media
            FOR SELECT
            TO public
            USING (
                EXISTS (
                    SELECT 1 
                    FROM products 
                    WHERE products.id = product_media.product_id 
                    AND products.status = 'published'
                )
            );
    END IF;
END $$;

-- Create policy for public media files access
CREATE POLICY "Anyone can view media files"
    ON public.media_files
    FOR SELECT
    TO public
    USING (is_public = true);

-- Create view for public product access
CREATE OR REPLACE VIEW public.product_media_view AS
SELECT 
    pm.product_id,
    pm.media_id,
    pm.sort_order,
    pm.is_primary,
    pm.created_at,
    mf.name as media_name,
    mf.url as media_url,
    mf.file_type,
    mf.mime_type
FROM public.product_media pm
JOIN public.media_files mf ON mf.id = pm.media_id
JOIN public.products p ON p.id = pm.product_id
WHERE p.status = 'published';

-- Grant access to the view
GRANT SELECT ON public.product_media_view TO public;