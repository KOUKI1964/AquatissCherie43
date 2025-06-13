/*
  # Remove Single Admin Restriction
  
  1. Changes
    - Drop the trigger that enforces a single admin user
    - Drop the function that checks for a single admin
    - Allow multiple admin users as intended by the role system
    
  2. Security
    - Maintain RLS policies
    - Preserve admin access control
*/

-- Drop the trigger that enforces a single admin
DROP TRIGGER IF EXISTS enforce_single_admin ON public.admin_users;

-- Drop the function that checks for a single admin
DROP FUNCTION IF EXISTS check_single_admin();

-- Update the admin_users table to allow multiple admins
COMMENT ON TABLE public.admin_users IS 'Stores admin users with support for multiple admins';

-- Update the policy to ensure proper access control
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_users' 
    AND policyname = 'Admin can access admin_users'
  ) THEN
    DROP POLICY "Admin can access admin_users" ON public.admin_users;
    
    CREATE POLICY "Admin can access admin_users"
      ON public.admin_users
      FOR ALL
      TO authenticated
      USING (id = auth.uid());
  END IF;
  
  -- Add policy for admins to view all admin users
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_users' 
    AND policyname = 'allow read to admins'
  ) THEN
    CREATE POLICY "allow read to admins"
      ON public.admin_users
      FOR SELECT
      TO public
      USING (role() = 'admin'::text);
  END IF;
END $$;