/*
  # Fix user creation validation

  1. Changes
    - Move first_name validation to profile creation
    - Update handle_new_user function to validate first_name
    - Remove validation from auth trigger
    - Add proper error handling

  2. Security
    - Maintain data integrity
    - Ensure proper validation
*/

-- Drop existing triggers and functions
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS validate_new_user_trigger ON auth.users;
    DROP FUNCTION IF EXISTS validate_new_user();
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS handle_new_user();
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create improved user creation function with validation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_name text;
BEGIN
    -- Extract first_name from metadata
    first_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');

    -- Validate first_name
    IF first_name IS NULL THEN
        RAISE EXCEPTION 'First name is required';
    END IF;

    -- Create profile with validated data
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
        RAISE EXCEPTION 'Email already registered';
    WHEN OTHERS THEN
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