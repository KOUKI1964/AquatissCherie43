/*
  # Fix Admin Users RLS Policies

  1. Changes
    - Remove recursive policies from admin_users table
    - Simplify admin check logic
    - Add direct policy for admin status checks
    - Fix policies for related tables that depend on admin_users

  2. Security
    - Maintain secure access control
    - Prevent infinite recursion
    - Keep admin privileges intact
*/

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Allow delete for super_admins only" ON admin_users;
DROP POLICY IF EXISTS "Allow updates for super_admins or self" ON admin_users;
DROP POLICY IF EXISTS "Public can check admin status" ON admin_users;
DROP POLICY IF EXISTS "Strict admin insertion policy" ON admin_users;
DROP POLICY IF EXISTS "Strict admin management policy" ON admin_users;
DROP POLICY IF EXISTS "Super admin can manage other admins" ON admin_users;
DROP POLICY IF EXISTS "User self-view policy" ON admin_users;
DROP POLICY IF EXISTS "Users can view own admin record" ON admin_users;

-- Create new, simplified policies for admin_users
CREATE POLICY "Enable read access for all users"
  ON admin_users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admins to insert"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      JOIN admin_users_roles aur ON ar.id = aur.role_id
      WHERE aur.user_id = auth.uid() AND ar.level >= 100
    )
  );

CREATE POLICY "Allow admins to update"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      JOIN admin_users_roles aur ON ar.id = aur.role_id
      WHERE aur.user_id = auth.uid() AND ar.level >= 100
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      JOIN admin_users_roles aur ON ar.id = aur.role_id
      WHERE aur.user_id = auth.uid() AND ar.level >= 100
    )
  );

CREATE POLICY "Allow admins to delete"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      JOIN admin_users_roles aur ON ar.id = aur.role_id
      WHERE aur.user_id = auth.uid() AND ar.level >= 100
    )
  );

-- Update policies for related tables that check for admin status
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update products table policies
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Update site_banners table policies
DROP POLICY IF EXISTS "Admins can manage banners" ON site_banners;
CREATE POLICY "Admins can manage banners"
  ON site_banners
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Update profiles table policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));