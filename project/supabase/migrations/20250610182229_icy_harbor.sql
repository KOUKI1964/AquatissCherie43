/*
  # Fix Import Logs Relationship with Suppliers
  
  1. Changes
    - Drop and recreate the import_logs table with proper foreign key relationship
    - Ensure the supplier_id column references suppliers.id correctly
    - Add proper constraints and indexes
    
  2. Security
    - Maintain RLS policies
    - Keep admin-only access
*/

-- First, check if the table exists and drop it if needed
DROP TABLE IF EXISTS public.import_logs;

-- Create import_logs table with proper relationship
CREATE TABLE public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
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
CREATE INDEX idx_import_logs_supplier_id ON public.import_logs(supplier_id);
CREATE INDEX idx_import_logs_status ON public.import_logs(status);
CREATE INDEX idx_import_logs_started_at ON public.import_logs(started_at);

-- Grant necessary permissions
GRANT ALL ON public.import_logs TO authenticated;