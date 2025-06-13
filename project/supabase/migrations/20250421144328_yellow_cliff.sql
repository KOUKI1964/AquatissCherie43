/*
  # Admin Roles Views and Helper Functions

  1. New Views
    - `admin_users_with_roles`: Shows all admin users with their assigned roles
    - `user_permissions_view`: Shows all permissions for each user

  2. Helper Functions
    - `get_role_assignments`: Gets all role assignments for a specific user
    - `get_admin_users_with_roles`: Gets all admin users with their roles
*/

-- View to show all admin users with their roles
CREATE OR REPLACE VIEW admin_users_with_roles AS
SELECT 
  au.id,
  au.email,
  au.role,
  au.created_at,
  au.last_login,
  jsonb_agg(
    jsonb_build_object(
      'role_id', ar.id,
      'role_name', ar.name,
      'role_level', ar.level,
      'permissions', ar.permissions,
      'assigned_at', aur.assigned_at,
      'assigned_by', aur.assigned_by
    )
  ) FILTER (WHERE ar.id IS NOT NULL) AS roles
FROM 
  public.admin_users au
LEFT JOIN 
  public.admin_users_roles aur ON au.id = aur.user_id
LEFT JOIN 
  public.admin_roles ar ON aur.role_id = ar.id AND ar.is_active = true
GROUP BY 
  au.id, au.email, au.role, au.created_at, au.last_login;

-- View to show all permissions for each user
CREATE OR REPLACE VIEW user_permissions_view AS
WITH role_permissions AS (
  SELECT 
    ur.user_id,
    r.id AS role_id,
    r.name AS role_name,
    r.level AS role_level,
    r.permissions
  FROM 
    public.admin_users_roles ur
  JOIN 
    public.admin_roles r ON ur.role_id = r.id
  WHERE 
    r.is_active = true
)
SELECT 
  u.id AS user_id,
  u.email,
  jsonb_agg(
    jsonb_build_object(
      'role_id', rp.role_id,
      'role_name', rp.role_name,
      'role_level', rp.role_level,
      'permissions', rp.permissions
    )
  ) FILTER (WHERE rp.role_id IS NOT NULL) AS roles,
  jsonb_object_agg(
    k, 
    CASE 
      WHEN v::text = 'true' THEN true 
      ELSE false 
    END
  ) FILTER (WHERE k IS NOT NULL) AS permissions
FROM 
  public.admin_users u
LEFT JOIN 
  role_permissions rp ON u.id = rp.user_id
LEFT JOIN LATERAL (
  SELECT 
    key AS k, 
    value AS v
  FROM 
    jsonb_each_text(rp.permissions)
  WHERE 
    value::text = 'true'
) permissions ON true
GROUP BY 
  u.id, u.email;

-- Function to get all role assignments for a specific user
CREATE OR REPLACE FUNCTION get_role_assignments(p_user_id uuid)
RETURNS TABLE (
  role_id uuid,
  role_name text,
  role_level integer,
  permissions jsonb,
  assigned_at timestamptz,
  assigned_by uuid,
  assigned_by_email text
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
    r.permissions,
    ur.assigned_at,
    ur.assigned_by,
    (SELECT email FROM auth.users WHERE id = ur.assigned_by)
  FROM 
    public.admin_users_roles ur
  JOIN 
    public.admin_roles r ON ur.role_id = r.id
  WHERE 
    ur.user_id = p_user_id
  AND 
    r.is_active = true
  ORDER BY 
    r.level DESC;
END;
$$;

-- Function to get all admin users with their roles
CREATE OR REPLACE FUNCTION get_admin_users_with_roles()
RETURNS TABLE (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  last_login timestamptz,
  roles jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.role,
    au.created_at,
    au.last_login,
    jsonb_agg(
      jsonb_build_object(
        'role_id', ar.id,
        'role_name', ar.name,
        'role_level', ar.level,
        'permissions', ar.permissions,
        'assigned_at', aur.assigned_at,
        'assigned_by', aur.assigned_by
      )
    ) FILTER (WHERE ar.id IS NOT NULL) AS roles
  FROM 
    public.admin_users au
  LEFT JOIN 
    public.admin_users_roles aur ON au.id = aur.user_id
  LEFT JOIN 
    public.admin_roles ar ON aur.role_id = ar.id AND ar.is_active = true
  GROUP BY 
    au.id, au.email, au.role, au.created_at, au.last_login;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON admin_users_with_roles TO authenticated;
GRANT SELECT ON user_permissions_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_role_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users_with_roles TO authenticated;