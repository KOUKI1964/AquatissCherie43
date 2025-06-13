/*
  # Setup Row Level Security Policies

  1. Changes
    - Enable RLS on profiles table
    - Setup all necessary policies for authentication flow
    - Ensure proper access control for different user types

  2. Security Policies
    - Anonymous users can create profiles during signup
    - Authenticated users can read their own profile
    - Authenticated users can update their own profile
    - Automatic profile creation on user signup
*/

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Enable insert for new signups" ON public.profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

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

-- Ensure trigger function exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();