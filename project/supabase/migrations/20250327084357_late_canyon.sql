/*
  # Update user creation process

  1. Changes
    - Improve user validation
    - Ensure data consistency between form and database
    - Add proper error handling
    - Update RLS policies

  2. Security
    - Maintain data integrity
    - Proper validation
    - Secure access control
*/

-- Drop existing triggers and functions
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS handle_new_user();
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create improved user creation function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_name text;
    last_name text;
    phone text;
BEGIN
    -- Extract and validate metadata
    first_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
    last_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
    phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');

    -- Validate required fields
    IF first_name IS NULL OR first_name = '' THEN
        RAISE EXCEPTION 'First name is required';
    END IF;

    -- Create profile
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
        first_name,
        last_name,
        phone,
        generate_unique_user_identifier(),
        NOW(),
        NOW(),
        0,
        0
    );

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Handle unique constraint violations
        RAISE EXCEPTION 'Email already registered';
    WHEN OTHERS THEN
        -- Log other errors and re-raise with a clear message
        RAISE EXCEPTION 'Error creating user profile: %', SQLERRM;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Drop existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Enable insert for new signups" ON public.profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
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

CREATE POLICY "Admins can manage all profiles"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user TO authenticated;