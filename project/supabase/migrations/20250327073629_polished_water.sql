/*
  # Add generate_unique_user_identifier function

  1. Function
    - Generates a unique 8-digit identifier for users
    - Ensures no collisions with existing identifiers
    - Uses a retry mechanism if collision occurs

  2. Security
    - Function is SECURITY DEFINER to ensure proper access
    - Includes validation and error handling
*/

-- Function to generate a unique user identifier
CREATE OR REPLACE FUNCTION generate_unique_user_identifier()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_id text;
    done bool;
    attempts integer := 0;
    max_attempts integer := 10;
BEGIN
    done := false;
    WHILE NOT done AND attempts < max_attempts LOOP
        -- Generate a random 8-digit number
        new_id := lpad(floor(random() * 89999999 + 10000000)::text, 8, '0');
        
        -- Check if the identifier already exists
        done := NOT EXISTS (
            SELECT 1 
            FROM profiles 
            WHERE user_identifier = new_id
        );
        
        attempts := attempts + 1;
    END LOOP;
    
    IF NOT done THEN
        RAISE EXCEPTION 'Could not generate a unique identifier after % attempts', max_attempts;
    END IF;
    
    RETURN new_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_unique_user_identifier TO authenticated;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_identifier ON profiles(user_identifier);

-- Backfill missing identifiers
DO $$
DECLARE
    profile_record RECORD;
BEGIN
    FOR profile_record IN 
        SELECT id 
        FROM profiles 
        WHERE user_identifier IS NULL
    LOOP
        UPDATE profiles 
        SET user_identifier = generate_unique_user_identifier()
        WHERE id = profile_record.id;
    END LOOP;
END;
$$;