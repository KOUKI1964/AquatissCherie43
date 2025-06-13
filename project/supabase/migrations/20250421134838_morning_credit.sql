/*
  # Admin Roles Management System

  1. New Tables
    - `admin_roles`
      - Defines available roles in the system
      - Includes permissions and hierarchy
    - `admin_users_roles`
      - Junction table linking admin_users to roles
      - Supports multiple roles per user

  2. Security
    - Enable RLS
    - Add policies for admin access
    - Ensure proper validation
*/

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  level integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_users_roles junction table
CREATE TABLE IF NOT EXISTS public.admin_users_roles (
  user_id uuid REFERENCES public.admin_users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (user_id, role_id)
);

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users_roles ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_roles_level ON public.admin_roles(level);
CREATE INDEX IF NOT EXISTS idx_admin_roles_is_active ON public.admin_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_roles_user_id ON public.admin_users_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_roles_role_id ON public.admin_users_roles(role_id);

-- Create policies for admin_roles
CREATE POLICY "Admins can manage roles"
  ON public.admin_roles
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  ));

-- Create policies for admin_users_roles
CREATE POLICY "Admins can manage user roles"
  ON public.admin_users_roles
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  ));

-- Insert default roles
INSERT INTO public.admin_roles (name, description, permissions, level)
VALUES 
  ('super_admin', 'Super Administrator with full access', '{"all": true}'::jsonb, 100),
  ('admin', 'Administrator with most access rights', '{"users": true, "products": true, "orders": true, "settings": true}'::jsonb, 80),
  ('manager', 'Manager with limited administrative access', '{"products": true, "orders": true}'::jsonb, 60),
  ('editor', 'Content editor with product management access', '{"products": true}'::jsonb, 40),
  ('viewer', 'Read-only access to the admin panel', '{"view": true}'::jsonb, 20)
ON CONFLICT (name) DO UPDATE
SET 
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  level = EXCLUDED.level,
  updated_at = now();

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION has_role(p_user_id uuid, p_role_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admin_users_roles ur
    JOIN public.admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = p_role_name
    AND r.is_active = true
  );
END;
$$;

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(p_user_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_perm boolean;
BEGIN
  -- Check if user has any role with the 'all' permission
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users_roles ur
    JOIN public.admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.is_active = true
    AND r.permissions ? 'all'
    AND (r.permissions->>'all')::boolean = true
  ) INTO has_perm;
  
  -- If not, check for the specific permission
  IF NOT has_perm THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.admin_users_roles ur
      JOIN public.admin_roles r ON ur.role_id = r.id
      WHERE ur.user_id = p_user_id
      AND r.is_active = true
      AND r.permissions ? p_permission
      AND (r.permissions->>p_permission)::boolean = true
    ) INTO has_perm;
  END IF;
  
  RETURN has_perm;
END;
$$;

-- Function to get all roles for a user
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id uuid)
RETURNS TABLE (
  role_id uuid,
  role_name text,
  role_level integer,
  permissions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.level,
    r.permissions
  FROM public.admin_users_roles ur
  JOIN public.admin_roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  AND r.is_active = true
  ORDER BY r.level DESC;
END;
$$;

-- Function to get the highest role level for a user
CREATE OR REPLACE FUNCTION get_user_role_level(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  max_level integer;
BEGIN
  SELECT COALESCE(MAX(r.level), 0)
  INTO max_level
  FROM public.admin_users_roles ur
  JOIN public.admin_roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  AND r.is_active = true;
  
  RETURN max_level;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.admin_roles TO authenticated;
GRANT ALL ON public.admin_users_roles TO authenticated;
GRANT EXECUTE ON FUNCTION has_role TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_level TO authenticated;