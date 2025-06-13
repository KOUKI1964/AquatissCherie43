/*
  # Update Profile Management Functions

  1. Changes
    - Update profile update handling
    - Add sync between auth.users and profiles
    - Fix policy conflicts by dropping existing policies first

  2. Security
    - Maintain proper access control
    - Ensure data consistency
*/

-- Drop existing policies first to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

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

-- Create new admin policy
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_profile_update TO authenticated;
GRANT EXECUTE ON FUNCTION sync_auth_user_changes TO authenticated;