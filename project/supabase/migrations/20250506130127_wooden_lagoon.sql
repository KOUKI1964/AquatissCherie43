/*
  # Fix Admin Roles Synchronization
  
  1. Changes
    - Add function to synchronize roles between profiles and admin_users
    - Update admin_users table to match profile roles
    - Fix role assignment permissions
    
  2. Security
    - Ensure proper role hierarchy
    - Fix permission checks for role assignment
*/

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM admin_users_roles aur
    JOIN admin_roles ar ON ar.id = aur.role_id
    WHERE aur.user_id = auth.uid()
    AND ar.is_active = true
    AND ar.level = 100
  );
$$;

-- Function to synchronize profile role with admin roles
CREATE OR REPLACE FUNCTION sync_profile_with_admin_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- If user has 'admin' role in profiles but not in admin_users, add them
  IF NEW.role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE id = NEW.id
  ) THEN
    INSERT INTO admin_users (id, email, role)
    VALUES (NEW.id, NEW.email, 'admin');
    
    -- Find the admin role (level 80)
    DECLARE
      admin_role_id uuid;
    BEGIN
      SELECT id INTO admin_role_id
      FROM admin_roles
      WHERE level = 80
      LIMIT 1;
      
      IF admin_role_id IS NOT NULL THEN
        -- Assign admin role
        INSERT INTO admin_users_roles (user_id, role_id, assigned_by)
        VALUES (NEW.id, admin_role_id, auth.uid());
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile role synchronization
DROP TRIGGER IF EXISTS sync_profile_with_admin_roles_trigger ON profiles;
CREATE TRIGGER sync_profile_with_admin_roles_trigger
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION sync_profile_with_admin_roles();

-- Fix the assign_role_to_user function to properly check permissions
CREATE OR REPLACE FUNCTION assign_role_to_user(
  p_assigner_id uuid,
  p_user_id uuid,
  p_role_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assigner_level integer;
  role_level integer;
BEGIN
  -- Get the assigner's highest role level
  SELECT COALESCE(MAX(r.level), 0)
  INTO assigner_level
  FROM public.admin_users_roles ur
  JOIN public.admin_roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_assigner_id
  AND r.is_active = true;
  
  -- Get the target role's level
  SELECT level
  INTO role_level
  FROM public.admin_roles
  WHERE id = p_role_id;
  
  -- Assigner can only assign roles with lower level than their own
  IF assigner_level <= role_level THEN
    RAISE EXCEPTION 'You do not have permission to assign this role';
  END IF;
  
  -- Check if assignment already exists
  IF EXISTS (
    SELECT 1
    FROM public.admin_users_roles
    WHERE user_id = p_user_id
    AND role_id = p_role_id
  ) THEN
    RETURN false; -- Already assigned
  END IF;
  
  -- Ensure user exists in admin_users table
  IF NOT EXISTS (
    SELECT 1 FROM admin_users WHERE id = p_user_id
  ) THEN
    INSERT INTO admin_users (id, email, role)
    SELECT id, email, 'admin'
    FROM profiles
    WHERE id = p_user_id;
  END IF;
  
  -- Insert the new assignment
  INSERT INTO public.admin_users_roles (
    user_id,
    role_id,
    assigned_by
  ) VALUES (
    p_user_id,
    p_role_id,
    p_assigner_id
  );
  
  -- Log the action in admin audit log
  INSERT INTO public.admin_audit_log (
    admin_id,
    action,
    target_user_id,
    details
  ) VALUES (
    p_assigner_id,
    'assign_role',
    p_user_id,
    jsonb_build_object(
      'role_id', p_role_id,
      'timestamp', now()
    )
  );
  
  RETURN true;
END;
$$;

-- Fix the remove_role_from_user function to properly check permissions
CREATE OR REPLACE FUNCTION remove_role_from_user(
  p_remover_id uuid,
  p_user_id uuid,
  p_role_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  remover_level integer;
  role_level integer;
BEGIN
  -- Get the remover's highest role level
  SELECT COALESCE(MAX(r.level), 0)
  INTO remover_level
  FROM public.admin_users_roles ur
  JOIN public.admin_roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_remover_id
  AND r.is_active = true;
  
  -- Get the target role's level
  SELECT level
  INTO role_level
  FROM public.admin_roles
  WHERE id = p_role_id;
  
  -- Remover can only remove roles with lower level than their own
  IF remover_level <= role_level THEN
    RAISE EXCEPTION 'You do not have permission to remove this role';
  END IF;
  
  -- Check if assignment exists
  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_users_roles
    WHERE user_id = p_user_id
    AND role_id = p_role_id
  ) THEN
    RETURN false; -- Not assigned
  END IF;
  
  -- Remove the assignment
  DELETE FROM public.admin_users_roles
  WHERE user_id = p_user_id
  AND role_id = p_role_id;
  
  -- Log the action in admin audit log
  INSERT INTO public.admin_audit_log (
    admin_id,
    action,
    target_user_id,
    details
  ) VALUES (
    p_remover_id,
    'remove_role',
    p_user_id,
    jsonb_build_object(
      'role_id', p_role_id,
      'timestamp', now()
    )
  );
  
  RETURN true;
END;
$$;

-- Fix admin_users policies to prevent infinite recursion
DROP POLICY IF EXISTS "Admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Users can view own admin record" ON admin_users;
DROP POLICY IF EXISTS "Admins can add new admin users" ON admin_users;
DROP POLICY IF EXISTS "Strict admin management policy" ON admin_users;
DROP POLICY IF EXISTS "User self-view policy" ON admin_users;
DROP POLICY IF EXISTS "Strict admin insertion policy" ON admin_users;
DROP POLICY IF EXISTS "Allow inserts for authenticated users" ON admin_users;

-- Create new, optimized policies without recursion
CREATE POLICY "User self-view policy"
ON admin_users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR is_super_admin()
);

CREATE POLICY "Strict admin management policy"
ON admin_users
FOR ALL
TO authenticated
USING (
  is_super_admin() OR (auth.uid() = id)
)
WITH CHECK (
  is_super_admin()
);

CREATE POLICY "Strict admin insertion policy"
ON admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
);

CREATE POLICY "Allow inserts for authenticated users"
ON admin_users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION sync_profile_with_admin_roles TO authenticated;
GRANT EXECUTE ON FUNCTION assign_role_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION remove_role_from_user TO authenticated;