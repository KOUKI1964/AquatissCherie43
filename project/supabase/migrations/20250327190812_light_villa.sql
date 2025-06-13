/*
  # Add public access to discount keys
  
  1. Changes
    - Add public access policy for discount keys
    - Allow reading active discount keys
    - Maintain admin-only write access
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view active discount keys" ON public.discount_keys;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create policy for public discount key access
CREATE POLICY "Anyone can view active discount keys"
    ON public.discount_keys
    FOR SELECT
    TO public
    USING (is_active = true);

-- Grant necessary permissions
GRANT SELECT ON public.discount_keys TO anon, authenticated;