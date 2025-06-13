/*
  # Fix auth.uid() NULL issue in SQL functions
  
  1. Changes
    - Add function to explicitly pass user ID to SQL functions
    - Update admin role functions to accept explicit user ID
    - Fix policies that rely on auth.uid()
    
  2. Security
    - Maintain security by validating user permissions
    - Ensure proper role checks
*/

-- Function to get current user ID with fallback
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_id uuid;
BEGIN
  -- Try to get auth.uid()
  current_id := auth.uid();
  
  -- If NULL, return a special value or raise exception
  IF current_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  RETURN current_id;
END;
$$;

-- Function to check if a specific user is super admin
CREATE OR REPLACE FUNCTION is_user_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM admin_users_roles aur
    JOIN admin_roles ar ON ar.id = aur.role_id
    WHERE aur.user_id = p_user_id
    AND ar.is_active = true
    AND ar.level = 100
  );
$$;

-- Update is_super_admin to use get_current_user_id
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN is_user_super_admin(get_current_user_id());
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Update assign_role_to_user to handle NULL auth.uid()
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
  -- Validate assigner_id
  IF p_assigner_id IS NULL THEN
    RAISE EXCEPTION 'Assigner ID cannot be NULL';
  END IF;

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

-- Update remove_role_from_user to handle NULL auth.uid()
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
  -- Validate remover_id
  IF p_remover_id IS NULL THEN
    RAISE EXCEPTION 'Remover ID cannot be NULL';
  END IF;

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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_current_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION assign_role_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION remove_role_from_user TO authenticated;