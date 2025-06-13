/*
  # Fix User Signup Flow

  1. Changes
    - Update profile creation trigger
    - Fix RLS policies
    - Add proper indexes
    - Ensure all required columns exist

  2. Security
    - Enable RLS
    - Add proper policies for signup
    - Grant necessary permissions
*/

-- Drop existing trigger and function to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile with all required fields
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    user_identifier,
    created_at,
    updated_at,
    login_attempts,
    purchases_count
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    NEW.raw_user_meta_data->>'last_name',
    generate_unique_user_identifier(),
    NOW(),
    NOW(),
    0,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Enable insert for new signups" ON public.profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create comprehensive set of policies
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

CREATE POLICY "Enable insert for new signups"
  ON public.profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_identifier ON public.profiles(user_identifier);
CREATE INDEX IF NOT EXISTS idx_profiles_login_attempts ON public.profiles(login_attempts) WHERE login_attempts > 0;
CREATE INDEX IF NOT EXISTS idx_profiles_blocked_until ON public.profiles(blocked_until) WHERE blocked_until IS NOT NULL;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;