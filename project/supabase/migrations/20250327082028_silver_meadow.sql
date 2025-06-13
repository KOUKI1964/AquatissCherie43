/*
  # Fix user creation validation

  1. Changes
    - Improve first_name validation in handle_new_user function
    - Add proper error handling for validation failures
    - Ensure proper transaction handling
    - Fix profile creation order

  2. Security
    - Maintain data integrity
    - Ensure proper validation
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
BEGIN
    -- Extract and validate first_name from metadata
    first_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');

    -- Validate first_name
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
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), ''),
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user TO authenticated;