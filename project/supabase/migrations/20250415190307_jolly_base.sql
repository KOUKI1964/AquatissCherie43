/*
  # Add user addresses table
  
  1. New Table
    - `user_addresses`
      - Stores multiple addresses per user
      - Supports default address selection
      - Structured address fields
      
  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create user addresses table
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  street text NOT NULL,
  postal_code text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON public.user_addresses(is_default) WHERE is_default = true;

-- Create policies
CREATE POLICY "Users can view own addresses"
  ON public.user_addresses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses"
  ON public.user_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
  ON public.user_addresses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses"
  ON public.user_addresses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_user_address_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_user_address_timestamp
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_address_updated_at();

-- Add structured address fields to profiles table if they don't exist
DO $$ 
BEGIN
  -- Add street column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'street'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN street text;
  END IF;

  -- Add postal_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN postal_code text;
  END IF;

  -- Add city column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'city'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN city text;
  END IF;

  -- Add country column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'country'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN country text DEFAULT 'FR';
  END IF;
END $$;

-- Function to migrate existing address data
CREATE OR REPLACE FUNCTION migrate_address_data()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- For each profile with an address but no structured fields
  FOR profile_record IN 
    SELECT id, address 
    FROM profiles 
    WHERE address IS NOT NULL 
    AND (street IS NULL OR postal_code IS NULL OR city IS NULL)
  LOOP
    -- Simple migration: put the entire address in the street field
    UPDATE profiles
    SET street = address
    WHERE id = profile_record.id;
  END LOOP;
END;
$$;

-- Run the migration function
SELECT migrate_address_data();

-- Drop the migration function
DROP FUNCTION migrate_address_data();

-- Grant necessary permissions
GRANT ALL ON public.user_addresses TO authenticated;