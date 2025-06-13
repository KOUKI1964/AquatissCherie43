/*
  # Add system settings table for application configuration
  
  1. New Table
    - `system_settings`
      - Stores key-value pairs for application settings
      - Used for configurable parameters like gift card amounts
      
  2. Security
    - Enable RLS
    - Admin-only access for management
    - Public read access for certain settings
*/

-- Create system settings table
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