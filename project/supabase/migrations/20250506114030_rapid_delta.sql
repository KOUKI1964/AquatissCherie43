/*
  # Fix admin_users policies to prevent infinite recursion

  1. Changes
    - Remove recursive policy checks that were causing infinite loops
    - Restructure admin_users policies to use direct role checks
    - Add proper policy documentation
    
  2. Security
    - Maintain security by ensuring only admins can manage admin users
    - Allow users to view their own admin record
    - Prevent unauthorized access to admin data
*/

-- First, drop existing policies to recreate them
DROP POLICY IF EXISTS "Admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Users can view own admin record" ON admin_users;
DROP POLICY IF EXISTS "Admins can add new admin users" ON admin_users;

-- Create new, optimized policies without recursion
CREATE POLICY "Users can view own admin record"
ON admin_users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Admins can manage admin users"
ON admin_users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users_roles aur
    JOIN admin_roles ar ON ar.id = aur.role_id
    WHERE aur.user_id = auth.uid()
    AND ar.is_active = true
    AND ar.level >= 100  -- Assuming 100 is the admin level
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users_roles aur
    JOIN admin_roles ar ON ar.id = aur.role_id
    WHERE aur.user_id = auth.uid()
    AND ar.is_active = true
    AND ar.level >= 100  -- Assuming 100 is the admin level
  )
);

CREATE POLICY "Admins can add new admin users"
ON admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users_roles aur
    JOIN admin_roles ar ON ar.id = aur.role_id
    WHERE aur.user_id = auth.uid()
    AND ar.is_active = true
    AND ar.level >= 100  -- Assuming 100 is the admin level
  )
);