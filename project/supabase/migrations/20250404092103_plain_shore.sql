/*
  # System Settings Table Configuration

  1. Changes
    - Check if table exists before creating
    - Check if policies exist before creating
    - Add default settings for gift card system
    - Add timestamp update trigger

  2. Security
    - Enable RLS
    - Admin-only write access
    - Public read access for selected settings
*/

-- Create system settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Anyone can read public settings" ON public.system_settings;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create policies
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  ));

CREATE POLICY "Anyone can read public settings"
  ON public.system_settings
  FOR SELECT
  TO public
  USING (is_public = true);

-- Insert default settings
INSERT INTO public.system_settings (key, value, description, is_public)
VALUES 
  ('received_gift_card_amount', '1', 'Default amount for gift cards received from discount key usage', true),
  ('received_gift_card_expiry_days', '30', 'Number of days until received gift cards expire', true)
ON CONFLICT (key) DO UPDATE
SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  updated_at = now();

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS update_system_settings_timestamp ON public.system_settings;
DROP FUNCTION IF EXISTS update_system_settings_timestamp();

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_system_settings_timestamp
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_timestamp();