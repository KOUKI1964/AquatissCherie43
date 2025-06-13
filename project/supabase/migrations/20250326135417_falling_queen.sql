/*
  # Fix User Registration Process

  1. Changes
    - Update profile creation trigger
    - Add proper validation for new users
    - Ensure email uniqueness
    - Handle metadata properly

  2. Security
    - Maintain RLS policies
    - Ensure proper data validation
*/

-- Drop existing triggers and functions to avoid conflicts
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS public.handle_new_user();
    DROP TRIGGER IF EXISTS validate_new_user_trigger ON auth.users;
    DROP FUNCTION IF EXISTS validate_new_user();
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create improved user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create profile with all required fields
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        phone,
        user_identifier,
        created_at,
        updated_at,
        login_attempts,
        purchases_count
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
        generate_unique_user_identifier(),
        NOW(),
        NOW(),
        0,
        0
    );

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Handle unique constraint violations gracefully
        RAISE EXCEPTION 'Email already registered';
    WHEN OTHERS THEN
        -- Log other errors and re-raise
        RAISE EXCEPTION 'Error creating user profile: %', SQLERRM;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create function to validate new users
CREATE OR REPLACE FUNCTION validate_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate email format
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;

    -- Check if email already exists in auth.users
    IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = NEW.email 
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Email already registered';
    END IF;

    -- Check if email already exists in profiles
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE email = NEW.email
    ) THEN
        RAISE EXCEPTION 'Email already registered';
    END IF;

    -- Ensure required metadata is present
    IF NEW.raw_user_meta_data IS NULL OR 
       NEW.raw_user_meta_data->>'first_name' IS NULL OR
       NEW.raw_user_meta_data->>'first_name' = '' THEN
        RAISE EXCEPTION 'First name is required';
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for user validation
CREATE TRIGGER validate_new_user_trigger
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION validate_new_user();

-- Update profile policies
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

-- Function to handle profile updates
CREATE OR REPLACE FUNCTION handle_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update auth.users email if changed by admin
  IF NEW.email != OLD.email AND EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  ) THEN
    UPDATE auth.users
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;

  -- Update timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_update();

-- Function to sync auth user changes
CREATE OR REPLACE FUNCTION sync_auth_user_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update profile when auth.users email changes
  IF NEW.email != OLD.email THEN
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auth user changes
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_changes();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION handle_profile_update TO authenticated;
GRANT EXECUTE ON FUNCTION sync_auth_user_changes TO authenticated;