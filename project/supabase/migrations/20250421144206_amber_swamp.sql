/*
  # Admin Roles Functions and Policies

  1. New Functions
    - `check_user_role_access`: Checks if a user has access to manage a specific role
    - `assign_role_to_user`: Assigns a role to a user with proper validation
    - `remove_role_from_user`: Removes a role from a user with proper validation
    - `get_user_permissions`: Gets all permissions for a user

  2. Security
    - Proper validation of role assignments
    - Prevention of privilege escalation
    - Audit logging for role changes
*/

-- Function to check if a user has access to manage a specific role
CREATE OR REPLACE FUNCTION check_user_role_access(p_user_id uuid, p_role_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_level integer;
  role_level integer;
BEGIN
  -- Get the user's highest role level
  SELECT COALESCE(MAX(r.level), 0)
  INTO user_level
  FROM public.admin_users_roles ur
  JOIN public.admin_roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  AND r.is_active = true;
  
  -- Get the target role's level
  SELECT level
  INTO role_level
  FROM public.admin_roles
  WHERE id = p_role_id;
  
  -- User can only manage roles with lower level than their own
  RETURN user_level > role_level;
END;
$$;

-- Function to assign a role to a user with proper validation
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
  can_assign boolean;
BEGIN
  -- Check if assigner has access to this role
  SELECT check_user_role_access(p_assigner_id, p_role_id)
  INTO can_assign;
  
  IF NOT can_assign THEN
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

-- Function to remove a role from a user with proper validation
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
  can_remove boolean;
BEGIN
  -- Check if remover has access to this role
  SELECT check_user_role_access(p_remover_id, p_role_id)
  INTO can_remove;
  
  IF NOT can_remove THEN
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

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  all_permissions jsonb := '{}'::jsonb;
  role_record record;
BEGIN
  -- Check if user is in admin_users table
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = p_user_id
  ) THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Combine permissions from all roles
  FOR role_record IN
    SELECT r.permissions
    FROM public.admin_users_roles ur
    JOIN public.admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.is_active = true
  LOOP
    all_permissions := all_permissions || role_record.permissions;
  END LOOP;
  
  RETURN all_permissions;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_user_role_access TO authenticated;
GRANT EXECUTE ON FUNCTION assign_role_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION remove_role_from_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;