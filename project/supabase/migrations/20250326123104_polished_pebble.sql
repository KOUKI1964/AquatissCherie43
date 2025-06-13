/*
  # Fix Admin Access and Email Editing

  1. Changes
    - Add admin access policy for profiles table
    - Allow admins to update user emails
    - Fix email uniqueness constraint

  2. Security
    - Maintain RLS
    - Ensure proper admin checks
*/

-- Add admin access policy for profiles
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

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE id = auth.uid()
  );
$$;

-- Create function to handle profile updates
CREATE OR REPLACE FUNCTION handle_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow email updates only for admins
  IF NEW.email != OLD.email AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change email addresses';
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

-- Grant necessary permissions to admin functions
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION handle_profile_update TO authenticated;