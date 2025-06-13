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
DECLARE
    existing_profile_count integer;
BEGIN
    -- Check if email already exists in profiles
    SELECT COUNT(*) INTO existing_profile_count
    FROM public.profiles
    WHERE email = NEW.email;

    IF existing_profile_count > 0 THEN
        RAISE EXCEPTION 'Email already registered';
    END IF;

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
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

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

    -- Ensure required metadata is present
    IF NEW.raw_user_meta_data IS NULL OR 
       NEW.raw_user_meta_data->>'first_name' IS NULL THEN
        RAISE EXCEPTION 'First name is required';
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for user validation
DROP TRIGGER IF EXISTS validate_new_user_trigger ON auth.users;
CREATE TRIGGER validate_new_user_trigger
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION validate_new_user();