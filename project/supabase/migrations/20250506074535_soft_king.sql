/*
  # Fix Admin Users RLS Policy
  
  1. Changes
    - Update the RLS policy for admin_users table
    - Allow admins to insert new admin users
    - Maintain security while enabling proper functionality
    
  2. Security
    - Ensure only admins can manage admin users
    - Preserve existing access control
*/

-- Drop the existing policy that's too restrictive
DROP POLICY IF EXISTS "Admin can access admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "allow read to admins" ON public.admin_users;

-- Create a more permissive policy for admins
CREATE POLICY "Admins can manage admin users"
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create a policy specifically for inserting new admin users
CREATE POLICY "Admins can add new admin users"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create a policy for users to view their own admin record
CREATE POLICY "Users can view own admin record"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());