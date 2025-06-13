/*
  # Fix import_logs relationship with suppliers table
  
  1. Changes
    - Drop existing import_logs table if it exists
    - Create a new import_logs table with proper foreign key relationship
    - Add explicit constraint naming for better schema introspection
    - Enable RLS with proper policies
    
  2. Security
    - Maintain admin-only access
    - Ensure proper data integrity with constraints
*/

-- Drop the existing table if it exists
DROP TABLE IF EXISTS public.import_logs;

-- Create import_logs table with proper relationship
CREATE TABLE IF NOT EXISTS public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'error', 'partial')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  products_total integer DEFAULT 0,
  products_created integer DEFAULT 0,
  products_updated integer DEFAULT 0,
  products_failed integer DEFAULT 0,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id)
);

-- Add foreign key constraint explicitly with a name
ALTER TABLE public.import_logs
ADD CONSTRAINT import_logs_supplier_id_fkey
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage import logs"
  ON public.import_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_import_logs_supplier_id ON public.import_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON public.import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_started_at ON public.import_logs(started_at);

-- Grant necessary permissions
GRANT ALL ON public.import_logs TO authenticated;