/*
  # Fix signup policies

  1. Changes
    - Add INSERT policy for new users to create their profile
    - Drop existing policies to avoid conflicts
    - Recreate all necessary policies

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can read their own profile
      - Users can update their own profile
      - New users can create their profile
*/

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "New users can create profile" ON public.profiles;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create policies
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "New users can create profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add policy for new signups
CREATE POLICY "Enable insert for new signups"
  ON public.profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);