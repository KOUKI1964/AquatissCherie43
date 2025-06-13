/*
  # Add share_discount_key column to profiles table

  1. Changes
    - Add share_discount_key boolean column to profiles table
    - Set default value to false
    - Add index for better performance
*/

-- Add share_discount_key column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'share_discount_key'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN share_discount_key boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_share_discount_key 
ON public.profiles(share_discount_key) 
WHERE share_discount_key = true;