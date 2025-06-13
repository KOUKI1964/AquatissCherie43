/*
  # Setup Hybrid Discount Keys System

  1. New Tables
    - `discount_keys`
      - Stores hybrid discount keys (4 first digits + 4 last digits)
      - Tracks key status and usage
      - Links to products and users
    - `discount_keys_usage`
      - Tracks all key activations and attempts
      - Ensures single-use policy
      - Maintains audit trail

  2. Security
    - Enable RLS
    - Add policies for access control
    - Prevent key reuse
*/

-- Add share_discount_key column to profiles if it doesn't exist
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

-- Create discount keys table
CREATE TABLE IF NOT EXISTS public.discount_keys (
  code text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('silver', 'bronze', 'gold')),
  percentage integer NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id)
);

-- Create discount keys usage table
CREATE TABLE IF NOT EXISTS public.discount_keys_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(code)
);

-- Enable RLS
ALTER TABLE public.discount_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_keys_usage ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discount_keys_type ON public.discount_keys(type);
CREATE INDEX IF NOT EXISTS idx_discount_keys_is_active ON public.discount_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_keys_usage_code ON public.discount_keys_usage(code);
CREATE INDEX IF NOT EXISTS idx_discount_keys_usage_user ON public.discount_keys_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_keys_usage_partner ON public.discount_keys_usage(partner_id);

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage discount keys" ON public.discount_keys;
    DROP POLICY IF EXISTS "Anyone can view active discount keys" ON public.discount_keys;
    DROP POLICY IF EXISTS "Users can view own discount key usage" ON public.discount_keys_usage;
    DROP POLICY IF EXISTS "Users can create discount key usage" ON public.discount_keys_usage;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create policies for discount keys
CREATE POLICY "Admins can manage discount keys"
  ON public.discount_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active discount keys"
  ON public.discount_keys
  FOR SELECT
  TO public
  USING (is_active = true);

-- Create policies for discount keys usage
CREATE POLICY "Users can view own discount key usage"
  ON public.discount_keys_usage
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.uid() = partner_id
  );

CREATE POLICY "Users can create discount key usage"
  ON public.discount_keys_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to validate discount key combination
CREATE OR REPLACE FUNCTION validate_discount_key_combination(
  user_identifier text,
  partner_identifier text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_exists boolean;
  partner_exists boolean;
  combination_exists boolean;
BEGIN
  -- Check if user identifier exists
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE substring(user_identifier from 1 for 4) = substring(profiles.user_identifier from 1 for 4)
  ) INTO user_exists;

  -- Check if partner identifier exists and shares discount keys
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE substring(partner_identifier from 5 for 4) = substring(profiles.user_identifier from 5 for 4)
    AND share_discount_key = true
  ) INTO partner_exists;

  -- Check if combination has been used
  SELECT EXISTS (
    SELECT 1 FROM discount_keys_usage
    WHERE code = user_identifier || partner_identifier
  ) INTO combination_exists;

  -- Return true only if all conditions are met
  RETURN user_exists AND partner_exists AND NOT combination_exists;
END;
$$;

-- Function to get user from identifier part
CREATE OR REPLACE FUNCTION get_user_from_identifier_part(
  identifier_part text,
  is_first_part boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  IF is_first_part THEN
    -- Get user by first 4 digits
    SELECT id INTO user_id
    FROM profiles
    WHERE substring(user_identifier from 1 for 4) = identifier_part;
  ELSE
    -- Get user by last 4 digits
    SELECT id INTO user_id
    FROM profiles
    WHERE substring(user_identifier from 5 for 4) = identifier_part
    AND share_discount_key = true;
  END IF;

  RETURN user_id;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.discount_keys TO authenticated;
GRANT ALL ON public.discount_keys_usage TO authenticated;
GRANT EXECUTE ON FUNCTION validate_discount_key_combination TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_from_identifier_part TO authenticated;