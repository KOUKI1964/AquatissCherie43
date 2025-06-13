/*
  # Add soft delete functionality for users
  
  1. Changes
    - Add is_active column to profiles table
    - Add deleted_at column to profiles table
    - Add audit log table for admin actions
    - Add trigger for logging admin actions
*/

-- Add columns for soft delete
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create index for active users
CREATE INDEX IF NOT EXISTS idx_profiles_is_active 
ON public.profiles(is_active);

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id),
  details jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for admin audit log
CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Function to handle user soft delete
CREATE OR REPLACE FUNCTION handle_user_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only administrators can deactivate users';
  END IF;

  -- Prevent admin from deactivating themselves
  IF NEW.id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot deactivate their own account';
  END IF;

  -- Check for active orders
  IF EXISTS (
    SELECT 1 FROM orders
    WHERE user_id = NEW.id
    AND status NOT IN ('completed', 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Cannot deactivate user with active orders';
  END IF;

  -- Set deletion timestamp
  NEW.deleted_at = CASE
    WHEN NEW.is_active = false AND OLD.is_active = true THEN now()
    ELSE NEW.deleted_at
  END;

  -- Pseudonymize email if account is deactivated
  IF NEW.is_active = false AND OLD.is_active = true THEN
    NEW.email = 'user_' || NEW.user_identifier || '@deleted.com';
  END IF;

  -- Cancel active discount keys
  UPDATE discount_keys
  SET is_active = false,
      used_at = now()
  WHERE created_by = NEW.id
  AND is_active = true;

  -- Log the action
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    target_user_id,
    details
  ) VALUES (
    auth.uid(),
    CASE
      WHEN NEW.is_active = false AND OLD.is_active = true THEN 'deactivate_user'
      WHEN NEW.is_active = true AND OLD.is_active = false THEN 'reactivate_user'
      ELSE 'update_user'
    END,
    NEW.id,
    jsonb_build_object(
      'old_status', OLD.is_active,
      'new_status', NEW.is_active,
      'timestamp', now()
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for soft delete
DROP TRIGGER IF EXISTS on_user_soft_delete ON public.profiles;
CREATE TRIGGER on_user_soft_delete
  BEFORE UPDATE OF is_active ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_soft_delete();

-- Update RLS policies for profiles
CREATE POLICY "Anyone can view active profiles"
  ON public.profiles
  FOR SELECT
  TO public
  USING (is_active = true);

-- Grant necessary permissions
GRANT ALL ON public.admin_audit_log TO authenticated;